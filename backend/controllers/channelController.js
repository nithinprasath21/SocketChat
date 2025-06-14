const { getChannelList } = require('../services/channelService');

const healthCheck = (req, res) => {
  res.json({ 
    message: 'Chat Server is running!', 
    timestamp: new Date().toISOString(),
    activeChannels: Array.from(getChannelList().keys()),
    connectedUsers: getChannelList().size
  });
};

const getChannels = (req, res) => {
  const channelList = Array.from(getChannelList().keys()).map(name => ({
    name,
    userCount: getChannelList().get(name).users.size,
    messageCount: getChannelList().get(name).messages.length
  }));
  res.json(channelList);
};

module.exports = { healthCheck, getChannels };