import { useState, useEffect, useCallback } from 'react';
import ChannelList from './ChannelList';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import UserList from './UserList';
import ConnectionStatus from './ConnectionStatus';

function Chat({ socket, username, availableChannels, setAvailableChannels, connectionStatus }) {
  const [currentChannel, setCurrentChannel] = useState('');
  const [channelMessages, setChannelMessages] = useState({});
  const [channelUsers, setChannelUsers] = useState([]);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (data) => {
      setChannelMessages(prev => {
        const updated = [...(prev[data.channelName] || []), data];
        return { ...prev, [data.channelName]: updated };
      });
    };

    const handleChannelHistory = (data) => {
      setChannelMessages(prev => ({
        ...prev,
        [data.channelName]: data.messages || [],
      }));
    };

    const handleChannelsList = ({ channels }) => {
      console.log('Received updated channels:', channels);
      setAvailableChannels(channels);
    };

    const handleChannelJoined = (data) => {
      setCurrentChannel(data.channelName);
      setChannelUsers(data.users || []);
      setError('');
    };

    const handleChannelUsersUpdate = (data) => {
      if (data.channelName === currentChannel) {
        setChannelUsers(data.users || []);
      }
    };

    const handleError = (err) => {
      setError(err.message || 'An error occurred');
      setTimeout(() => setError(''), 5000);
    };

    const handleChannelsUpdate = (data) => {
      if (Array.isArray(data.channels)) {
        setAvailableChannels(data.channels);
      }
    };

    const handleChannelDeleted = ({ channelName }) => {
      setAvailableChannels(prev => {
        const updated = prev.filter(ch => ch !== channelName);
        if (currentChannel === channelName) {
          setCurrentChannel(updated[0] || '');
          if (updated[0]) handleChannelSelect(updated[0]);
        }
        return updated;
      });

      setChannelMessages(prev => {
        const updated = { ...prev };
        delete updated[channelName];
        return updated;
      });
    };

    const handleMessageEdited = ({ messageId, newText, channelName }) => {
      console.log('Editing message in channel:', channelName, 'Message ID:', messageId, 'New text:', newText);
      setChannelMessages((prev) => ({
        ...prev,
        [channelName]: prev[channelName]?.map((msg) =>
          msg.id === messageId ? { ...msg, message: newText, edited: true } : msg
        ),
      }));
    };

    const handleMessageDeleted = ({ messageId }) => {
      console.log('Deleted message received:', messageId);
      setChannelMessages((prev) => ({
        ...prev,
        [currentChannel]: prev[currentChannel]?.filter(msg => msg.id !== messageId),
      }));
    };

    socket.on('message_deleted', handleMessageDeleted);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message', handleMessage);
    socket.on('channel_history', handleChannelHistory);
    socket.on('channel_joined', handleChannelJoined);
    socket.on('channel_users_update', handleChannelUsersUpdate);
    socket.on('error', handleError);
    socket.on('channels_list', handleChannelsList);
    socket.on('channel_deleted', handleChannelDeleted);

    return () => {
      socket.off('message', handleMessage);
      socket.off('channel_history', handleChannelHistory);
      socket.off('channel_joined', handleChannelJoined);
      socket.off('channel_users_update', handleChannelUsersUpdate);
      socket.off('error', handleError);
      socket.off('channels_list', handleChannelsList);
      socket.off('channel_deleted', handleChannelDeleted);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('message_edited', handleMessageEdited);
    };
  }, [socket, currentChannel]);

  useEffect(() => {
    if (socket && availableChannels.length > 0 && !currentChannel) {
      handleChannelSelect(availableChannels[0]);
    }
  }, [socket, availableChannels, currentChannel]);

  useEffect(() => {
    localStorage.setItem('chat_history', JSON.stringify(channelMessages));
  }, [channelMessages]);

  useEffect(() => {
    const storedMessages = JSON.parse(localStorage.getItem('chat_history') || '{}');
    setChannelMessages(storedMessages);
  }, []);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen && window.innerWidth < 1024 ? 'hidden' : '';
  }, [sidebarOpen]);

  useEffect(() => {
    if (!socket) return;

    socket.emit('get_channels');
  }, [socket]);

  const handleChannelSelect = useCallback((channelName) => {
    if (!socket || !channelName) return;

    if (currentChannel && currentChannel !== channelName) {
      socket.emit('leave_channel', { channelName: currentChannel });
    }

    socket.emit('join_channel', { channelName, username });

    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [socket, currentChannel, username]);

  const handleSendMessage = useCallback((message) => {
    if (!socket || !currentChannel || !message.trim()) return;

    socket.emit('send_message', {
      channelName: currentChannel,
      message: message.trim(),
    });
  }, [socket, currentChannel]);

  const handleCreateChannel = useCallback((channelName) => {
    if (!socket || !channelName.trim()) return;
    const formattedName = channelName.trim().toLowerCase().replace(/\s+/g, '-');

    if (!availableChannels.includes(formattedName)) {
      setAvailableChannels(prev => [...prev, formattedName]);
    }

    handleChannelSelect(formattedName);
  }, [socket, handleChannelSelect, availableChannels, setAvailableChannels]);

  const handleRefreshChannels = useCallback(() => {
    if (!socket) return;
    socket.emit('get_channels');
    socket.once('channels_list', (data) => {
      if (data.channels && Array.isArray(data.channels)) {
        setAvailableChannels(data.channels);
      }
    });
  }, [socket]);

  const handleRenameChannel = useCallback((oldName, newName) => {
    if (!socket || !oldName || !newName || oldName === newName) return;

    socket.emit('rename_channel', { oldName, newName }, (response) => {
      if (response?.error) {
        setError(response.error);
        return;
      }

      setAvailableChannels((prev) =>
        prev.map((ch) => (ch === oldName ? newName : ch))
      );

      setChannelMessages((prev) => {
        const newMessages = { ...prev };
        if (newMessages[oldName]) {
          newMessages[newName] = newMessages[oldName];
          delete newMessages[oldName];
        }
        return newMessages;
      });

      if (currentChannel === oldName) {
        setCurrentChannel(newName);
      }

      handleRefreshChannels();
    });
  }, [socket, currentChannel, handleRefreshChannels, setAvailableChannels]);

  const handleDeleteChannel = useCallback((channelName) => {
    if (!socket || !channelName) return;

    socket.emit('delete_channel', { channelName }, (response) => {
      if (response?.error) {
        setError(response.error);
        return;
      }

      setAvailableChannels((prev) => {
        const updated = prev.filter(ch => ch !== channelName);
        if (currentChannel === channelName) {
          setCurrentChannel(updated[0] || '');
          if (updated[0]) handleChannelSelect(updated[0]);
        }
        return updated;
      });

      setChannelMessages((prev) => {
        const newMessages = { ...prev };
        delete newMessages[channelName];
        return newMessages;
      });

      handleRefreshChannels();
    });
  }, [socket, currentChannel, handleChannelSelect, setAvailableChannels]);

  const handleEditMessage = (msg) => {
    console.log('Sending edit:', msg);
    socket.emit('edit_message', {
      channelName: currentChannel,
      messageId: msg.id,
      newText: msg.message,
    });
  };

  const handleDeleteMessage = (msgId) => {
    console.log('Sending delete:', msgId);
    socket.emit('delete_message', {
      channelName: currentChannel,
      messageId: msgId,
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="flex justify-between items-center px-4 py-3 bg-white shadow">
        <div className="flex items-center gap-2">
          <button
            className="lg:hidden text-xl text-gray-700"
            onClick={toggleSidebar}
          >
            {sidebarOpen ? '⬅️' : '➡️'}
          </button>
          <h1 className="text-xl font-bold">EchoHub</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-600">Welcome, {username}!</span>
          <ConnectionStatus status={connectionStatus} />
        </div>
      </div>

      {error && (
        <div className="bg-red-100 text-red-800 p-2 text-center">
          {error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black bg-opacity-40 lg:hidden"
            onClick={toggleSidebar}
          />
        )}

        <div
          className={`
            fixed z-40 top-0 left-0 h-full w-64 bg-white border-r shadow-lg transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:relative lg:translate-x-0 lg:flex lg:flex-col
          `}
        >
          <div className="lg:hidden flex justify-end p-2 border-b">
            <button onClick={toggleSidebar} className="text-lg text-gray-600 hover:text-gray-800">
              ⬅️
            </button>
          </div>

          <div className="p-4">
            <ChannelList
              channels={availableChannels}
              currentChannel={currentChannel}
              onChannelSelect={handleChannelSelect}
              onCreateChannel={handleCreateChannel}
              onRefreshChannels={handleRefreshChannels}
              onRenameChannel={handleRenameChannel}
              onDeleteChannel={handleDeleteChannel}
            />
            <UserList
              users={channelUsers}
              currentUser={username}
              currentChannel={currentChannel}
            />
          </div>
        </div>

        <div className="flex flex-col flex-1 bg-gray-50 overflow-hidden">
          <div className="p-4 border-b bg-white flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">
                #{currentChannel || 'Select a channel'}
              </h2>
              {currentChannel && (
                <p className="text-sm text-gray-500">
                  {channelUsers.length} user{channelUsers.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          <MessageList
            messages={channelMessages[currentChannel] || []}
            currentUser={username}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
          />

          <MessageInput
            onSendMessage={handleSendMessage}
            disabled={!currentChannel || connectionStatus !== 'connected'}
            placeholder={
              !currentChannel
                ? "Select a channel to start chatting..."
                : connectionStatus !== 'connected'
                ? "Connecting..."
                : "Type your message..."
            }
          />
        </div>
      </div>
    </div>
  );
}

export default Chat;
