const express = require('express');
const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');
const { nanoid } = require('nanoid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const sessions = new Map();

app.use(express.json({ limit: '60mb' }));
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

function createSession(type, payload) {
  const id = nanoid(10);
  const session = {
    id,
    type,
    createdAt: Date.now(),
    payload,
  };
  sessions.set(id, session);
  return session;
}

app.post('/api/session/file', (req, res) => {
  const { name, mimeType, dataBase64, size } = req.body || {};

  if (!name || !mimeType || !dataBase64 || typeof size !== 'number') {
    return res.status(400).json({ error: 'Invalid request payload.' });
  }

  if (size > MAX_FILE_SIZE_BYTES) {
    return res.status(413).json({ error: 'File exceeds maximum allowed size of 50 MB.' });
  }

  try {
    const buffer = Buffer.from(dataBase64, 'base64');
    if (buffer.length !== size) {
      return res.status(400).json({ error: 'File size mismatch.' });
    }

    const session = createSession('file', {
      name,
      mimeType,
      size,
      data: buffer,
    });

    return res.json({
      id: session.id,
      type: session.type,
      shareUrl: buildShareUrl(req, session.id),
      wsUrl: buildWsUrl(req, session.id),
      expiresInSeconds: 3600,
    });
  } catch (err) {
    return res.status(400).json({ error: 'Failed to process uploaded file.' });
  }
});

app.post('/api/session/text', (req, res) => {
  const { text } = req.body || {};
  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Text content is required.' });
  }

  const session = createSession('text', {
    text,
    length: text.length,
  });

  return res.json({
    id: session.id,
    type: session.type,
    shareUrl: buildShareUrl(req, session.id),
    wsUrl: buildWsUrl(req, session.id),
    expiresInSeconds: 3600,
  });
});

app.get('/api/session/:id', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found.' });
  }

  if (session.type === 'file') {
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

  const basePayload = {
    event: 'session',
    sessionId,
    sessionType: session.type,
    createdAt: session.createdAt,
  };

  if (session.type === 'file') {
    socket.send(
      JSON.stringify({
        ...basePayload,
        file: {
          name: session.payload.name,
          mimeType: session.payload.mimeType,
          size: session.payload.size,
          dataBase64: session.payload.data.toString('base64'),
        },
      })
    );
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

