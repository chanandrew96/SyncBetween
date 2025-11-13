document.addEventListener('DOMContentLoaded', () => {
  setupFileSharing();
  setupTextSharing();
});

function setupFileSharing() {
  const fileInput = document.querySelector('#file-input');
  const fileLabel = document.querySelector('#file-label');
  const fileForm = document.querySelector('#file-share-form');
  const submitButton = document.querySelector('#file-submit');
  const resultSection = document.querySelector('#file-share-result');
  const shareLink = document.querySelector('#file-share-link');
  const qrCanvas = document.querySelector('#file-qr');

  let isSubmitting = false;

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      fileLabel.textContent = `${file.name} (${formatBytes(file.size)})`;
      submitButton.disabled = false;
    } else {
      fileLabel.textContent = 'Choose image or video';
      submitButton.disabled = true;
    }
  });

  fileForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isSubmitting || fileInput.files.length === 0) return;

    const file = fileInput.files[0];
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      showToast('Please select an image or video file.');
      return;
    }

    isSubmitting = true;
    submitButton.disabled = true;
    submitButton.textContent = 'Preparing...';

    try {
      const base64 = await fileToBase64(file);
      const response = await fetch('/api/session/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.name,
          mimeType: file.type,
          dataBase64: base64,
          size: file.size,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to create share link.');
      }

      const result = await response.json();
      shareLink.textContent = result.shareUrl;
      shareLink.href = result.shareUrl;
      drawQr(qrCanvas, result.shareUrl);
      resultSection.hidden = false;
    } catch (error) {
      console.error(error);
      showToast(error.message);
    } finally {
      isSubmitting = false;
      submitButton.textContent = 'Generate Share Link';
      submitButton.disabled = fileInput.files.length === 0;
    }
  });
}

function setupTextSharing() {
  const textArea = document.querySelector('#text-input');
  const submitButton = document.querySelector('#text-submit');
  const textForm = document.querySelector('#text-share-form');
  const resultSection = document.querySelector('#text-share-result');
  const shareLink = document.querySelector('#text-share-link');
  const qrCanvas = document.querySelector('#text-qr');

  let isSubmitting = false;

  textArea.addEventListener('input', () => {
    submitButton.disabled = textArea.value.trim().length === 0 || isSubmitting;
  });

  textForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const text = textArea.value.trim();
    if (!text) {
      showToast('Please enter some text to share.');
      return;
    }

    isSubmitting = true;
    submitButton.disabled = true;
    submitButton.textContent = 'Preparing...';

    try {
      const response = await fetch('/api/session/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to create share link.');
      }

      const result = await response.json();
      shareLink.textContent = result.shareUrl;
      shareLink.href = result.shareUrl;
      drawQr(qrCanvas, result.shareUrl);
      resultSection.hidden = false;
    } catch (error) {
      console.error(error);
      showToast(error.message);
    } finally {
      isSubmitting = false;
      submitButton.textContent = 'Generate Share Link';
      submitButton.disabled = textArea.value.trim().length === 0;
    }
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = typeof result === 'string' ? result.split(',')[1] : null;
      if (!base64) {
        reject(new Error('Unable to read file.'));
      } else {
        resolve(base64);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

function drawQr(canvas, value) {
  if (!window.QRious) {
    console.error('QRious library failed to load.');
    return;
  }
  new QRious({
    element: canvas,
    value,
    size: 220,
    level: 'H',
  });
}

function showToast(message) {
  alert(message);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / 1024 ** exponent;
  return `${size.toFixed(size >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

