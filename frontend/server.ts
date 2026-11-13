import express from 'express';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';

// Health check endpoint for Cloud Run container lifecycle checks
app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

const distDir = path.resolve(import.meta.dirname, 'dist');
const indexHtml = path.resolve(distDir, 'index.html');

// Serve static assets from the Vite production build if present
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir, { maxAge: '1d' }));

  // Fallback to index.html for SPA client-side routing
  app.get('*', (_req, res) => {
    res.sendFile(indexHtml);
  });
} else {
  // If dist does not exist yet (e.g. initial dev run)
  app.get('*', (_req, res) => {
    res.status(200).send('SmileJourneyAI server running. Please run npm run build to compile assets.');
  });
}

const server = app.listen(PORT, HOST, () => {
  console.log(`SmileJourneyAI production server listening on http://${HOST}:${PORT}`);
});

// Graceful shutdown for Cloud Run container termination signals
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing HTTP server...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing HTTP server...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});
