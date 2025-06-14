const { getChannels, getUsers, getSocketToUser, initializeChannel } = require('../repositories/channelRepository');
const { getChannelUsers, addMessageToChannel } = require('./channelService');

const handleUserConnect = (socket, { username }) => {
  if (!username || username.trim() === '') {
    socket.emit('error', { message: 'Username is required' });
    return;
  }

  const existingUser = Array.from(getSocketToUser().values()).find(name => 
    name.toLowerCase() === username.toLowerCase()
  );

  if (existingUser) {
    socket.emit('error', { message: 'Username already taken' });
    return;
  }

  getUsers().set(socket.id, { username: username.trim(), channels: new Set() });
  getSocketToUser().set(socket.id, username.trim());

  socket.emit('user_connected', { 
    username: username.trim(),
    availableChannels: Array.from(getChannels().keys())
  });
  console.log(`User ${username} connected with socket ${socket.id}`);
};

const handleJoinChannel = (socket, io, { channelName }) => {
  const user = getUsers().get(socket.id);
  
  if (!user) {
    socket.emit('error', { message: 'User not authenticated' });
    return;
  }

  if (!channelName || channelName.trim() === '') {
    socket.emit('error', { message: 'Channel name is required' });
    return;
  }

  const trimmedChannelName = channelName.trim();

  if (!getChannels().has(trimmedChannelName)) {
    initializeChannel(trimmedChannelName);
  }

  user.channels.forEach(oldChannel => {
    socket.leave(oldChannel);
    const oldChannelData = getChannels().get(oldChannel);
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

  const channel = getChannels().get(trimmedChannelName);
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
};

const handleVoiceOffer = (socket, channel, from, offer) => {
  socket.to(channel).emit('receive-voice-offer', { from, offer });
};

const handleVoiceAnswer = (socket, channel, from, answer) => {
  socket.to(channel).emit('receive-voice-answer', { from, answer });
};

const handleGetChannels = (socket) => {
  socket.emit('channels_list', { channels: Array.from(getChannels().keys()) });
};

const handleRenameChannel = (socket, io, { oldName, newName }, callback) => {
  if (!oldName || !newName || oldName === newName) {
    return callback?.({ error: 'Invalid channel names' });
  }

  const trimmedOld = oldName.trim();
  const trimmedNew = newName.trim().toLowerCase().replace(/\s+/g, '-');

  if (!getChannels().has(trimmedOld)) {
    return callback?.({ error: 'Channel does not exist' });
  }

  if (getChannels().has(trimmedNew)) {
    return callback?.({ error: 'New channel name already exists' });
  }

  const oldChannelData = getChannels().get(trimmedOld);

  getChannels().set(trimmedNew, {
    users: new Set(oldChannelData.users),
    messages: [...oldChannelData.messages]
  });
  getChannels().delete(trimmedOld);

  getUsers().forEach((userData, socketId) => {
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

  io.emit('channels_list', { channels: Array.from(getChannels().keys()) });

  return callback?.({ success: true });
};

const handleDeleteChannel = (socket, io, { channelName }, callback) => {
  if (!channelName || !getChannels().has(channelName)) {
    return callback?.({ error: 'Channel does not exist' });
  }

  const usersToNotify = getChannels().get(channelName).users;

  getChannels().delete(channelName);

  getUsers().forEach((userData) => {
    userData.channels.delete(channelName);
  });

  usersToNotify.forEach((socketId) => {
    const s = io.sockets.sockets.get(socketId);
    if (s) {
      s.leave(channelName);
      s.emit('channel_deleted', { channelName });
    }
  });

  io.emit('channels_list', { channels: Array.from(getChannels().keys()) });

  return callback?.({ success: true });
};

const handleLeaveChannel = (socket, { channelName }) => {
  const user = getUsers().get(socket.id);
  
  if (!user || !channelName) return;

  const trimmedChannelName = channelName.trim();

  if (user.channels.has(trimmedChannelName)) {
    socket.leave(trimmedChannelName);
    
    user.channels.delete(trimmedChannelName);
    
    const channel = getChannels().get(trimmedChannelName);
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
};

const handleSendMessage = (socket, io, { channelName, message }) => {
  const user = getUsers().get(socket.id);
  
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
};

const handleEditMessage = (socket, io, { channelName, messageId, newText }, callback) => {
  const user = getUsers().get(socket.id);
  if (!user) {
    return callback?.({ error: 'User not authenticated' });
  }

  const channel = getChannels().get(channelName);
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
};

const handleDeleteMessage = (socket, io, { channelName, messageId }, callback) => {
  const user = getUsers().get(socket.id);
  if (!user) {
    return callback?.({ error: 'User not authenticated' });
  }

  const channel = getChannels().get(channelName);
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
};

const handleDisconnect = (socket, io) => {
  const user = getUsers().get(socket.id);

  if (user) {
    console.log(`User ${user.username} disconnected`);

    user.channels.forEach(channelName => {
      const channel = getChannels().get(channelName);
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

    getUsers().delete(socket.id);
    getSocketToUser().delete(socket.id);
  }

  console.log(`Client disconnected: ${socket.id}`);
};

module.exports = {
  handleUserConnect,
  handleJoinChannel,
  handleVoiceOffer,
  handleVoiceAnswer,
  handleGetChannels,
  handleRenameChannel,
  handleDeleteChannel,
  handleLeaveChannel,
  handleSendMessage,
  handleEditMessage,
  handleDeleteMessage,
  handleDisconnect
};