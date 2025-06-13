import React, { useState, useRef, useEffect } from 'react';

function MessageInput({ onSendMessage, disabled, placeholder }) {
  const [message, setMessage] = useState('');
  const inputRef = useRef();

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim() || disabled) return;
    onSendMessage(message);
    setMessage('');
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t bg-white">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          className="flex-1 px-4 py-2 border rounded shadow-sm focus:outline-none focus:ring"
          placeholder={placeholder}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={disabled}
        />
        <button
          type="submit"
          disabled={disabled || !message.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </form>
  );
}

export default MessageInput;
