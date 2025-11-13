document.addEventListener('DOMContentLoaded', initSharePage);

async function initSharePage() {
  const sessionId = getSessionIdFromPath();
  const statusElement = document.getElementById('session-status');
  const detailsElement = document.getElementById('session-details');
  const errorElement = document.getElementById('error-message');
  const textView = document.getElementById('text-view');
  const copyButton = document.getElementById('copy-button');
  const sharedTextElement = document.getElementById('shared-text');
  const fileView = document.getElementById('file-view');
  const fileNameElement = document.getElementById('file-name');
  const fileSizeElement = document.getElementById('file-size');
  const downloadButton = document.getElementById('download-button');
  const imagePreview = document.getElementById('image-preview');
  const imageElement = document.getElementById('image-element');
  const videoPreview = document.getElementById('video-preview');
  const videoElement = document.getElementById('video-element');

  if (!sessionId) {
    showError('Invalid share link. Please check the URL.', statusElement, errorElement);
    return;
  }

  let objectUrl = null;
  let latestText = '';

  try {
    statusElement.textContent = 'Preparing your content...';
    const metaResponse = await fetch(`/api/session/${sessionId}`);

    if (!metaResponse.ok) {
      throw new Error(metaResponse.status === 404 ? 'This share link is no longer available.' : 'Unable to load shared content.');
    }

    const metadata = await metaResponse.json();
    detailsElement.hidden = false;

    if (metadata.type === 'file' && metadata.file) {
      const { name, size, mimeType } = metadata.file;
      statusElement.textContent = 'Waiting for file data...';
      fileView.hidden = false;
      fileNameElement.textContent = `${name} (${mimeType})`;
      fileSizeElement.textContent = `Size: ${formatBytes(size)}`;
    } else if (metadata.type === 'text') {
      statusElement.textContent = 'Waiting for text content...';
      textView.hidden = false;
    } else {
      throw new Error('Unsupported content type.');
    }
  } catch (error) {
    console.error(error);
    showError(error.message, statusElement, errorElement);
    return;
  }

  copyButton.addEventListener('click', async () => {
    if (!latestText) return;
    try {
      await navigator.clipboard.writeText(latestText);
      alert('Text copied to clipboard.');
    } catch (err) {
      console.error(err);
      alert('Unable to copy text automatically. Please copy it manually.');
    }
  });

  downloadButton.addEventListener('click', () => {
    if (!objectUrl) return;
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = downloadButton.dataset.filename || 'shared-file';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  });

  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const wsUrl = `${wsProtocol}://${window.location.host}/ws?sessionId=${encodeURIComponent(sessionId)}`;
  const socket = new WebSocket(wsUrl);

  socket.addEventListener('open', () => {
    statusElement.textContent = 'Connected. Receiving data...';
  });

  socket.addEventListener('message', async (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.event === 'session') {
        if (data.sessionType === 'file' && data.file) {
          const { name, mimeType, dataBase64 } = data.file;
          const blob = base64ToBlob(dataBase64, mimeType);
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          objectUrl = URL.createObjectURL(blob);

          downloadButton.hidden = false;
          downloadButton.dataset.filename = name;

          if (mimeType.startsWith('image/')) {
            imagePreview.hidden = false;
            videoPreview.hidden = true;
            imageElement.src = objectUrl;
          } else if (mimeType.startsWith('video/')) {
            imagePreview.hidden = true;
            videoPreview.hidden = false;
            videoElement.src = objectUrl;
          } else {
            imagePreview.hidden = true;
            videoPreview.hidden = true;
          }

          statusElement.textContent = 'File ready. Use the button below to download.';
        } else if (data.sessionType === 'text' && typeof data.text === 'string') {
          latestText = data.text;
          sharedTextElement.textContent = data.text;
          statusElement.textContent = 'Text received.';

          if (navigator.clipboard && window.confirm('是否要將文字內容複製到剪貼簿？')) {
            try {
              await navigator.clipboard.writeText(data.text);
              alert('文字已複製到剪貼簿。');
            } catch (err) {
              console.error(err);
              alert('無法自動複製，請使用下方按鈕手動複製。');
            }
          }
        }
      } else if (data.event === 'error') {
        throw new Error(data.message || 'An unexpected error occurred.');
      }
    } catch (error) {
      console.error(error);
      showError(error.message, statusElement, errorElement);
      socket.close();
    }
  });

  socket.addEventListener('error', () => {
    showError('Connection error. Please try reloading the page.', statusElement, errorElement);
  });

  socket.addEventListener('close', () => {
    if (statusElement.textContent !== 'Connection error. Please try reloading the page.') {
      statusElement.textContent += ' (Connection closed)';
    }
  });

  window.addEventListener('beforeunload', () => {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
    socket.close();
  });
}

function getSessionIdFromPath() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  if (parts.length >= 2 && parts[0] === 'share') {
    return parts[1];
  }
  return null;
}

function showError(message, statusElement, errorElement) {
  statusElement.textContent = 'Unable to load content';
  errorElement.hidden = false;
  errorElement.textContent = message;
}

function base64ToBlob(base64, mimeType) {
  const byteCharacters = atob(base64);
  const byteArrays = [];
  const chunkSize = 1024;

  for (let offset = 0; offset < byteCharacters.length; offset += chunkSize) {
    const slice = byteCharacters.slice(offset, offset + chunkSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    byteArrays.push(new Uint8Array(byteNumbers));
  }

  return new Blob(byteArrays, { type: mimeType });
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / 1024 ** exponent;
  return `${size.toFixed(size >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

