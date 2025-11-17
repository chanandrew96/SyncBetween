// i18n helper functions
function updateI18nElements() {
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
  
  // Update select options
  document.querySelectorAll('select option[data-i18n-option]').forEach((option) => {
    const key = option.getAttribute('data-i18n-option');
    if (key) {
      option.textContent = i18n.t(key);
    }
  });
}

function setupLanguageSwitcher() {
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
        updateI18nElements();
        updateDynamicText();
        langMenu.hidden = true;
      }
    });
  });
  
  // Close menu when clicking outside
  document.addEventListener('click', () => {
    langMenu.hidden = true;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupLanguageSwitcher();
  updateI18nElements();
  setupFileSharing();
  setupTextSharing();
  updateDynamicText();
});

function setupFileSharing() {
  const fileInput = document.querySelector('#file-input');
  const fileLabel = document.querySelector('#file-label');
  const fileList = document.querySelector('#file-list');
  const fileForm = document.querySelector('#file-share-form');
  const submitButton = document.querySelector('#file-submit');
  const resultSection = document.querySelector('#file-share-result');
  const shareLink = document.querySelector('#file-share-link');
  const qrCanvas = document.querySelector('#file-qr');
  const expiryPreset = document.querySelector('#file-expiry-preset');
  const expiryCustom = document.querySelector('#file-expiry-custom');
  const expiryInfo = document.querySelector('#file-expiry-info');
  const openOnceCheckbox = document.querySelector('#file-open-once');

  let isSubmitting = false;

  // Handle expiry time selection
  expiryPreset.addEventListener('change', () => {
    if (expiryPreset.value === 'custom') {
      expiryCustom.hidden = false;
      expiryCustom.focus();
    } else {
      expiryCustom.hidden = true;
      expiryCustom.value = '';
    }
  });

  function getExpiryMinutes() {
    if (expiryPreset.value === 'custom') {
      const customValue = parseInt(expiryCustom.value, 10);
      if (customValue && customValue >= 1 && customValue <= 10080) {
        return customValue;
      }
      return 60; // Default to 1 hour if invalid
    }
    return parseInt(expiryPreset.value, 10);
  }

  fileInput.addEventListener('change', () => {
    const files = Array.from(fileInput.files);
    if (files.length > 0) {
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      if (files.length === 1) {
        fileLabel.textContent = `${files[0].name} (${formatBytes(files[0].size)})`;
      } else {
        fileLabel.textContent = `${files.length} ${i18n.t('filesSelected')} (${formatBytes(totalSize)} ${i18n.t('total')})`;
      }
      
      // Display file list
      fileList.innerHTML = '';
      files.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
          <span class="file-item-name">${file.name}</span>
          <span class="file-item-size">${formatBytes(file.size)}</span>
        `;
        fileList.appendChild(fileItem);
      });
      fileList.hidden = false;
      submitButton.disabled = false;
    } else {
      fileLabel.textContent = i18n.t('chooseFiles');
      fileList.hidden = true;
      fileList.innerHTML = '';
      submitButton.disabled = true;
    }
  });

  fileForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isSubmitting || fileInput.files.length === 0) return;

    const files = Array.from(fileInput.files);
    isSubmitting = true;
    submitButton.disabled = true;
    submitButton.textContent = i18n.t('preparing');

    try {
      // Process all files
      const fileData = await Promise.all(
        files.map(async (file) => {
          const base64 = await fileToBase64(file);
          return {
            name: file.name,
            mimeType: file.type || 'application/octet-stream',
            dataBase64: base64,
            size: file.size,
          };
        })
      );

      const expiryMinutes = getExpiryMinutes();
      const passphraseInput = document.querySelector('#file-passphrase');
      const passphrase = passphraseInput.value.trim() || null;
      const openOnce = openOnceCheckbox ? !!openOnceCheckbox.checked : false;
      
      const response = await fetch('/api/session/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          files: fileData,
          expiresInMinutes: expiryMinutes,
          passphrase: passphrase,
          openOnce,
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
      
      // Display expiry information
      if (result.expiresInSeconds) {
        const hours = Math.floor(result.expiresInSeconds / 3600);
        const minutes = Math.floor((result.expiresInSeconds % 3600) / 60);
        if (hours > 0) {
          expiryInfo.textContent = `This link will expire in ${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''}.`;
        } else {
          expiryInfo.textContent = `This link will expire in ${minutes} minute${minutes !== 1 ? 's' : ''}.`;
        }
      }
      
      resultSection.hidden = false;
    } catch (error) {
      console.error(error);
      showToast(error.message);
    } finally {
      isSubmitting = false;
      submitButton.textContent = i18n.t('generateShareLink');
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
  const expiryPreset = document.querySelector('#text-expiry-preset');
  const expiryCustom = document.querySelector('#text-expiry-custom');
  const expiryInfo = document.querySelector('#text-expiry-info');
  const openOnceCheckbox = document.querySelector('#text-open-once');

  let isSubmitting = false;

  // Handle expiry time selection
  expiryPreset.addEventListener('change', () => {
    if (expiryPreset.value === 'custom') {
      expiryCustom.hidden = false;
      expiryCustom.focus();
    } else {
      expiryCustom.hidden = true;
      expiryCustom.value = '';
    }
  });

  function getExpiryMinutes() {
    if (expiryPreset.value === 'custom') {
      const customValue = parseInt(expiryCustom.value, 10);
      if (customValue && customValue >= 1 && customValue <= 10080) {
        return customValue;
      }
      return 60; // Default to 1 hour if invalid
    }
    return parseInt(expiryPreset.value, 10);
  }

  textArea.addEventListener('input', () => {
    submitButton.disabled = textArea.value.trim().length === 0 || isSubmitting;
  });

  textForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const text = textArea.value.trim();
    if (!text) {
      showToast(i18n.t('pleaseEnterText'));
      return;
    }

    isSubmitting = true;
    submitButton.disabled = true;
    submitButton.textContent = i18n.t('preparing');

    try {
      const expiryMinutes = getExpiryMinutes();
      const passphraseInput = document.querySelector('#text-passphrase');
      const passphrase = passphraseInput.value.trim() || null;
      const openOnce = openOnceCheckbox ? !!openOnceCheckbox.checked : false;
      
      const response = await fetch('/api/session/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text,
          expiresInMinutes: expiryMinutes,
          passphrase: passphrase,
          openOnce,
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
      
      // Display expiry information
      if (result.expiresInSeconds) {
        const hours = Math.floor(result.expiresInSeconds / 3600);
        const minutes = Math.floor((result.expiresInSeconds % 3600) / 60);
        if (hours > 0) {
          const hourText = hours === 1 ? i18n.t('hour') : i18n.t('hours');
          const minuteText = minutes === 1 ? i18n.t('minute') : i18n.t('minutes');
          expiryInfo.textContent = `${i18n.t('linkExpiresIn')} ${hours} ${hourText} ${i18n.t('and')} ${minutes} ${minuteText}.`;
        } else {
          const minuteText = minutes === 1 ? i18n.t('minute') : i18n.t('minutes');
          expiryInfo.textContent = `${i18n.t('linkExpiresIn')} ${minutes} ${minuteText}.`;
        }
      }
      
      resultSection.hidden = false;
    } catch (error) {
      console.error(error);
      showToast(error.message);
    } finally {
      isSubmitting = false;
      submitButton.textContent = i18n.t('generateShareLink');
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

function updateDynamicText() {
  // Update any dynamic text that might have been missed
  const fileLabel = document.querySelector('#file-label');
  if (fileLabel && !fileInput?.files?.length) {
    fileLabel.textContent = i18n.t('chooseFiles');
  }
}

