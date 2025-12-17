const express = require('express');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const { nanoid } = require('nanoid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const CHUNK_SIZE = 64 * 1024; // 64 KB chunks for streaming
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB per file
const SESSION_EXPIRY_MS = 60 * 60 * 1000; // 1 hour in milliseconds
const sessions = new Map();
const MAX_PASSPHRASE_ATTEMPTS = 5;

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

function hashPassphrase(passphrase) {
  if (!passphrase) return null;
  return crypto.createHash('sha256').update(passphrase).digest('hex');
}

function verifyPassphrase(passphrase, hash) {
  if (!hash) return true; // No passphrase required
  if (!passphrase) return false;
  return hashPassphrase(passphrase) === hash;
}

function normalizeBoolean(value) {
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1' || value === 'on';
  }
  return Boolean(value);
}

function createSession(type, payload, expiresInMinutes = null, options = {}) {
  const { passphraseHash = null, openOnce = false } = options || {};
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
    passphraseHash,
    openOnce: normalizeBoolean(openOnce),
    passphraseAttempts: 0,
    opened: false,
    hosts: new Set(), // for reverse sessions
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
  const { files, expiresInMinutes, passphrase, openOnce } = req.body || {};

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

  // Process passphrase
  const passphraseHash = passphrase && typeof passphrase === 'string' && passphrase.trim()
    ? hashPassphrase(passphrase.trim())
    : null;

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

    const session = createSession(
      'file',
      { files: processedFiles },
      expiryMinutes,
      { passphraseHash, openOnce }
    );

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
  const { text, expiresInMinutes, passphrase, openOnce } = req.body || {};

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

  // Process passphrase
  const passphraseHash = passphrase && typeof passphrase === 'string' && passphrase.trim()
    ? hashPassphrase(passphrase.trim())
    : null;

  const session = createSession(
    'text',
    { text, length: text.length },
    expiryMinutes,
    { passphraseHash, openOnce }
  );

  const expiresInSeconds = expiryMinutes ? expiryMinutes * 60 : 3600;

  return res.json({
    id: session.id,
    type: session.type,
    shareUrl: buildShareUrl(req, session.id),
    wsUrl: buildWsUrl(req, session.id),
    expiresInSeconds,
  });
});

app.post('/api/session/reverse', (req, res) => {
  const { expiresInMinutes, passphrase, openOnce, maxClients } = req.body || {};

  // Validate expiry time
  let expiryMinutes = null;
  if (expiresInMinutes !== undefined && expiresInMinutes !== null) {
    const parsed = parseInt(expiresInMinutes, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 10080) {
      return res.status(400).json({ error: 'Invalid expiry time. Must be between 1 and 10080 minutes (7 days).' });
    }
    expiryMinutes = parsed;
  }

  let maxConnections = parseInt(maxClients, 10);
  if (isNaN(maxConnections) || maxConnections < 1 || maxConnections > 50) {
    maxConnections = 5; // default
  }

  // Process passphrase
  const passphraseHash = passphrase && typeof passphrase === 'string' && passphrase.trim()
    ? hashPassphrase(passphrase.trim())
    : null;

  const session = createSession(
    'reverse',
    {
      uploads: [],
      maxConnections,
    },
    expiryMinutes,
    { passphraseHash, openOnce }
  );

  const expiresInSeconds = expiryMinutes ? expiryMinutes * 60 : 3600;

  return res.json({
    id: session.id,
    type: session.type,
    shareUrl: `${req.protocol}://${req.get('host')}/upload/${session.id}`,
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

  // Return whether passphrase is required (but not the hash itself)
  const requiresPassphrase = !!session.passphraseHash;

  if (session.type === 'file') {
    if (session.payload.files && Array.isArray(session.payload.files)) {
      // Multiple files
      return res.json({
        id: session.id,
        type: session.type,
        requiresPassphrase,
        openOnce: session.openOnce,
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
        requiresPassphrase,
        openOnce: session.openOnce,
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
      requiresPassphrase,
      openOnce: session.openOnce,
      createdAt: session.createdAt,
    });
  }

  if (session.type === 'reverse') {
    return res.json({
      id: session.id,
      type: session.type,
      requiresPassphrase,
      openOnce: session.openOnce,
      maxConnections: session.payload.maxConnections,
      uploads: session.payload.uploads.map((u) => ({
        id: u.id,
        name: u.name,
        type: u.type,
        file: u.file
          ? { name: u.file.name, mimeType: u.file.mimeType, size: u.file.size }
          : null,
        text: u.text ? u.text.slice(0, 200) : null,
        createdAt: u.createdAt,
      })),
      createdAt: session.createdAt,
    });
  }

  return res.status(500).json({ error: 'Unsupported session type.' });
});

app.get('/share/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'share.html'));
});

app.get('/upload/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'reverse.html'));
});

// Fetch uploads for reverse sessions
app.get('/api/session/:id/uploads', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session || session.type !== 'reverse') {
    return res.status(404).json({ error: 'Session not found.' });
  }

  if (session.expiresAt && Date.now() > session.expiresAt) {
    sessions.delete(req.params.id);
    return res.status(404).json({ error: 'Session has expired.' });
  }

  return res.json({
    uploads: session.payload.uploads.map((u) => ({
      id: u.id,
      name: u.name,
      type: u.type,
      text: u.text || null,
      file: u.file
        ? { name: u.file.name, mimeType: u.file.mimeType, size: u.file.size, dataBase64: u.data.toString('base64') }
        : null,
      createdAt: u.createdAt,
    })),
  });
});

wss.on('connection', (socket, req) => {
  const { url } = req;
  const requestUrl = new URL(url, `http://${req.headers.host}`);
  const sessionId = requestUrl.searchParams.get('sessionId');
  const providedPassphrase = requestUrl.searchParams.get('passphrase');
  const role = requestUrl.searchParams.get('role') || 'client';

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

  // Verify passphrase if required
  if (session.passphraseHash) {
    if (!providedPassphrase) {
      socket.send(JSON.stringify({ event: 'passphraseRequired', message: 'Passphrase is required to access this content.' }));
      return socket.close();
    }

    if (!verifyPassphrase(providedPassphrase, session.passphraseHash)) {
      session.passphraseAttempts += 1;
      if (session.passphraseAttempts >= MAX_PASSPHRASE_ATTEMPTS) {
        sessions.delete(sessionId);
        socket.send(JSON.stringify({ event: 'passphraseLocked', message: 'Too many incorrect passphrase attempts.' }));
      } else {
        socket.send(JSON.stringify({ event: 'passphraseRequired', message: 'Incorrect passphrase.' }));
      }
      return socket.close();
    }
  }

  if (session.openOnce) {
    if (session.opened) {
      socket.send(JSON.stringify({ event: 'sessionUsed', message: 'This session has already been accessed.' }));
      return socket.close();
    }
    session.opened = true;
  }

  const basePayload = {
    event: 'session',
    sessionId,
    sessionType: session.type,
    createdAt: session.createdAt,
  };

  const cleanupSession = () => {
    if (session.type === 'reverse') {
      if (session.hosts) {
        session.hosts.delete(socket);
      }
    }
    if (session.openOnce) {
      sessions.delete(sessionId);
    }
  };

  socket.on('close', cleanupSession);

  if (session.type === 'reverse') {
    if (role === 'host') {
      if (!session.hosts) {
        session.hosts = new Set();
      }
      session.hosts.add(socket);
      // Send existing uploads metadata to host
      socket.send(JSON.stringify({
        event: 'uploads',
        uploads: session.payload.uploads.map((u) => ({
          id: u.id,
          name: u.name,
          type: u.type,
          file: u.file ? { name: u.file.name, mimeType: u.file.mimeType, size: u.file.size } : null,
          text: u.text ? u.text.slice(0, 200) : null,
          createdAt: u.createdAt,
        })),
      }));
      return;
    }

    // Client upload path
    if (session.payload.uploads.length >= session.payload.maxConnections) {
      socket.send(JSON.stringify({ event: 'sessionUsed', message: 'Maximum uploads reached for this session.' }));
      return socket.close();
    }

    socket.on('message', (msg) => {
      try {
        const data = JSON.parse(msg.toString());
        if (data.event === 'uploadText') {
          if (session.payload.uploads.length >= session.payload.maxConnections) {
            socket.send(JSON.stringify({ event: 'sessionUsed', message: 'Maximum uploads reached for this session.' }));
            return socket.close();
          }
          const text = typeof data.text === 'string' ? data.text : '';
          const name = typeof data.name === 'string' ? data.name.slice(0, 80) : '';
          const upload = {
            id: nanoid(8),
            type: 'text',
            text,
            name,
            createdAt: Date.now(),
          };
          session.payload.uploads.push(upload);
          // Notify hosts
          if (session.hosts) {
            const payload = {
              event: 'incomingUpload',
              upload: {
                ...upload,
              },
            };
            session.hosts.forEach((hostSocket) => {
              hostSocket.send(JSON.stringify(payload));
            });
          }
          socket.send(JSON.stringify({ event: 'uploadReceived' }));
          socket.close();
        } else if (data.event === 'uploadFile') {
          if (session.payload.uploads.length >= session.payload.maxConnections) {
            socket.send(JSON.stringify({ event: 'sessionUsed', message: 'Maximum uploads reached for this session.' }));
            return socket.close();
          }
          const { name, mimeType, dataBase64, size } = data.file || {};
          if (!name || !mimeType || !dataBase64 || typeof size !== 'number') {
            socket.send(JSON.stringify({ event: 'error', message: 'Invalid file payload.' }));
            return socket.close();
          }
          const buffer = Buffer.from(dataBase64, 'base64');
          if (buffer.length > MAX_FILE_SIZE_BYTES) {
            socket.send(JSON.stringify({ event: 'error', message: 'File exceeds maximum allowed size of 50 MB.' }));
            return socket.close();
          }
          if (buffer.length !== size) {
            socket.send(JSON.stringify({ event: 'error', message: 'File size mismatch.' }));
            return socket.close();
          }
          const uploaderName = typeof data.name === 'string' ? data.name.slice(0, 80) : '';
          const upload = {
            id: nanoid(8),
            type: 'file',
            file: { name, mimeType, size },
            data: buffer,
            name: uploaderName,
            createdAt: Date.now(),
          };
          session.payload.uploads.push(upload);
          // Notify hosts with file data
          if (session.hosts) {
            const payload = {
              event: 'incomingUpload',
              upload: {
                id: upload.id,
                type: 'file',
                file: upload.file,
                name: upload.name,
                createdAt: upload.createdAt,
                dataBase64: buffer.toString('base64'),
              },
            };
            session.hosts.forEach((hostSocket) => {
              hostSocket.send(JSON.stringify(payload));
            });
          }
          socket.send(JSON.stringify({ event: 'uploadReceived' }));
          socket.close();
        }
      } catch (err) {
        socket.send(JSON.stringify({ event: 'error', message: 'Invalid message.' }));
        socket.close();
      }
    });

    return;
  }

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

