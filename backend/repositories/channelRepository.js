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

const getChannels = () => channels;
const getUsers = () => users;
const getSocketToUser = () => socketToUser;

const initializeChannel = (channelName) => {
  channels.set(channelName, {
    users: new Set(),
    messages: []
  });
};

const addChannelMessage = (channelName, message) => {
  const channel = channels.get(channelName);
  if (channel) {
    channel.messages.push(message);
    
    if (channel.messages.length > 20) {
      channel.messages = channel.messages.slice(-20);
    }
  }
};

module.exports = { getChannels, getUsers, getSocketToUser, initializeChannel, addChannelMessage };