const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { 
  SERVER_TIMEOUT, 
  RATE_LIMIT_WINDOW_MS, 
  RATE_LIMIT_MAX_REQUESTS, 
  BODY_LIMIT 
} = require('./config/timeouts');
// Load environment variables
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const documentationRoutes = require('./routes/documentation');
const imageRoutes = require('./routes/images');

const app = express();
const PORT = process.env.PORT || 5000;

// Configure UTF-8 encoding
app.set('charset', 'utf-8');

// Increase timeout for AI operations
const server = require('http').createServer(app);
server.timeout = SERVER_TIMEOUT; // Server timeout from configuration

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [''] 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || RATE_LIMIT_WINDOW_MS,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware with UTF-8 encoding
app.use(express.json({ 
  limit: BODY_LIMIT,
  charset: 'utf-8'
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: BODY_LIMIT,
  charset: 'utf-8'
}));

// Set UTF-8 encoding for all responses
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Static files (for uploaded images)
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/documentation', documentationRoutes);
app.use('/api/images', imageRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

server.listen(PORT, () => {
  console.log(`🚀 PhosDocs Backend running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`⏱️  Server timeout: ${SERVER_TIMEOUT / 1000} seconds`);
});