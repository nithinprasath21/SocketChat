import React, { useState, useEffect, useRef } from 'react';

function ChannelList({
  channels,
  currentChannel,
  onChannelSelect,
  onCreateChannel,
  onRefreshChannels,
  onRenameChannel,
  onDeleteChannel,
}) {
  const [showForm, setShowForm] = useState(false);
  const [newChannel, setNewChannel] = useState('');
  const [menuVisible, setMenuVisible] = useState(null);
  const [renamingChannel, setRenamingChannel] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const menuRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newChannel.trim()) return;
    const formatted = newChannel.trim().toLowerCase().replace(/\s+/g, '-');
    onCreateChannel(formatted);
    setNewChannel('');
    setShowForm(false);
  };

  const handleRename = (oldName) => {
    if (!renameValue.trim()) return;
    const formatted = renameValue.trim().toLowerCase().replace(/\s+/g, '-');
    onRenameChannel?.(oldName, formatted);
    setRenamingChannel(null);
    setRenameValue('');
  };

  const handleDelete = (channelName) => {
    onDeleteChannel?.(channelName);
    setMenuVisible(null);
  };

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuVisible(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Channels</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefreshChannels}
            title="Refresh Channels"
            className="text-gray-500 hover:text-gray-800"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 3V8M3 8H8M3 8L6 5.29168C7.59227 3.86656 9.69494 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.71683 21 4.13247 18.008 3.22302 14"
                stroke="#000000"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            className="text-blue-600 hover:text-blue-800 text-xl"
            onClick={() => setShowForm((prev) => !prev)}
            title="Add Channel"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 5V19M5 12H19"
                stroke="#000000"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4">
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={newChannel}
            onChange={(e) => setNewChannel(e.target.value)}
            placeholder="New channel name"
            maxLength={20}
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <button
              type="submit"
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {channels.length > 0 && (
        <div
          className={`space-y-1 relative ${
            channels.length > 5 ? 'max-h-48 overflow-y-auto pr-1' : ''
          }`}
        >
          {channels.map((channel) => (
            <div key={channel} className="relative group">
              {renamingChannel === channel ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleRename(channel);
                  }}
                  className="flex items-center gap-2 px-3 py-2"
                >
                  <input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    maxLength={20}
                    autoFocus
                  />
                  <button type="submit" className="text-blue-600 text-sm">
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRenamingChannel(null);
                      setRenameValue('');
                    }}
                    className="text-gray-500 text-sm"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <div
                  className={`flex justify-between items-center px-3 py-2 rounded transition ${
                    currentChannel === channel
                      ? 'bg-blue-100 text-blue-800 font-semibold'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <button
                    onClick={() => onChannelSelect(channel)}
                    className="flex-grow text-left"
                  >
                    {channel}
                  </button>
                  <div className="relative z-20" ref={menuRef}>
                    <button
                      onClick={() =>
                        setMenuVisible((prev) => (prev === channel ? null : channel))
                      }
                      className="text-gray-400 hover:text-gray-700"
                    >
                      &#x22EE;
                    </button>
                    {menuVisible === channel && (
                      <div className="absolute right-0 mt-1 w-28 bg-white border border-gray-200 rounded shadow z-50">
                        <button
                          onClick={() => {
                            setRenamingChannel(channel);
                            setRenameValue(channel);
                            setMenuVisible(null);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => handleDelete(channel)}
                          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-100"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ChannelList;
