const i18n = {
  currentLang: 'en',
  translations: {
    en: {
      // Header
      appTitle: 'SyncBetween',
      appSubtitle: 'Share files or text securely across your devices.',
      
      // File sharing
      shareFiles: 'Share Files',
      shareFilesDesc: 'Select one or more files (any type) to create a share link.',
      chooseFiles: 'Choose files',
      filesSelected: 'files selected',
      total: 'total',
      sessionExpiryTime: 'Session expiry time:',
      minutes: 'minutes',
      customMinutes: 'Custom (minutes)',
      '15 minutes': '15 minutes',
      '30 minutes': '30 minutes',
      '1 hour': '1 hour',
      '2 hours': '2 hours',
      '4 hours': '4 hours',
      '8 hours': '8 hours',
      '24 hours': '24 hours',
      generateShareLink: 'Generate Share Link',
      preparing: 'Preparing...',
      shareReady: 'Share Ready',
      shareLinkDesc: 'Share this link with another device:',
      openLinkOrScan: 'Open the link or scan the QR code from another device to download the files.',
      linkExpiresIn: 'This link will expire in',
      hour: 'hour',
      hours: 'hours',
      minute: 'minute',
      and: 'and',
      
      // Text sharing
      shareText: 'Share Text',
      shareTextDesc: 'Paste any text to share with another device.',
      enterTextPlaceholder: 'Enter your text here...',
      recipientPrompt: 'The recipient will be prompted to copy the text content.',
      
      // Footer
      dataStoredTemporarily: 'Data is stored temporarily for your current session only.',
      
      // Disclaimer
      disclaimerTitle: '⚠️ Privacy & Security Notice',
      disclaimerText: 'This service stores your shared data temporarily in server memory. Please do not share sensitive, confidential, or personal information. Use this service at your own risk. The service provider is not responsible for any data loss or privacy breaches.',
      
      // Share page
      receivingContent: 'Receiving shared content',
      connecting: 'Connecting...',
      preparingContent: 'Preparing your content...',
      waitingFileData: 'Waiting for file data...',
      waitingTextContent: 'Waiting for text content...',
      connectedReceiving: 'Connected. Receiving data...',
      receivingFiles: 'Receiving files...',
      fileReady: 'File ready. Use the button below to download.',
      filesReady: 'files ready. Use the buttons below to download.',
      textReceived: 'Text received.',
      receiving: 'Receiving...',
      ready: 'Ready',
      download: 'Download',
      downloadFile: 'Download File',
      copyText: 'Copy Text',
      textCopied: 'Text copied to clipboard.',
      unableToCopy: 'Unable to copy text automatically. Please copy it manually.',
      youAreReceiving: 'You are receiving',
      file: 'file',
      files: 'files',
      thisTextShared: 'This text was shared with you:',
      keepWindowOpen: 'Keep this window open until the transfer completes.',
      connectionError: 'Connection error. Please try reloading the page.',
      connectionClosed: 'Connection closed',
      unableToLoadContent: 'Unable to load content',
      invalidShareLink: 'Invalid share link. Please check the URL.',
      sessionNotFound: 'This share link is no longer available.',
      unableToLoad: 'Unable to load shared content.',
      unsupportedContentType: 'Unsupported content type.',
      
      // Errors
      pleaseSelectFile: 'Please select an image or video file.',
      pleaseEnterText: 'Please enter some text to share.',
      failedToCreateLink: 'Failed to create share link.',
      fileSizeExceeds: 'Total file size exceeds 50 MB limit.',
      
      // Clipboard prompts (for share.js)
      copyToClipboard: '是否要將文字內容複製到剪貼簿？',
      copiedToClipboard: '文字已複製到剪貼簿。',
      unableToCopyManual: '無法自動複製，請使用下方按鈕手動複製。',
      
      // Passphrase
      passphraseLabel: 'Passphrase (optional):',
      passphrasePlaceholder: 'Enter passphrase to protect shared data',
      passphraseHint: 'Recipients will need to enter this passphrase to access the shared content.',
      passphraseRequired: 'This shared content is protected by a passphrase. Please enter the passphrase to continue:',
      submitPassphrase: 'Submit',
      passphraseEmpty: 'Please enter a passphrase.',
      passphraseIncorrect: 'Incorrect passphrase. Please try again.',
      passphraseLocked: 'Too many incorrect attempts (max 5). This session is no longer available.',
      openOnceLabel: 'Open once only (auto-delete after first successful access)',
      openOnceHint: 'The session will be deleted after the recipient closes the transfer.',
      sessionAlreadyOpened: 'This share link has already been opened and is no longer available.',
      sectionHostSend: 'Host ▶ Share to others',
      sectionHostSendDesc: 'Generate links/QR for others to download your files or text.',
      sectionHostReceive: 'Host ▶ Receive uploads from others',
      sectionHostReceiveDesc: 'Create a link/QR for others to upload files or text to you.',
      // Reverse upload
      receiveUploads: 'Receive uploads',
      receiveUploadsDesc: 'Create a link/QR for others to upload files or text to you.',
      uploadToReceiver: 'Upload content to the receiver',
      uploadContent: 'Upload Content',
      uploadInstructions: 'Provide your name (optional) and upload text or a file to the receiver.',
      uploaderName: 'Your name (optional)',
      upload: 'Upload',
      uploadSuccess: 'Upload success.',
      incomingUploads: 'Incoming uploads',
      refresh: 'Refresh',
      maxConnections: 'Maximum uploads (clients)',
      chunksForFile: 'chunks for file',
      noUploads: 'No uploads yet.',
      anonymous: 'Anonymous',
    },
    'zh-TW': {
      // Header
      appTitle: 'SyncBetween',
      appSubtitle: '在不同裝置間安全地分享檔案或文字。',
      
      // File sharing
      shareFiles: '分享檔案',
      shareFilesDesc: '選擇一個或多個檔案（任何類型）以建立分享連結。',
      chooseFiles: '選擇檔案',
      filesSelected: '個檔案已選擇',
      total: '總計',
      sessionExpiryTime: 'Session 過期時間：',
      minutes: '分鐘',
      customMinutes: '自訂（分鐘）',
      '15 minutes': '15 分鐘',
      '30 minutes': '30 分鐘',
      '1 hour': '1 小時',
      '2 hours': '2 小時',
      '4 hours': '4 小時',
      '8 hours': '8 小時',
      '24 hours': '24 小時',
      generateShareLink: '產生分享連結',
      preparing: '準備中...',
      shareReady: '分享就緒',
      shareLinkDesc: '與另一台裝置分享此連結：',
      openLinkOrScan: '從另一台裝置開啟連結或掃描 QR Code 以下載檔案。',
      linkExpiresIn: '此連結將於',
      hour: '小時',
      hours: '小時',
      minute: '分鐘',
      and: '和',
      
      // Text sharing
      shareText: '分享文字',
      shareTextDesc: '貼上任何文字以與另一台裝置分享。',
      enterTextPlaceholder: '請在此輸入您的文字...',
      recipientPrompt: '接收者將被提示複製文字內容。',
      
      // Footer
      dataStoredTemporarily: '資料僅在當前 Session 中暫時儲存。',
      
      // Disclaimer
      disclaimerTitle: '⚠️ 隱私與安全聲明',
      disclaimerText: '此服務會將您分享的資料暫時儲存在伺服器記憶體中。請勿分享敏感、機密或個人資訊。使用此服務需自行承擔風險。服務提供者不對任何資料遺失或隱私洩露負責。',
      
      // Share page
      receivingContent: '正在接收分享的內容',
      connecting: '連線中...',
      preparingContent: '正在準備您的內容...',
      waitingFileData: '等待檔案資料...',
      waitingTextContent: '等待文字內容...',
      connectedReceiving: '已連線。正在接收資料...',
      receivingFiles: '正在接收檔案...',
      fileReady: '檔案就緒。請使用下方按鈕下載。',
      filesReady: '個檔案就緒。請使用下方按鈕下載。',
      textReceived: '文字已接收。',
      receiving: '接收中...',
      ready: '就緒',
      download: '下載',
      downloadFile: '下載檔案',
      copyText: '複製文字',
      textCopied: '文字已複製到剪貼簿。',
      unableToCopy: '無法自動複製文字，請手動複製。',
      youAreReceiving: '您正在接收',
      file: '個檔案',
      files: '個檔案',
      thisTextShared: '以下文字已與您分享：',
      keepWindowOpen: '請保持此視窗開啟直到傳輸完成。',
      connectionError: '連線錯誤。請重新載入頁面。',
      connectionClosed: '連線已關閉',
      unableToLoadContent: '無法載入內容',
      invalidShareLink: '無效的分享連結。請檢查網址。',
      sessionNotFound: '此分享連結已不再可用。',
      unableToLoad: '無法載入分享的內容。',
      unsupportedContentType: '不支援的內容類型。',
      
      // Errors
      pleaseSelectFile: '請選擇圖片或影片檔案。',
      pleaseEnterText: '請輸入一些要分享的文字。',
      failedToCreateLink: '建立分享連結失敗。',
      fileSizeExceeds: '總檔案大小超過 50 MB 限制。',
      
      // Clipboard prompts
      copyToClipboard: '是否要將文字內容複製到剪貼簿？',
      copiedToClipboard: '文字已複製到剪貼簿。',
      unableToCopyManual: '無法自動複製，請使用下方按鈕手動複製。',
      
      // Passphrase
      passphraseLabel: '密碼短語（選填）：',
      passphrasePlaceholder: '輸入密碼短語以保護分享的資料',
      passphraseHint: '接收者需要輸入此密碼短語才能存取分享的內容。',
      passphraseRequired: '此分享內容受密碼短語保護。請輸入密碼短語以繼續：',
      submitPassphrase: '提交',
      passphraseEmpty: '請輸入密碼短語。',
      passphraseIncorrect: '密碼短語錯誤。請重試。',
      passphraseLocked: '錯誤次數過多（最多 5 次），此分享已被鎖定或刪除。',
      openOnceLabel: '僅限開啟一次（首次傳輸完成後自動刪除）',
      openOnceHint: '接收者關閉傳輸後，此 Session 會被自動刪除。',
      sessionAlreadyOpened: '此分享連結已被使用，無法再次存取。',
      sectionHostSend: '主機 ▶ 傳送給他人',
      sectionHostSendDesc: '建立連結/QR 讓他人下載你的檔案或文字。',
      sectionHostReceive: '主機 ▶ 接收他人上傳',
      sectionHostReceiveDesc: '建立連結/QR 讓他人上傳檔案或文字給你。',
      receiveUploads: '接收上傳',
      receiveUploadsDesc: '建立連結/QR 讓他人上傳檔案或文字給你。',
      uploadToReceiver: '上傳內容給接收者',
      uploadContent: '上傳內容',
      uploadInstructions: '輸入您的名稱（可省略），並上傳文字或檔案給接收者。',
      uploaderName: '您的名稱（可省略）',
      upload: '上傳',
      uploadSuccess: '上傳成功。',
      incomingUploads: '已收到的上傳',
      refresh: '重新整理',
      maxConnections: '允許的最大上傳數（客戶端）',
      chunksForFile: '個分塊（第 {0} 個檔案）',
      noUploads: '尚未有任何上傳。',
      anonymous: '匿名',
    },
    'zh-CN': {
      // Header
      appTitle: 'SyncBetween',
      appSubtitle: '在不同设备间安全地分享文件或文本。',
      
      // File sharing
      shareFiles: '分享文件',
      shareFilesDesc: '选择一个或多个文件（任何类型）以创建分享链接。',
      chooseFiles: '选择文件',
      filesSelected: '个文件已选择',
      total: '总计',
      sessionExpiryTime: 'Session 过期时间：',
      minutes: '分钟',
      customMinutes: '自定义（分钟）',
      '15 minutes': '15 分钟',
      '30 minutes': '30 分钟',
      '1 hour': '1 小时',
      '2 hours': '2 小时',
      '4 hours': '4 小时',
      '8 hours': '8 小时',
      '24 hours': '24 小时',
      generateShareLink: '生成分享链接',
      preparing: '准备中...',
      shareReady: '分享就绪',
      shareLinkDesc: '与另一台设备分享此链接：',
      openLinkOrScan: '从另一台设备打开链接或扫描 QR Code 以下载文件。',
      linkExpiresIn: '此链接将于',
      hour: '小时',
      hours: '小时',
      minute: '分钟',
      and: '和',
      
      // Text sharing
      shareText: '分享文本',
      shareTextDesc: '粘贴任何文本以与另一台设备分享。',
      enterTextPlaceholder: '请在此输入您的文本...',
      recipientPrompt: '接收者将被提示复制文本内容。',
      
      // Footer
      dataStoredTemporarily: '数据仅在当前 Session 中暂时存储。',
      
      // Disclaimer
      disclaimerTitle: '⚠️ 隐私与安全声明',
      disclaimerText: '此服务会将您分享的数据暂时存储在服务器内存中。请勿分享敏感、机密或个人资讯。使用此服务需自行承担风险。服务提供者不对任何数据丢失或隐私泄露负责。',
      
      // Share page
      receivingContent: '正在接收分享的内容',
      connecting: '连接中...',
      preparingContent: '正在准备您的内容...',
      waitingFileData: '等待文件数据...',
      waitingTextContent: '等待文本内容...',
      connectedReceiving: '已连接。正在接收数据...',
      receivingFiles: '正在接收文件...',
      fileReady: '文件就绪。请使用下方按钮下载。',
      filesReady: '个文件就绪。请使用下方按钮下载。',
      textReceived: '文本已接收。',
      receiving: '接收中...',
      ready: '就绪',
      download: '下载',
      downloadFile: '下载文件',
      copyText: '复制文本',
      textCopied: '文本已复制到剪贴板。',
      unableToCopy: '无法自动复制文本，请手动复制。',
      youAreReceiving: '您正在接收',
      file: '个文件',
      files: '个文件',
      thisTextShared: '以下文本已与您分享：',
      keepWindowOpen: '请保持此窗口打开直到传输完成。',
      connectionError: '连接错误。请重新加载页面。',
      connectionClosed: '连接已关闭',
      unableToLoadContent: '无法加载内容',
      invalidShareLink: '无效的分享链接。请检查网址。',
      sessionNotFound: '此分享链接已不再可用。',
      unableToLoad: '无法加载分享的内容。',
      unsupportedContentType: '不支持的内容类型。',
      
      // Errors
      pleaseSelectFile: '请选择图片或视频文件。',
      pleaseEnterText: '请输入一些要分享的文本。',
      failedToCreateLink: '创建分享链接失败。',
      fileSizeExceeds: '总文件大小超过 50 MB 限制。',
      
      // Clipboard prompts
      copyToClipboard: '是否要将文本内容复制到剪贴板？',
      copiedToClipboard: '文本已复制到剪贴板。',
      unableToCopyManual: '无法自动复制，请使用下方按钮手动复制。',
      
      // Passphrase
      passphraseLabel: '密码短语（选填）：',
      passphrasePlaceholder: '输入密码短语以保护分享的数据',
      passphraseHint: '接收者需要输入此密码短语才能访问分享的内容。',
      passphraseRequired: '此分享内容受密码短语保护。请输入密码短语以继续：',
      submitPassphrase: '提交',
      passphraseEmpty: '请输入密码短语。',
      passphraseIncorrect: '密码短语错误。请重试。',
      passphraseLocked: '错误次数过多（最多 5 次），此分享已被锁定或删除。',
      openOnceLabel: '仅限打开一次（首次传输完成后自动删除）',
      openOnceHint: '接收者关闭传输后，此 Session 会被自动删除。',
      sessionAlreadyOpened: '此分享链接已被使用，无法再次访问。',
      sectionHostSend: '主机 ▶ 发送给他人',
      sectionHostSendDesc: '创建链接/QR 让他人下载你的文件或文字。',
      sectionHostReceive: '主机 ▶ 接收他人上传',
      sectionHostReceiveDesc: '创建链接/QR 让他人上传文件或文字给你。',
      receiveUploads: '接收上传',
      receiveUploadsDesc: '创建链接/QR 让他人上传文件或文本给你。',
      uploadToReceiver: '上传内容给接收者',
      uploadContent: '上传内容',
      uploadInstructions: '输入您的名称（可省略），并上传文本或文件给接收者。',
      uploaderName: '您的名称（可省略）',
      upload: '上传',
      uploadSuccess: '上传成功。',
      incomingUploads: '已收到的上传',
      refresh: '刷新',
      maxConnections: '允许的最大上传数（客户端）',
      chunksForFile: '个分块（第 {0} 个文件）',
      noUploads: '还没有上传。',
      anonymous: '匿名',
    },
  },
  
  init() {
    // Load saved language preference
    const savedLang = localStorage.getItem('syncbetween_lang');
    if (savedLang && this.translations[savedLang]) {
      this.currentLang = savedLang;
    } else {
      // Try to detect browser language
      const browserLang = navigator.language || navigator.userLanguage;
      if (browserLang.startsWith('zh')) {
        if (browserLang.includes('TW') || browserLang.includes('HK')) {
          this.currentLang = 'zh-TW';
        } else {
          this.currentLang = 'zh-CN';
        }
      }
    }
    this.updateDocumentLang();
  },
  
  setLang(lang) {
    if (this.translations[lang]) {
      this.currentLang = lang;
      localStorage.setItem('syncbetween_lang', lang);
      this.updateDocumentLang();
      return true;
    }
    return false;
  },
  
  updateDocumentLang() {
    document.documentElement.lang = this.currentLang === 'zh-CN' ? 'zh-CN' : 
                                     this.currentLang === 'zh-TW' ? 'zh-TW' : 'en';
  },
  
  t(key, ...args) {
    const translation = this.translations[this.currentLang]?.[key] || 
                        this.translations.en[key] || 
                        key;
    
    // Simple placeholder replacement
    if (args.length > 0) {
      return translation.replace(/\{(\d+)\}/g, (match, index) => {
        return args[parseInt(index, 10)] || match;
      });
    }
    
    return translation;
  },
  
  getLangName(lang) {
    const names = {
      'en': 'English',
      'zh-TW': '繁體中文',
      'zh-CN': '简体中文',
    };
    return names[lang] || lang;
  },
};

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => i18n.init());
} else {
  i18n.init();
}

