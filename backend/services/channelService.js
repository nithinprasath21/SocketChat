const { getChannels, getUsers, getSocketToUser, addChannelMessage } = require('../repositories/channelRepository');

const getChannelUsers = (channelName) => {
  const channel = getChannels().get(channelName);
  if (!channel) return [];
  
  return Array.from(channel.users).map(socketId => ({
    socketId,
    username: getSocketToUser().get(socketId) || 'Unknown'
  }));
};

const addMessageToChannel = (channelName, message) => {
  addChannelMessage(channelName, {
    ...message,
    timestamp: new Date().toISOString()
  });
};

const getChannelList = () => getChannels();

module.exports = { getChannelUsers, addMessageToChannel, getChannelList };