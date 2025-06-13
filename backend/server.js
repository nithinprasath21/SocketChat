const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();
const app = express();
const server = http.createServer(app);

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

const users = new Map();
const channels = new Map();
const socketToUser = new Map();

const defaultChannels = ['general', 'random', 'tech'];
defaultChannels.forEach(channelName => {
  channels.set(channelName, {
    users: new Set(),
    messages: []
  });
});

function getChannelUsers(channelName) {
  const channel = channels.get(channelName);
  if (!channel) return [];
  
  return Array.from(channel.users).map(socketId => ({
    socketId,
    username: socketToUser.get(socketId) || 'Unknown'
  }));
}

function addMessageToChannel(channelName, message) {
  const channel = channels.get(channelName);
  if (channel) {
    channel.messages.push({
      ...message,
      timestamp: new Date().toISOString()
    });
    
    if (channel.messages.length > 20) {
      channel.messages = channel.messages.slice(-20);
    }
  }
}

app.get('/', (req, res) => {
  res.json({ 
    message: 'Chat Server is running!', 
    timestamp: new Date().toISOString(),
    activeChannels: Array.from(channels.keys()),
    connectedUsers: users.size
  });
});

app.get('/channels', (req, res) => {
  const channelList = Array.from(channels.keys()).map(name => ({
    name,
    userCount: channels.get(name).users.size,
    messageCount: channels.get(name).messages.length
  }));
  res.json(channelList);
});

io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);
  
  socket.on('user_connect_request', (data) => {
    const { username } = data;
    
    if (!username || username.trim() === '') {
      socket.emit('error', { message: 'Username is required' });
      return;
    }
    
    const existingUser = Array.from(socketToUser.values()).find(name => 
      name.toLowerCase() === username.toLowerCase()
    );
    
    if (existingUser) {
      socket.emit('error', { message: 'Username already taken' });
      return;
    }
    
    users.set(socket.id, { username: username.trim(), channels: new Set() });
    socketToUser.set(socket.id, username.trim());
    
    socket.emit('user_connected', { 
      username: username.trim(),
      availableChannels: Array.from(channels.keys())
    });
    console.log(`User ${username} connected with socket ${socket.id}`);
  });
  
  socket.on('join_channel', (data) => {
    const { channelName } = data;
    const user = users.get(socket.id);
    
    if (!user) {
      socket.emit('error', { message: 'User not authenticated' });
      return;
    }
    
    if (!channelName || channelName.trim() === '') {
      socket.emit('error', { message: 'Channel name is required' });
      return;
    }
    
    const trimmedChannelName = channelName.trim();
    
    if (!channels.has(trimmedChannelName)) {
      channels.set(trimmedChannelName, {
        users: new Set(),
        messages: []
      });
    }
    
    user.channels.forEach(oldChannel => {
      socket.leave(oldChannel);
      const oldChannelData = channels.get(oldChannel);
      if (oldChannelData) {
        oldChannelData.users.delete(socket.id);
        socket.to(oldChannel).emit('user_left', {
          username: user.username,
          channelName: oldChannel
        });
        socket.to(oldChannel).emit('channel_users_update', {
          channelName: oldChannel,
          users: getChannelUsers(oldChannel)
        });
      }
    });
    
    user.channels.clear();
    user.channels.add(trimmedChannelName);
    
    socket.join(trimmedChannelName);
    
    const channel = channels.get(trimmedChannelName);
    channel.users.add(socket.id);
    
    socket.emit('channel_history', {
      channelName: trimmedChannelName,
      messages: channel.messages
    });
    
    socket.to(trimmedChannelName).emit('user_joined', {
      username: user.username,
      channelName: trimmedChannelName
    });
    
    io.to(trimmedChannelName).emit('channel_users_update', {
      channelName: trimmedChannelName,
      users: getChannelUsers(trimmedChannelName)
    });
    
    socket.emit('channel_joined', {
      channelName: trimmedChannelName,
      users: getChannelUsers(trimmedChannelName)
    });
    
    console.log(`User ${user.username} joined channel ${trimmedChannelName}`);
  });

  socket.on('voice-offer', ({ channel, from, offer }) => {
    socket.to(channel).emit('receive-voice-offer', { from, offer });
  });

  socket.on('voice-answer', ({ channel, from, answer }) => {
    socket.to(channel).emit('receive-voice-answer', { from, answer });
  });

  socket.on('get_channels', () => {
    socket.emit('channels_list', { channels: Array.from(channels.keys()) });
  });
  
  socket.on('rename_channel', (data, callback) => {
    const { oldName, newName } = data;

    if (!oldName || !newName || oldName === newName) {
      return callback?.({ error: 'Invalid channel names' });
    }

    const trimmedOld = oldName.trim();
    const trimmedNew = newName.trim().toLowerCase().replace(/\s+/g, '-');

    if (!channels.has(trimmedOld)) {
      return callback?.({ error: 'Channel does not exist' });
    }

    if (channels.has(trimmedNew)) {
      return callback?.({ error: 'New channel name already exists' });
    }

    const oldChannelData = channels.get(trimmedOld);

    channels.set(trimmedNew, {
      users: new Set(oldChannelData.users),
      messages: [...oldChannelData.messages]
    });
    channels.delete(trimmedOld);

    users.forEach((userData, socketId) => {
      if (userData.channels.has(trimmedOld)) {
        userData.channels.delete(trimmedOld);
        userData.channels.add(trimmedNew);
      }

      const s = io.sockets.sockets.get(socketId);
      if (s) {
        s.leave(trimmedOld);
        s.join(trimmedNew);
      }
    });

    io.to(trimmedNew).emit('channel_users_update', {
      channelName: trimmedNew,
      users: getChannelUsers(trimmedNew)
    });

    io.emit('channels_list', { channels: Array.from(channels.keys()) });

    return callback?.({ success: true });
  });

  socket.on('delete_channel', (data, callback) => {
    const { channelName } = data;

    if (!channelName || !channels.has(channelName)) {
      return callback?.({ error: 'Channel does not exist' });
    }

    const usersToNotify = channels.get(channelName).users;

    channels.delete(channelName);

    users.forEach((userData) => {
      userData.channels.delete(channelName);
    });

    usersToNotify.forEach((socketId) => {
      const s = io.sockets.sockets.get(socketId);
      if (s) {
        s.leave(channelName);
        s.emit('channel_deleted', { channelName });
      }
    });

    io.emit('channels_list', { channels: Array.from(channels.keys()) });

    return callback?.({ success: true });
  });

  socket.on('leave_channel', (data) => {
    const { channelName } = data;
    const user = users.get(socket.id);
    
    if (!user || !channelName) return;
    
    const trimmedChannelName = channelName.trim();
    
    if (user.channels.has(trimmedChannelName)) {
      socket.leave(trimmedChannelName);
      
      user.channels.delete(trimmedChannelName);
      
      const channel = channels.get(trimmedChannelName);
      if (channel) {
        channel.users.delete(socket.id);
        
        socket.to(trimmedChannelName).emit('user_left', {
          username: user.username,
          channelName: trimmedChannelName
        });
        
        socket.to(trimmedChannelName).emit('channel_users_update', {
          channelName: trimmedChannelName,
          users: getChannelUsers(trimmedChannelName)
        });
      }
      
      console.log(`User ${user.username} left channel ${trimmedChannelName}`);
    }
  });
  
  socket.on('send_message', (data) => {
    const { channelName, message } = data;
    const user = users.get(socket.id);
    
    if (!user) {
      socket.emit('error', { message: 'User not authenticated' });
      return;
    }
    
    if (!channelName || !message || message.trim() === '') {
      socket.emit('error', { message: 'Channel and message are required' });
      return;
    }
    
    const trimmedChannelName = channelName.trim();
    const trimmedMessage = message.trim();
    
    if (!user.channels.has(trimmedChannelName)) {
      socket.emit('error', { message: 'You are not in this channel' });
      return;
    }
    
    const messageData = {
      id: `${socket.id}-${Date.now()}`,
      username: user.username,
      message: trimmedMessage,
      channelName: trimmedChannelName,
      timestamp: new Date().toISOString()
    };
    
    addMessageToChannel(trimmedChannelName, messageData);
    
    io.to(trimmedChannelName).emit('message', messageData);
    
    console.log(`Message from ${user.username} in ${trimmedChannelName}: ${trimmedMessage}`);
  });

  socket.on('edit_message', ({ channelName, messageId, newText }, callback) => {
    const user = users.get(socket.id);
    if (!user) {
      return callback?.({ error: 'User not authenticated' });
    }

    const channel = channels.get(channelName);
    if (!channel) {
      return callback?.({ error: 'Channel does not exist' });
    }

    const messageIndex = channel.messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) {
      return callback?.({ error: 'Message not found' });
    }

    const message = channel.messages[messageIndex];
    if (message.username !== user.username) {
      return callback?.({ error: 'Permission denied: Cannot edit others’ messages' });
    }

    message.message = newText;
    message.edited = true;

    io.to(channelName).emit('message_edited', {
      messageId,
      newText,
      channelName,
      editedAt: new Date().toISOString()
    });

    return callback?.({ success: true });
  });

  socket.on('delete_message', ({ channelName, messageId }, callback) => {
    const user = users.get(socket.id);
    if (!user) {
      return callback?.({ error: 'User not authenticated' });
    }

    const channel = channels.get(channelName);
    if (!channel) {
      return callback?.({ error: 'Channel does not exist' });
    }

    const messageIndex = channel.messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) {
      return callback?.({ error: 'Message not found' });
    }

    const message = channel.messages[messageIndex];
    if (message.username !== user.username) {
      return callback?.({ error: "Permission denied: Cannot delete others' messages" });
    }

    channel.messages.splice(messageIndex, 1);

    io.to(channelName).emit('message_deleted', {
      messageId,
      channelName
    });

    return callback?.({ success: true });
  });
  
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    
    if (user) {
      console.log(`User ${user.username} disconnected`);
      
      user.channels.forEach(channelName => {
        const channel = channels.get(channelName);
        if (channel) {
          channel.users.delete(socket.id);
          
          socket.to(channelName).emit('user_left', {
            username: user.username,
            channelName
          });
          
          socket.to(channelName).emit('channel_users_update', {
            channelName,
            users: getChannelUsers(channelName)
          });
        }
      });
      
      users.delete(socket.id);
      socketToUser.delete(socket.id);
    }
    
    console.log(`Client disconnected: ${socket.id}`);
  });
  
  socket.on('error', (error) => {
    console.error(`Socket error for ${socket.id}:`, error);
  });
});

const PORT = process.env.PORT;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Available at: http://localhost:${PORT}`);
  console.log(`Default channels: ${defaultChannels.join(', ')}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
  });
});