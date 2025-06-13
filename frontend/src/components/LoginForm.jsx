import React, { useState } from 'react';

const LoginForm = ({ onSubmit }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    onSubmit(username.trim());
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-center mb-2">Welcome to EchoHub</h2>
        <p className="text-sm text-gray-500 text-center mb-4">
          Enter your username to join the chat
        </p>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="username" className="text-sm font-medium">
              Username
            </label>
            <input
              id="username"
              className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition text-sm"
          >
            Join Chat
          </button>
        </form>
        <div className="mt-6 text-center text-xs text-gray-500">
          By joining, you agree to our <a href="#" className="underline">Terms</a> and{' '}
          <a href="#" className="underline">Privacy Policy</a>.
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
