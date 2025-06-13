import React from 'react';

function ConnectionStatus({ status }) {
  const statusMap = {
    connected: ['bg-green-500', 'Connected'],
    connecting: ['bg-yellow-400', 'Connecting...'],
    disconnected: ['bg-red-500', 'Disconnected'],
    error: ['bg-red-500', 'Connection Error'],
    unknown: ['bg-gray-400', 'Unknown']
  };

  const [color, label] = statusMap[status] || statusMap['unknown'];

  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${color}`}></span>
      <span className="text-sm">{label}</span>
    </div>
  );
}

export default ConnectionStatus;
