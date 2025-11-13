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

## Limitations

- Maximum file size: 50 MB
- Sessions expire after 1 hour (not yet implemented, but recommended)
- Data is stored in memory (not persistent across server restarts)
- No authentication (anyone with the link can access)

## Security Notes

- This application is designed for local/trusted network use
- For production use, consider adding:
  - Authentication/authorization
  - Rate limiting
  - File type validation
  - Session expiration cleanup
  - HTTPS/WSS encryption

## License

ISC
