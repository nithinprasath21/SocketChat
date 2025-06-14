const { handleUserConnect, handleJoinChannel, handleVoiceOffer, handleVoiceAnswer, handleGetChannels, handleRenameChannel, handleDeleteChannel, handleLeaveChannel, handleSendMessage, handleEditMessage, handleDeleteMessage, handleDisconnect } = require('../services/socketService');

const setupSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);

    socket.on('user_connect_request', (data) => handleUserConnect(socket, data));
    socket.on('join_channel', (data) => handleJoinChannel(socket, io, data));
    socket.on('voice-offer', ({ channel, from, offer }) => handleVoiceOffer(socket, channel, from, offer));
    socket.on('voice-answer', ({ channel, from, answer }) => handleVoiceAnswer(socket, channel, from, answer));
    socket.on('get_channels', () => handleGetChannels(socket));
    socket.on('rename_channel', (data, callback) => handleRenameChannel(socket, io, data, callback));
    socket.on('delete_channel', (data, callback) => handleDeleteChannel(socket, io, data, callback));
    socket.on('leave_channel', (data) => handleLeaveChannel(socket, data));
    socket.on('send_message', (data) => handleSendMessage(socket, io, data));
    socket.on('edit_message', (data, callback) => handleEditMessage(socket, io, data, callback));
    socket.on('delete_message', (data, callback) => handleDeleteMessage(socket, io, data, callback));
    socket.on('disconnect', () => handleDisconnect(socket, io));
    socket.on('error', (error) => console.error(`Socket error for ${socket.id}:`, error));
  });
};

module.exports = { setupSocket };