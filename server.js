const express = require('express');
const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');
const { nanoid } = require('nanoid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const CHUNK_SIZE = 64 * 1024; // 64 KB chunks for streaming
const SESSION_EXPIRY_MS = 60 * 60 * 1000; // 1 hour in milliseconds
const sessions = new Map();

app.use(express.json({ limit: '500mb' })); // Increased limit for metadata
app.use(express.static(path.join(__dirname, 'public')));

function buildShareUrl(req, id) {
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}/share/${id}`;
}

function buildWsUrl(req, id) {
  const isHttps = req.protocol === 'https';
  const protocol = isHttps ? 'wss' : 'ws';
  const host = req.get('host');
  return `${protocol}://${host}/ws?sessionId=${id}`;
}

function createSession(type, payload, expiresInMinutes = null) {
  const id = nanoid(10);
  const expiryMs = expiresInMinutes 
    ? Math.min(expiresInMinutes * 60 * 1000, 7 * 24 * 60 * 60 * 1000) // Max 7 days
    : SESSION_EXPIRY_MS;
  
  const session = {
    id,
    type,
    createdAt: Date.now(),
    expiresAt: Date.now() + expiryMs,
    payload,
  };
  sessions.set(id, session);
  return session;
}

// Cleanup expired sessions periodically
function cleanupExpiredSessions() {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [id, session] of sessions.entries()) {
    if (session.expiresAt && now > session.expiresAt) {
      sessions.delete(id);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    // eslint-disable-next-line no-console
    console.log(`Cleaned up ${cleanedCount} expired session(s)`);
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredSessions, 5 * 60 * 1000);

app.post('/api/session/file', (req, res) => {
  const { files, expiresInMinutes } = req.body || {};

  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'Invalid request payload. Expected files array.' });
  }

  // Validate expiry time
  let expiryMinutes = null;
  if (expiresInMinutes !== undefined && expiresInMinutes !== null) {
    const parsed = parseInt(expiresInMinutes, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 10080) {
      return res.status(400).json({ error: 'Invalid expiry time. Must be between 1 and 10080 minutes (7 days).' });
    }
    expiryMinutes = parsed;
  }

  try {
    const processedFiles = [];

    for (const fileData of files) {
      const { name, mimeType, dataBase64, size } = fileData || {};

      if (!name || !mimeType || !dataBase64 || typeof size !== 'number') {
        return res.status(400).json({ error: 'Invalid file data in payload.' });
      }

      const buffer = Buffer.from(dataBase64, 'base64');
      if (buffer.length !== size) {
        return res.status(400).json({ error: `File size mismatch for "${name}".` });
      }

      processedFiles.push({
        name,
        mimeType,
        size,
        data: buffer,
      });
    }

    const session = createSession('file', {
      files: processedFiles,
    }, expiryMinutes);

    const expiresInSeconds = expiryMinutes ? expiryMinutes * 60 : 3600;

    return res.json({
      id: session.id,
      type: session.type,
      shareUrl: buildShareUrl(req, session.id),
      wsUrl: buildWsUrl(req, session.id),
      expiresInSeconds,
    });
  } catch (err) {
    return res.status(400).json({ error: 'Failed to process uploaded files.' });
  }
});

app.post('/api/session/text', (req, res) => {
  const { text, expiresInMinutes } = req.body || {};

  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Text content is required.' });
  }

  // Validate expiry time
  let expiryMinutes = null;
  if (expiresInMinutes !== undefined && expiresInMinutes !== null) {
    const parsed = parseInt(expiresInMinutes, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 10080) {
      return res.status(400).json({ error: 'Invalid expiry time. Must be between 1 and 10080 minutes (7 days).' });
    }
    expiryMinutes = parsed;
  }

  const session = createSession('text', {
    text,
    length: text.length,
  }, expiryMinutes);

  const expiresInSeconds = expiryMinutes ? expiryMinutes * 60 : 3600;

  return res.json({
    id: session.id,
    type: session.type,
    shareUrl: buildShareUrl(req, session.id),
    wsUrl: buildWsUrl(req, session.id),
    expiresInSeconds,
  });
});

app.get('/api/session/:id', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found.' });
  }

  // Check if session has expired
  if (session.expiresAt && Date.now() > session.expiresAt) {
    sessions.delete(req.params.id);
    return res.status(404).json({ error: 'Session has expired.' });
  }

  if (session.type === 'file') {
    if (session.payload.files && Array.isArray(session.payload.files)) {
      // Multiple files
      return res.json({
        id: session.id,
        type: session.type,
        files: session.payload.files.map((f) => ({
          name: f.name,
          mimeType: f.mimeType,
          size: f.size,
        })),
        createdAt: session.createdAt,
      });
    } else {
      // Legacy single file format (backward compatibility)
      return res.json({
        id: session.id,
        type: session.type,
        file: {
          name: session.payload.name,
          mimeType: session.payload.mimeType,
          size: session.payload.size,
        },
        createdAt: session.createdAt,
      });
    }
  }

  if (session.type === 'text') {
    return res.json({
      id: session.id,
      type: session.type,
      text: session.payload.text,
      createdAt: session.createdAt,
    });
  }

  return res.status(500).json({ error: 'Unsupported session type.' });
});

app.get('/share/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'share.html'));
});

wss.on('connection', (socket, req) => {
  const { url } = req;
  const requestUrl = new URL(url, `http://${req.headers.host}`);
  const sessionId = requestUrl.searchParams.get('sessionId');

  if (!sessionId) {
    socket.send(JSON.stringify({ event: 'error', message: 'Missing sessionId.' }));
    return socket.close();
  }

  const session = sessions.get(sessionId);
  if (!session) {
    socket.send(JSON.stringify({ event: 'error', message: 'Session not found.' }));
    return socket.close();
  }

  // Check if session has expired
  if (session.expiresAt && Date.now() > session.expiresAt) {
    sessions.delete(sessionId);
    socket.send(JSON.stringify({ event: 'error', message: 'Session has expired.' }));
    return socket.close();
  }

  const basePayload = {
    event: 'session',
    sessionId,
    sessionType: session.type,
    createdAt: session.createdAt,
  };

  if (session.type === 'file') {
    if (session.payload.files && Array.isArray(session.payload.files)) {
      // Multiple files - send metadata first, then stream data
      socket.send(
        JSON.stringify({
          ...basePayload,
          files: session.payload.files.map((f) => ({
            name: f.name,
            mimeType: f.mimeType,
            size: f.size,
          })),
        })
      );

      // Stream file data in chunks
      session.payload.files.forEach((file, fileIndex) => {
        const totalChunks = Math.ceil(file.data.length / CHUNK_SIZE);
        
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
          const start = chunkIndex * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.data.length);
          const chunk = file.data.slice(start, end);
          
          socket.send(
            JSON.stringify({
              event: 'fileChunk',
              fileIndex,
              chunkIndex,
              totalChunks,
              dataBase64: chunk.toString('base64'),
            })
          );
        }
      });

      // Send completion signal
      socket.send(
        JSON.stringify({
          event: 'fileComplete',
          fileCount: session.payload.files.length,
        })
      );
    } else {
      // Legacy single file format (backward compatibility)
      const file = session.payload;
      socket.send(
        JSON.stringify({
          ...basePayload,
          file: {
            name: file.name,
            mimeType: file.mimeType,
            size: file.size,
            dataBase64: file.data.toString('base64'),
          },
        })
      );
    }
  } else if (session.type === 'text') {
    socket.send(
      JSON.stringify({
        ...basePayload,
        text: session.payload.text,
        length: session.payload.length,
      })
    );
  } else {
    socket.send(JSON.stringify({ event: 'error', message: 'Unsupported session type.' }));
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`SyncBetween server listening on port ${PORT}`);
});

