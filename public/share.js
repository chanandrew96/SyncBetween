// i18n helper functions for share page
function updateI18nElementsShare() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      el.textContent = i18n.t(key);
    }
  });
}

function setupLanguageSwitcherShare() {
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
        updateI18nElementsShare();
        updateSharePageText();
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
  setupLanguageSwitcherShare();
  updateI18nElementsShare();
  initSharePage();
});

async function initSharePage() {
  const sessionId = getSessionIdFromPath();
  const statusElement = document.getElementById('session-status');
  const detailsElement = document.getElementById('session-details');
  const errorElement = document.getElementById('error-message');
  const textView = document.getElementById('text-view');
  const copyButton = document.getElementById('copy-button');
  const sharedTextElement = document.getElementById('shared-text');
  const fileView = document.getElementById('file-view');
  const fileCountMessage = document.getElementById('file-count-message');
  const filesList = document.getElementById('files-list');

  if (!sessionId) {
    showError(i18n.t('invalidShareLink'), statusElement, errorElement);
    return;
  }

  const fileObjectUrls = new Map();
  const fileChunks = new Map(); // Store chunks for each file
  let latestText = '';
  let socket = null;
  const passphrasePrompt = document.getElementById('passphrase-prompt');
  const passphraseForm = document.getElementById('passphrase-form');
  const passphraseInput = document.getElementById('passphrase-input');
  const passphraseError = document.getElementById('passphrase-error');

  try {
    statusElement.textContent = i18n.t('preparingContent');
    const metaResponse = await fetch(`/api/session/${sessionId}`);

    if (!metaResponse.ok) {
      throw new Error(metaResponse.status === 404 ? i18n.t('sessionNotFound') : i18n.t('unableToLoad'));
    }

    const metadata = await metaResponse.json();

    const applySessionMetadata = () => {
      if (metadata.type === 'file') {
        statusElement.textContent = i18n.t('waitingFileData');
        fileView.hidden = false;
        textView.hidden = true;

        if (metadata.files && Array.isArray(metadata.files)) {
          const count = metadata.files.length;
          const fileText = count === 1 ? i18n.t('file') : i18n.t('files');
          fileCountMessage.textContent = `${i18n.t('youAreReceiving')} ${count} ${fileText}:`;
        } else if (metadata.file) {
          fileCountMessage.textContent = `${i18n.t('youAreReceiving')} 1 ${i18n.t('file')}:`;
        }
      } else if (metadata.type === 'text') {
        statusElement.textContent = i18n.t('waitingTextContent');
        textView.hidden = false;
        fileView.hidden = true;
      } else {
        throw new Error(i18n.t('unsupportedContentType'));
      }
    };

    applySessionMetadata();

    let passphraseHandlerAttached = false;

    if (metadata.requiresPassphrase) {
      passphrasePrompt.hidden = false;
      detailsElement.hidden = true;
      statusElement.textContent = i18n.t('passphraseRequired');

      const handlePassphraseSubmit = async (e) => {
        e.preventDefault();
        const passphrase = passphraseInput.value.trim();

        if (!passphrase) {
          passphraseError.textContent = i18n.t('passphraseEmpty');
          passphraseError.hidden = false;
          return;
        }

        passphraseError.hidden = true;
        statusElement.textContent = i18n.t('connecting');

        connectWebSocket(passphrase);
      };

      passphraseForm.addEventListener('submit', handlePassphraseSubmit);
    } else {
      detailsElement.hidden = false;
      connectWebSocket();
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
      alert(i18n.t('textCopied'));
    } catch (err) {
      console.error(err);
      alert(i18n.t('unableToCopy'));
    }
  });

  function downloadFile(objectUrl, filename) {
    if (!objectUrl) return;
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename || 'shared-file';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }

  function createFileItem(fileData, index) {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item-container';
    
    const fileInfo = document.createElement('div');
    fileInfo.className = 'file-info';
    
    const fileName = document.createElement('div');
    fileName.className = 'file-name';
    fileName.textContent = fileData.name;
    
    const fileMeta = document.createElement('div');
    fileMeta.className = 'file-meta';
    fileMeta.textContent = `${fileData.mimeType} • ${formatBytes(fileData.size)}`;
    
    fileInfo.appendChild(fileName);
    fileInfo.appendChild(fileMeta);
    
    // Preview for images and videos
    let previewElement = null;
    if (fileData.mimeType.startsWith('image/')) {
      previewElement = document.createElement('img');
      previewElement.className = 'file-preview';
      previewElement.alt = fileData.name;
    } else if (fileData.mimeType.startsWith('video/')) {
      previewElement = document.createElement('video');
      previewElement.className = 'file-preview';
      previewElement.controls = true;
      previewElement.playsInline = true;
    }
    
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'download-file-btn';
    downloadBtn.textContent = i18n.t('download');
    downloadBtn.disabled = true; // Disabled until file is ready
    downloadBtn.dataset.fileIndex = index;
    
    fileItem.appendChild(fileInfo);
    if (previewElement) {
      fileItem.appendChild(previewElement);
    }
    fileItem.appendChild(downloadBtn);
    
    return { container: fileItem, preview: previewElement };
  }

  function connectWebSocket(passphrase = null) {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    let wsUrl = `${wsProtocol}://${window.location.host}/ws?sessionId=${encodeURIComponent(sessionId)}`;
    
    if (passphrase) {
      wsUrl += `&passphrase=${encodeURIComponent(passphrase)}`;
    }

    // Reset previous transfer state
    fileChunks.clear();
    filesList.innerHTML = '';
    latestText = '';
    fileObjectUrls.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    fileObjectUrls.clear();
    
    if (socket) {
      socket.close();
    }
    
    socket = new WebSocket(wsUrl);
    setupWebSocketHandlers();
  }

  function setupWebSocketHandlers() {
    socket.addEventListener('open', () => {
      statusElement.textContent = i18n.t('connectedReceiving');
      if (passphrasePrompt) {
        passphrasePrompt.hidden = true;
        detailsElement.hidden = false;
      }
    });

    socket.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.event === 'session') {
          if (data.sessionType === 'file') {
            // Initialize file chunks storage
            if (data.files && Array.isArray(data.files)) {
              filesList.innerHTML = '';
              fileChunks.clear();
              
              data.files.forEach((fileData, index) => {
                fileChunks.set(index, {
                  fileData,
                  chunks: [],
                  receivedChunks: 0,
                  totalChunks: 0,
                  bytesReceived: 0,
                });
                
                // Create placeholder UI
                const { container, preview } = createFileItem(fileData, index);
                const progressInfo = document.createElement('div');
                progressInfo.className = 'file-progress';
                progressInfo.textContent = i18n.t('receiving');
                container.insertBefore(progressInfo, container.lastChild);
                filesList.appendChild(container);
              });
              
              statusElement.textContent = i18n.t('receivingFiles');
            } else if (data.file) {
              // Legacy single file format
              const { name, mimeType, dataBase64 } = data.file;
              const blob = base64ToBlob(dataBase64, mimeType);
              
              const oldUrl = fileObjectUrls.get(0);
              if (oldUrl) {
                URL.revokeObjectURL(oldUrl);
              }
              
              const objectUrl = URL.createObjectURL(blob);
              fileObjectUrls.set(0, objectUrl);
              
              filesList.innerHTML = '';
              const { container, preview } = createFileItem(data.file, 0);
              
              if (preview) {
                preview.src = objectUrl;
              }
              
              filesList.appendChild(container);
              statusElement.textContent = i18n.t('fileReady');
            }
          } else if (data.sessionType === 'text' && typeof data.text === 'string') {
            latestText = data.text;
            sharedTextElement.textContent = data.text;
            statusElement.textContent = i18n.t('textReceived');

            if (navigator.clipboard && window.confirm(i18n.t('copyToClipboard'))) {
              try {
                await navigator.clipboard.writeText(data.text);
                alert(i18n.t('copiedToClipboard'));
              } catch (err) {
                console.error(err);
                alert(i18n.t('unableToCopyManual'));
              }
            }
          }
        } else if (data.event === 'fileChunk') {
          // Handle streaming file chunks
          const { fileIndex, chunkIndex, totalChunks, dataBase64 } = data;
          const fileInfo = fileChunks.get(fileIndex);
          
          if (fileInfo) {
            const chunkBytes = base64ToUint8Array(dataBase64);
            fileInfo.totalChunks = totalChunks;
            fileInfo.chunks[chunkIndex] = chunkBytes;
            fileInfo.receivedChunks++;
            fileInfo.bytesReceived += chunkBytes.length;
            
            // Update progress
            const container = filesList.children[fileIndex];
            const progressPercent = fileInfo.fileData.size
              ? Math.min(100, Math.round((fileInfo.bytesReceived / fileInfo.fileData.size) * 100))
              : Math.round((fileInfo.receivedChunks / totalChunks) * 100);
            if (container) {
              const progressInfo = container.querySelector('.file-progress');
              if (progressInfo) {
                progressInfo.textContent = `${i18n.t('receiving')}... ${progressPercent}%`;
              }
            }
            
            statusElement.textContent = `${i18n.t('receivingFiles')} (${fileInfo.receivedChunks}/${totalChunks} ${i18n.t('chunksForFile')} ${fileIndex + 1})`;
          }
        } else if (data.event === 'fileComplete') {
          // All chunks received, reconstruct files
          const fileCount = data.fileCount || fileChunks.size;
          
          fileChunks.forEach((fileInfo, index) => {
            // Reconstruct file from binary chunks
            const totalLength = fileInfo.chunks.reduce((sum, chunk) => {
              return chunk ? sum + chunk.length : sum;
            }, 0);
            const mergedArray = new Uint8Array(totalLength);
            let offset = 0;
            fileInfo.chunks.forEach((chunk) => {
              if (chunk) {
                mergedArray.set(chunk, offset);
                offset += chunk.length;
              }
            });
            const blob = new Blob([mergedArray], { type: fileInfo.fileData.mimeType });
            
            // Revoke old URL if exists
            const oldUrl = fileObjectUrls.get(index);
            if (oldUrl) {
              URL.revokeObjectURL(oldUrl);
            }
            
            const objectUrl = URL.createObjectURL(blob);
            fileObjectUrls.set(index, objectUrl);
            
            // Update UI
            const container = filesList.children[index];
            if (container) {
              const progressInfo = container.querySelector('.file-progress');
              if (progressInfo) {
                progressInfo.textContent = i18n.t('ready');
                progressInfo.style.color = '#34a853';
              }
              
              // Update download button
              const downloadBtn = container.querySelector('.download-file-btn');
              if (downloadBtn) {
                downloadBtn.disabled = false;
                downloadBtn.onclick = () => {
                  downloadFile(objectUrl, fileInfo.fileData.name);
                };
              }
              
              // Update preview if exists
              const preview = container.querySelector('.file-preview');
              if (preview) {
                preview.src = objectUrl;
              }
            }
          });
          
          statusElement.textContent = fileCount === 1 
            ? i18n.t('fileReadyDownload')
            : i18n.t('filesReadyDownload', { count: fileCount });
          
          fileChunks.clear();
        } else if (data.event === 'passphraseRequired') {
          // Passphrase is required or incorrect
          if (passphrasePrompt) {
            passphrasePrompt.hidden = false;
            detailsElement.hidden = true;
            passphraseError.textContent = i18n.t('passphraseIncorrect');
            passphraseError.hidden = false;
            passphraseInput.value = '';
            passphraseInput.focus();
          }
          statusElement.textContent = i18n.t('passphraseRequired');
        } else if (data.event === 'error') {
          throw new Error(data.message || 'An unexpected error occurred.');
        }
      } catch (error) {
        console.error(error);
        showError(error.message, statusElement, errorElement);
        if (socket) {
          socket.close();
        }
      }
    });

    socket.addEventListener('error', () => {
      showError(i18n.t('connectionError'), statusElement, errorElement);
    });

    socket.addEventListener('close', () => {
      const errorMsg = i18n.t('connectionError');
      if (statusElement.textContent !== errorMsg) {
        statusElement.textContent += ` (${i18n.t('connectionClosed')})`;
      }
    });
  }

  window.addEventListener('beforeunload', () => {
    fileObjectUrls.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    fileObjectUrls.clear();
    fileChunks.clear();
    if (socket) {
      socket.close();
    }
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
  statusElement.textContent = i18n.t('unableToLoadContent');
  errorElement.hidden = false;
  errorElement.textContent = message;
}

function updateSharePageText() {
  // Update any dynamic text on share page
  const statusElement = document.getElementById('session-status');
  if (statusElement && statusElement.textContent) {
    // Status text will be updated by WebSocket events
  }
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

function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / 1024 ** exponent;
  return `${size.toFixed(size >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

