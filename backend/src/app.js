const express = require('express');
const cors = require('cors');
const compression = require('compression');
const customerRoutes = require('./routes/customerRoutes');
const staffRoutes = require('./routes/staffRoutes');
const storeRoutes = require('./routes/storeRoutes');

const app = express();

// Enable gzip compression for all HTTP responses
app.use(compression());

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// REST API Endpoints (Section 7)
app.use('/api/v1/queue', customerRoutes);
app.use('/api/v1/staff', staffRoutes);
app.use('/api/v1/stores', storeRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.path}` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[App Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

module.exports = app;
