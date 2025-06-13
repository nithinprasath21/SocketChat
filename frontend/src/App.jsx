import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import Chat from './components/Chat';
import LoginForm from './components/LoginForm';

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

function App() {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [username, setUsername] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [availableChannels, setAvailableChannels] = useState([]);
  const [error, setError] = useState('');

  const socketRef = useRef(null);

  useEffect(() => {
    const newSocket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      timeout: 20000,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setConnectionStatus('connected');
      setError('');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      setConnectionStatus('disconnected');
      setIsAuthenticated(false);
      setUsername('');
      setAvailableChannels([]);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnectionStatus('error');
      setError('Failed to connect to server');
    });

    newSocket.on('user_connected', (data) => {
      console.log('User authenticated:', data);
      setIsAuthenticated(true);
      setUsername(data.username);
      setAvailableChannels(data.availableChannels || []);
      setError('');
    });

    newSocket.on('error', (error) => {
      console.error('Server error:', error);
      setError(error.message || 'An error occurred');
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const handleUsernameSubmit = (enteredUsername) => {
    if (!socket || connectionStatus !== 'connected') {
      setError('Not connected to server');
      return;
    }

    setError('');
    socket.emit('user_connect_request', { username: enteredUsername });
  };

  if (!isAuthenticated) {
    return (
      <LoginForm onSubmit={handleUsernameSubmit} />
    );
  }

  return (
    <div className="app">
      <Chat
        socket={socket}
        username={username}
        availableChannels={availableChannels}
        setAvailableChannels={setAvailableChannels}
        connectionStatus={connectionStatus}
      />
    </div>
  );
}

export default App;
