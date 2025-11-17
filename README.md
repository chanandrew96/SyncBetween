# SyncBetween

A web application that helps users share data (images, videos, and text) between different devices using WebSocket connections and QR codes.

## Features

- **File Sharing**: Select images or videos from your device to create a shareable link with QR code
- **Text Sharing**: Share text content with automatic clipboard copy prompt on the receiving device
- **Real-time Transfer**: Uses WebSocket for instant data transfer between devices
- **QR Code Support**: Generate QR codes for easy access from mobile devices

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/chanandrew96/SyncBetween.git
cd SyncBetween
```

2. Install dependencies:
```bash
npm install
```

## Running the Application

### Development Mode

Start the server:
```bash
npm start
```

Or:
```bash
npm run dev
```

The server will start on port 3000 by default. You can access the application at:
- Main page: `http://localhost:3000`
- Share page: `http://localhost:3000/share/{sessionId}`

### Custom Port

To run on a different port, set the `PORT` environment variable:
```bash
# Windows PowerShell
$env:PORT=8080; npm start

# Windows CMD
set PORT=8080 && npm start

# Linux/Mac
PORT=8080 npm start
```

## Usage

### Sharing Files (Images/Videos)

1. Open the application in your browser
2. Click "Choose image or video" and select a file
3. Click "Generate Share Link"
4. A shareable link and QR code will be displayed
5. Open the link or scan the QR code from another device
6. The receiving device will automatically download or display the file

### Sharing Text

1. Open the application in your browser
2. Paste or type your text in the text area
3. Click "Generate Share Link"
4. A shareable link and QR code will be displayed
5. Open the link or scan the QR code from another device
6. The receiving device will prompt to copy the text to clipboard and display it

## Deployment

### Local Network Deployment

To make the application accessible on your local network:

1. Find your local IP address:
   - Windows: `ipconfig` (look for IPv4 Address)
   - Linux/Mac: `ifconfig` or `ip addr`

2. Start the server with your IP:
```bash
# The server will bind to all interfaces by default
npm start
```

3. Access from other devices using: `http://YOUR_IP:3000`

### Production Deployment

For production deployment, consider:

1. **Environment Variables**:
   - Set `PORT` to your desired port
   - Configure `NODE_ENV=production`

2. **Process Manager** (recommended):
   - Use PM2: `npm install -g pm2 && pm2 start server.js`
   - Or use systemd, Docker, etc.

3. **Reverse Proxy**:
   - Use Nginx or Apache as a reverse proxy
   - Configure SSL/TLS for HTTPS/WSS support

4. **Cloud Platforms**:
   - **Heroku**: Add `Procfile` with `web: node server.js`
   - **Vercel**: Configure as Node.js serverless function
   - **Railway/Render**: Deploy directly from Git repository
   - **DigitalOcean/AWS**: Use App Platform or EC2

### Example: Deploying to Heroku

1. Create a `Procfile`:
```
web: node server.js
```

2. Deploy:
```bash
heroku create
git push heroku main
```

### Example: Using PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start server.js --name syncbetween

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

## Project Structure

```
SyncBetween/
├── server.js          # Express server with WebSocket support
├── package.json        # Dependencies and scripts
├── public/
│   ├── index.html      # Main sharing page
│   ├── share.html      # Receiving page
│   ├── script.js       # Main page logic
│   ├── share.js        # Receiving page logic
│   └── styles.css      # Application styles
└── README.md          # This file
```

## API Endpoints

- `POST /api/session/file` - Create a file sharing session
- `POST /api/session/text` - Create a text sharing session
- `GET /api/session/:id` - Get session metadata
- `GET /share/:id` - Share page for receiving content
- `WS /ws?sessionId=:id` - WebSocket connection for data transfer

## 應用程式運作方式 (How the Application Works)

### 整體架構

SyncBetween 是一個基於 WebSocket 的即時檔案與文字分享應用程式，採用客戶端-伺服器架構，透過 WebSocket 實現即時資料傳輸。

### 工作流程

#### 1. **檔案分享流程**

**發送端（主頁面）：**
1. 使用者選擇一個或多個檔案（支援任何檔案類型）
2. 前端將檔案讀取為 Base64 編碼格式
3. 透過 HTTP POST 請求將檔案資料傳送到伺服器 (`/api/session/file`)
4. 伺服器建立一個唯一的 Session ID，並將檔案資料暫存在記憶體中
5. 伺服器回傳分享連結和 WebSocket URL
6. 前端顯示分享連結和 QR Code

**接收端（分享頁面）：**
1. 使用者透過分享連結或掃描 QR Code 開啟接收頁面
2. 頁面自動建立 WebSocket 連線到伺服器
3. 伺服器透過 WebSocket 串流傳輸檔案資料（以 64KB 為單位分塊傳輸）
4. 前端接收資料塊並顯示傳輸進度
5. 所有資料塊接收完成後，前端將資料重組為完整檔案
6. 使用者可以預覽（圖片/影片）或下載檔案

#### 2. **文字分享流程**

**發送端：**
1. 使用者輸入或貼上文字內容
2. 透過 HTTP POST 請求將文字傳送到伺服器 (`/api/session/text`)
3. 伺服器建立 Session 並暫存文字內容
4. 回傳分享連結和 QR Code

**接收端：**
1. 開啟分享連結後建立 WebSocket 連線
2. 伺服器透過 WebSocket 傳送文字內容
3. 前端顯示文字並提示使用者是否要複製到剪貼簿

### 技術特點

- **串流傳輸（Streaming）**：大檔案以 64KB 為單位分塊傳輸，避免記憶體溢出並提升傳輸效率
- **即時通訊**：使用 WebSocket 實現即時雙向通訊，無需輪詢
- **無檔案大小限制**：透過串流技術支援任意大小的檔案
- **多檔案支援**：單一分享連結可包含多個檔案
- **進度顯示**：接收端即時顯示檔案傳輸進度

### 資料儲存與清理

- 所有資料（檔案和文字）暫存在伺服器記憶體中
- **Session 過期時間**：每個 Session 在建立後 1 小時自動過期
- **自動清理機制**：伺服器每 5 分鐘自動檢查並刪除過期的 Session
- Session 資料在伺服器重啟後會遺失
- 當 Session 過期後，分享連結將無法再存取資料

## Limitations

- **Sessions expire after 1 hour** - Data is automatically removed 1 hour after creation
- Data is stored in memory (not persistent across server restarts)
- No authentication (anyone with the link can access)
- No file size limit (removed for better performance with streaming)

## Security Notes

- This application is designed for local/trusted network use
- For production use, consider adding:
  - Authentication/authorization
  - Rate limiting
  - File type validation
  - Session expiration cleanup (already implemented)
  - HTTPS/WSS encryption

## License

ISC
