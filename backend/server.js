const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();
const app = express();
const server = http.createServer(app);
const { setupSocket } = require('./controllers/socketController');
const { healthCheck, getChannels } = require('./controllers/channelController');

const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json());

app.get('/', healthCheck);
app.get('/channels', getChannels);

setupSocket(io);

const PORT = process.env.PORT;
server.listen(PORT, () => {
  console.log(`Available at: http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
  });
});