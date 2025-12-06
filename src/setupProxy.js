const express = require('express');
const path = require('path');

module.exports = function (app) {
    // Proxy /db/ requests to serve CSV files with proper cache headers in development
    const dbPath = path.join(__dirname, '..', 'public', 'db');

    app.use('/db', express.static(dbPath, {
        maxAge: 172800000, // 2 days in milliseconds
        etag: true,
        lastModified: true,
        immutable: false,
        setHeaders: (res, filePath) => {
            res.setHeader('Cache-Control', 'public, max-age=172800, must-revalidate');
        }
    }));

    console.log('[setupProxy] CSV files will be served with 2-day cache from:', dbPath);
};
