import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend Vite dev server & production origin
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Root Landing Endpoint (Shows API status for Vercel / health probes)
app.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Rentora Backend API',
    version: '1.0.0',
    description: 'Smart Contract-Based Rental Agreement Platform',
    endpoints: {
      health: '/api/health',
      agreements: '/api/agreements',
      transactions: '/api/transactions',
      auth: '/api/auth'
    },
    timestamp: new Date().toISOString()
  });
});

// API Base Endpoint
app.get('/api', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Rentora Backend API',
    version: '1.0.0',
    health: '/api/health'
  });
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Rentora Backend API',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api', apiRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: 'Unexpected server error occurred' });
});

// Only listen on port when not running as a Vercel serverless function
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[Rentora Backend] Server running on http://localhost:${PORT}`);
  });
}

export default app;

