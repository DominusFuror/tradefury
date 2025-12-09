# Server-Based Storage

## Overview

The application uses a Node.js server for persistent storage of Auctionator price data.  All users accessing the application share the same data store, enabling collaboration and data sharing.

### Stored Data

- `auctionator-data.json` – Parsed Auctionator price history with timestamps
- `item-name-cache.json` – Resolved item ID ↔ name mappings
- `server-info.json` – Last selected realm/faction
- `user-preferences.json` – UI preferences (selected profession, etc.)
- `uploads.log` – Upload activity log (timestamp, IP, file size, record count)

## Architecture

### Development Mode
```
┌─────────────────┐
│  React App      │  Port 3000
│  (npm start)    │
└────────┬────────┘
         │ Proxy: /api → localhost:3001
         ▼
┌─────────────────┐
│  Node.js Server │  Port 3001
│  (npm run server)│
└────────┬────────┘
         │ File System
         ▼
┌─────────────────┐
│  server/data/   │
│  - auctionator-data.json
│  - uploads.log
│  - ...
└─────────────────┘
```

### Production Mode
- Server runs on a single port (e.g., 3000)
- Serves both API endpoints and static React files
- Uses PM2 or similar for process management
- LocalTunnel or reverse proxy for public access

## Running Locally

### Prerequisites
```bash
npm install
```

### Start Development Servers

**Terminal 1 - API Server:**
```bash
npm run server
```
Server will listen on `http://localhost:3001`

**Terminal 2 - React App:**
```bash
npm start
```
App will open on `http://localhost:3000` with automatic proxy to port 3001

## Configuration

### Environment Variables

Create a `.env` file (optional):

```env
# React app
REACT_APP_API_URL=/api              # Uses proxy in dev, absolute path in prod

# Server
PORT=3001                            # API server port
DATA_DIR=./server/data              # Data storage directory
CORS_ORIGIN=*                        # CORS policy (use specific origin in prod)
BODY_LIMIT=5mb                       # Max request body size
```

### Proxy Configuration

The React app uses a proxy during development (configured in `package.json`):

```json
{
  "proxy": "http://localhost:3001"
}
```

This allows the frontend to make requests to `/api/storage/...` without CORS issues.

## API Endpoints

### GET /api/health
Health check endpoint.

**Response:**
```json
{"status": "ok"}
```

### GET /api/storage/:key
Retrieve stored data for a key.

**Example:**
```bash
curl http://localhost:3001/api/storage/auctionator-data
```

**Response:** JSON payload or 204 No Content if empty

### PUT /api/storage/:key
Store data for a key.

**Example:**
```bash
curl -X PUT http://localhost:3001/api/storage/auctionator-data \
  -H "Content-Type: application/json" \
  -d '{"itemPrices": {...}, "source": "Auctionator.lua", "importedAt": "2025-12-02T20:00:00Z"}'
```

**Response:** 204 No Content

**Logging:** When storing `auctionator-data`, the server logs:
- Timestamp
- Client IP address
- File size (bytes)
- Number of records
- Source file name

### DELETE /api/storage/:key
Delete stored data for a key.

**Example:**
```bash
curl -X DELETE http://localhost:3001/api/storage/auctionator-data
```

**Response:** 204 No Content

## Data Flow

### Upload Flow
1. User selects `Auctionator.lua` file
2. Frontend parses file and extracts price data
3. Frontend sends `PUT /api/storage/auctionator-data` with parsed data
4. Server writes to `server/data/auctionator-data.json`
5. Server logs upload to `server/data/uploads.log`
6. Data becomes available to all users

### Load Flow
1. User opens application
2. Frontend sends `GET /api/storage/auctionator-data`
3. Server reads from `server/data/auctionator-data.json`
4. Frontend displays prices and history

### Refresh Flow
1. User clicks "Refresh" button
2. Frontend sends `GET /api/storage/auctionator-data`
3. Server returns latest data
4. Frontend updates UI without page reload

## Logs

### Upload Logs

Location: `server/data/uploads.log`

Format:
```
[2025-12-02T18:22:06.057Z] IP: 127.0.0.1 | File: auctionator-data | Size: 564437 bytes | Records: 5289 | Source: Auctionator_old.lua
[2025-12-02T18:22:56.772Z] IP: 127.0.0.1 | File: auctionator-data | Size: 1178771 bytes | Records: 5942 | Source: Auctionator_new.lua
```

**View logs:**
```bash
# Last 10 entries
tail -n 10 server/data/uploads.log

# Live monitoring
tail -f server/data/uploads.log

# Count total uploads
wc -l server/data/uploads.log
```

## Deployment

### VPS Deployment

1. **Build React app:**
   ```bash
   npm run build
   ```

2. **Start server with PM2:**
   ```bash
   pm2 start server/index.js --name tradefury-server
   pm2 save
   ```

3. **Configure proxy/tunnel:**
   - Use nginx as reverse proxy, OR
   - Use LocalTunnel: `lt --port 3001 --subdomain tradefury`

4. **Set environment variables:**
   ```bash
   export REACT_APP_API_URL=https://tradefury.example.com/api
   export CORS_ORIGIN=https://tradefury.example.com
   ```

### CI/CD Integration

Automated deployment configuration depends on your specific hosting environment.

## Troubleshooting

### Server not starting
```bash
# Check if port 3001 is already in use
lsof -i :3001  # macOS/Linux
netstat -ano | findstr :3001  # Windows

# Kill existing process
kill -9 <PID>
```

### CORS errors
- Ensure proxy is configured in `package.json`
- Check `CORS_ORIGIN` environment variable
- Verify both servers are running

### Data not persisting
- Check `server/data/` directory exists
- Verify server has write permissions
- Check server logs for errors

### Cannot connect to server
- Verify server is running: `curl http://localhost:3001/api/health`
- Check firewall settings
- Ensure correct port in React proxy configuration

## Security Considerations

- **CORS:** Set specific `CORS_ORIGIN` in production (not `*`)
- **File uploads:** Current implementation trusts all uploads
- **Rate limiting:** Consider adding rate limits for production
- **Authentication:** No authentication currently implemented
- **Input validation:** Server validates JSON but not content

## Future Improvements

- Database backend (PostgreSQL, MongoDB)
- User authentication and authorization
- Rate limiting and DDoS protection
- Backup and restore functionality
- Multi-region replication
- WebSocket support for real-time updates
