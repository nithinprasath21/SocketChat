import React, { useEffect, useRef, useState } from 'react';

function MessageList({ messages, currentUser, onEditMessage, onDeleteMessage }) {
  const messagesEndRef = useRef();
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editedText, setEditedText] = useState('');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const startEditing = (msg) => {
    setEditingId(msg.id);
    setEditedText(msg.message);
    setMenuOpenId(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditedText('');
  };

  const saveEdit = (msg) => {
    if (editedText.trim() && editedText !== msg.message) {
      console.log('Saving edit. Before:', msg.message, 'After:', editedText);
      onEditMessage?.({ ...msg, message: editedText });
    }
    cancelEditing();
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.length === 0 ? (
        <p className="text-center text-gray-500 italic">No messages yet</p>
      ) : (
        messages.map((msg) => {
          const isOwn = msg.username === currentUser;
          const msgId = msg.id;
          const isEditing = editingId === msgId;

          return (
            <div
              key={msgId}
              className={`relative flex ${isOwn ? 'justify-end pr-3' : 'justify-start pl-3'} ${
                menuOpenId === msgId ? 'z-10' : ''
              }`}
            >
              <div
                className={`relative max-w-xs px-3 py-2 rounded shadow ${
                  isOwn ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
                }`}
                onMouseEnter={() => setHoveredMessageId(msgId)}
                onMouseLeave={() => {
                  setHoveredMessageId(null);
                  setMenuOpenId(null);
                }}
              >
                {!isOwn && <p className="font-semibold text-sm">{msg.username}</p>}

                {isEditing ? (
                  <div className="space-y-1">
                    <input
                      className="w-full px-2 py-1 rounded text-white"
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      autoFocus
                    />
                    <div className="flex justify-end space-x-1 text-xs">
                      <button
                        onClick={() => saveEdit(msg)}
                        className="text-green-600 hover:underline"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="text-red-500 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm">{msg.message}</p>
                    <p className="text-xs text-right mt-1 opacity-70">
                      {formatTime(msg.timestamp)}
                      {msg.edited && ' (edited)'}
                    </p>
                  </>
                )}

                {isOwn && hoveredMessageId === msgId && !isEditing && (
                  <div className="absolute top-0 right-0">
                    <button
                      onClick={() => setMenuOpenId(msgId)}
                      className="text-gray-300 hover:text-white px-1"
                      title="More options"
                    >
                      ⋯
                    </button>

                    {menuOpenId === msgId && (
                      <div className="absolute right-0 mt-1 w-24 bg-white border rounded shadow-lg z-20">
                        <button
                          className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-100 text-black"
                          onClick={() => startEditing(msg)}
                        >
                          Edit
                        </button>
                        <button
                          className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-100 text-red-600"
                          onClick={() => {
                            setMenuOpenId(null);
                            onDeleteMessage?.(msg.id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

export default MessageList;
