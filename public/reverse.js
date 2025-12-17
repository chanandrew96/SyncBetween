// Language switcher (reuse i18n)
function setupLanguageSwitcherReverse() {
  const langBtn = document.getElementById('lang-btn');
  const langMenu = document.getElementById('lang-menu');

  if (!langBtn || !langMenu) return;

  langBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    langMenu.hidden = !langMenu.hidden;
  });

  document.querySelectorAll('.lang-option').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const lang = btn.getAttribute('data-lang');
      if (i18n.setLang(lang)) {
        updateI18nElementsReverse();
        langMenu.hidden = true;
      }
    });
  });

  document.addEventListener('click', () => {
    langMenu.hidden = true;
  });
}

function updateI18nElementsReverse() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      el.textContent = i18n.t(key);
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) {
      el.placeholder = i18n.t(key);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupLanguageSwitcherReverse();
  updateI18nElementsReverse();
  initReverseForm();
});

function initReverseForm() {
  const form = document.getElementById('reverse-form');
  const uploadTypeRadios = document.querySelectorAll('input[name="upload-type"]');
  const textArea = document.getElementById('reverse-text');
  const fileInput = document.getElementById('reverse-file');
  const fileLabel = document.getElementById('reverse-file-label');
  const statusEl = document.getElementById('reverse-status');
  const errorEl = document.getElementById('reverse-error');

  const textAreaWrap = document.getElementById('text-upload-area');
  const fileArea = document.getElementById('file-upload-area');

  // Toggle upload type
  uploadTypeRadios.forEach((radio) => {
    radio.addEventListener('change', () => {
      if (radio.checked && radio.value === 'text') {
        textAreaWrap.classList.remove('hidden');
        fileArea.classList.add('hidden');
      } else if (radio.checked && radio.value === 'file') {
        textAreaWrap.classList.add('hidden');
        fileArea.classList.remove('hidden');
      }
    });
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) {
      fileLabel.textContent = fileInput.files[0].name;
    } else {
      fileLabel.textContent = i18n.t('chooseFiles');
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    statusEl.textContent = '';

    const sessionId = getSessionIdFromPath();
    if (!sessionId) {
      errorEl.textContent = i18n.t('invalidShareLink');
      errorEl.hidden = false;
      return;
    }

    const name = document.getElementById('uploader-name').value.trim();
    const passphrase = document.getElementById('reverse-passphrase').value.trim();
    const selectedType = Array.from(uploadTypeRadios).find((r) => r.checked)?.value || 'text';

    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    let wsUrl = `${wsProtocol}://${window.location.host}/ws?sessionId=${encodeURIComponent(sessionId)}&role=client`;
    if (passphrase) {
      wsUrl += `&passphrase=${encodeURIComponent(passphrase)}`;
    }

    try {
      const socket = new WebSocket(wsUrl);

      socket.addEventListener('open', async () => {
        if (selectedType === 'text') {
          const text = textArea.value.trim();
          if (!text) {
            errorEl.textContent = i18n.t('pleaseEnterText');
            errorEl.hidden = false;
            socket.close();
            return;
          }
          socket.send(
            JSON.stringify({
              event: 'uploadText',
              text,
              name,
            })
          );
        } else if (selectedType === 'file') {
          if (!fileInput.files || fileInput.files.length === 0) {
            errorEl.textContent = i18n.t('pleaseSelectFile');
            errorEl.hidden = false;
            socket.close();
            return;
          }
          const file = fileInput.files[0];
      if (file.size > 50 * 1024 * 1024) {
        errorEl.textContent = i18n.t('fileSizeExceeds');
        errorEl.hidden = false;
        socket.close();
        return;
      }
          const base64 = await fileToBase64(file);
          socket.send(
            JSON.stringify({
              event: 'uploadFile',
              name,
              file: {
                name: file.name,
                mimeType: file.type || 'application/octet-stream',
                size: file.size,
                dataBase64: base64,
              },
            })
          );
        }
      });

      socket.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'uploadReceived') {
            statusEl.textContent = i18n.t('uploadSuccess') || 'Upload success';
            socket.close();
          } else if (data.event === 'passphraseRequired') {
            errorEl.textContent = i18n.t('passphraseRequired');
            errorEl.hidden = false;
          } else if (data.event === 'passphraseLocked') {
            errorEl.textContent = i18n.t('passphraseLocked');
            errorEl.hidden = false;
            socket.close();
          } else if (data.event === 'sessionUsed') {
            errorEl.textContent = i18n.t('sessionAlreadyOpened');
            errorEl.hidden = false;
            socket.close();
          } else if (data.event === 'error') {
            errorEl.textContent = data.message || i18n.t('unableToLoadContent');
            errorEl.hidden = false;
            socket.close();
          }
        } catch (err) {
          console.error(err);
          errorEl.textContent = i18n.t('unableToLoadContent');
          errorEl.hidden = false;
        }
      });

      socket.addEventListener('error', () => {
        errorEl.textContent = i18n.t('connectionError');
        errorEl.hidden = false;
      });
    } catch (err) {
      console.error(err);
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    }
  });
}

function getSessionIdFromPath() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  if (parts.length >= 2 && parts[0] === 'upload') {
    return parts[1];
  }
  return null;
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

