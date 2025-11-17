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
  const fileCountMessage = document.getElementById('file-count-message');
  const filesList = document.getElementById('files-list');

  if (!sessionId) {
    showError('Invalid share link. Please check the URL.', statusElement, errorElement);
    return;
  }

  const fileObjectUrls = new Map();
  const fileChunks = new Map(); // Store chunks for each file
  let latestText = '';

  try {
    statusElement.textContent = 'Preparing your content...';
    const metaResponse = await fetch(`/api/session/${sessionId}`);

    if (!metaResponse.ok) {
      throw new Error(metaResponse.status === 404 ? 'This share link is no longer available.' : 'Unable to load shared content.');
    }

    const metadata = await metaResponse.json();
    detailsElement.hidden = false;

    if (metadata.type === 'file') {
      statusElement.textContent = 'Waiting for file data...';
      fileView.hidden = false;
      
      if (metadata.files && Array.isArray(metadata.files)) {
        // Multiple files
        const count = metadata.files.length;
        fileCountMessage.textContent = count === 1 
          ? 'You are receiving 1 file:' 
          : `You are receiving ${count} files:`;
      } else if (metadata.file) {
        // Legacy single file format
        fileCountMessage.textContent = 'You are receiving 1 file:';
      }
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
    downloadBtn.textContent = 'Download';
    downloadBtn.disabled = true; // Disabled until file is ready
    downloadBtn.dataset.fileIndex = index;
    
    fileItem.appendChild(fileInfo);
    if (previewElement) {
      fileItem.appendChild(previewElement);
    }
    fileItem.appendChild(downloadBtn);
    
    return { container: fileItem, preview: previewElement };
  }

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
              });
              
              // Create placeholder UI
              const { container, preview } = createFileItem(fileData, index);
              const progressInfo = document.createElement('div');
              progressInfo.className = 'file-progress';
              progressInfo.textContent = 'Receiving...';
              container.insertBefore(progressInfo, container.lastChild);
              filesList.appendChild(container);
            });
            
            statusElement.textContent = 'Receiving files...';
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
            statusElement.textContent = 'File ready. Use the button below to download.';
          }
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
      } else if (data.event === 'fileChunk') {
        // Handle streaming file chunks
        const { fileIndex, chunkIndex, totalChunks, dataBase64 } = data;
        const fileInfo = fileChunks.get(fileIndex);
        
        if (fileInfo) {
          fileInfo.totalChunks = totalChunks;
          fileInfo.chunks[chunkIndex] = dataBase64;
          fileInfo.receivedChunks++;
          
          // Update progress
          const progress = Math.round((fileInfo.receivedChunks / totalChunks) * 100);
          const container = filesList.children[fileIndex];
          if (container) {
            const progressInfo = container.querySelector('.file-progress');
            if (progressInfo) {
              progressInfo.textContent = `Receiving... ${progress}%`;
            }
          }
          
          statusElement.textContent = `Receiving files... (${fileInfo.receivedChunks}/${totalChunks} chunks for file ${fileIndex + 1})`;
        }
      } else if (data.event === 'fileComplete') {
        // All chunks received, reconstruct files
        const fileCount = data.fileCount || fileChunks.size;
        
        fileChunks.forEach((fileInfo, index) => {
          // Reconstruct file from chunks
          const allChunks = fileInfo.chunks.filter(Boolean);
          const combinedBase64 = allChunks.join('');
          const blob = base64ToBlob(combinedBase64, fileInfo.fileData.mimeType);
          
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
              progressInfo.textContent = 'Ready';
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
          ? 'File ready. Use the button below to download.' 
          : `${fileCount} files ready. Use the buttons below to download.`;
        
        fileChunks.clear();
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
    fileObjectUrls.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    fileObjectUrls.clear();
    fileChunks.clear();
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

