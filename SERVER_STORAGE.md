# Shared Storage Service

## Overview

The shared storage service exposes a lightweight REST API that persists application state
to JSON files. All clients pointing at the same service share the same data, which lets
small groups stay in sync when using the hosted application. The following payloads are
persisted:

- `auctionator-data.json` – parsed Auctionator price history.
- `item-name-cache.json` – resolved item ID ↔ name pairs.
- `server-info.json` – last selected realm/faction.
- `user-preferences.json` – persistent UI preferences (currently selected profession, etc.).

## Running the storage service locally

1. Install dependencies if you have not already: `npm install`.
2. Start the storage server alongside the React dev server:
   - `npm run server` (listens on `http://localhost:3001/api` by default).
   - `npm start` in a separate terminal for the web application.

The server writes JSON files to `server/data/`. The directory is created automatically if it
does not exist.

## Client configuration

Set the following environment variables before building or starting the React application:

```env
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_ENABLE_SHARED_STORAGE=true
```

When `REACT_APP_ENABLE_SHARED_STORAGE` is `true`, the client will:

- Load Auctionator prices, item-name cache, and user preferences from the shared files.
- Push fresh imports to the shared store after parsing new `Auctionator.lua` files.
- Persist preference changes (e.g., selected profession/realm) to the shared files.
- Clear the shared price cache when the user removes imported Auctionator data.

If the server cannot be reached, operations log a warning/error to the console and continue
with in-memory defaults.

## Deploying to another host

- Set the `PORT` environment variable to change the listen port.
- Set `DATA_DIR` to choose a custom directory for persisted JSON files.
- Use `CORS_ORIGIN` to restrict which frontends may access the API. By default every origin
  is allowed, which is convenient for LAN use but not recommended for public hosting.

Remember to update `REACT_APP_API_URL` in the frontend environment to point at the deployed
server address (for example `https://tradefury.example.com/api`). The client only needs HTTP
access to the `/api/storage/:key` endpoints exposed by the storage service.
