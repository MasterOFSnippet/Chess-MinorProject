const express = require('express');
const http = require('http'); // ADDED: Need HTTP server for Socket.IO
const { Server } = require('socket.io'); // ADDED
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const socketHandler = require('./socket/socketHandler'); // ADDED

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// CREATE HTTP SERVER (NEEDED FOR SOCKET.IO)

// Why? Socket.IO needs access to the underlying HTTP server
const server = http.createServer(app);

// INITIALIZE SOCKET.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  },
  // Performance optimizations
  pingTimeout: 60000, // 60 seconds before considering connection dead
  pingInterval: 25000, // Send ping every 25 seconds
  upgradeTimeout: 30000, // 30 seconds to upgrade to WebSocket
  maxHttpBufferSize: 1e6, // 1MB max message size
  // Connection options
  transports: ['websocket', 'polling'], // Prefer WebSocket, fallback to polling
  allowEIO3: true // Backward compatibility
});

// Make io accessible in routes (for emitting from REST endpoints)
app.set('io', io);

// Initialize Socket.IO event handlers
socketHandler(io);
console.log('✅ Socket.IO initialized');

// EXPRESS MIDDLEWARE
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// REST API ROUTES
app.use('/api/auth', require('./routes/auth'));
app.use('/api/game', require('./routes/game'));
app.use('/api/users', require('./routes/user'));
app.use('/api/messages', require('./routes/messages')); 
app.use('/api/feedback', require('./routes/feedback'));

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Server is running!',
    socket: io.engine.clientsCount + ' clients connected'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.url}`
  });
});

// Error handler middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server Error'
  });
});

const PORT = process.env.PORT || 5000;

// IMPORTANT: Listen on 'server', not 'app'
server.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`🔌 Socket.IO ready for connections`);
});