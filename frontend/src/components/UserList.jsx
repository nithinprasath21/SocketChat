import React from 'react';

function UserList({ users, currentUser, currentChannel }) {
  const sorted = [...users].sort((a, b) => {
    if (a.username === currentUser) return -1;
    if (b.username === currentUser) return 1;
    return a.username.localeCompare(b.username);
  });

  return (
    <div>
      <div className="flex justify-between items-center mt-6 mb-2">
        <h3 className="text-md font-semibold">Online Users</h3>
        <span className="text-sm text-gray-500">({users.length})</span>
      </div>

      {currentChannel ? (
        <div className={`space-y-1 ${users.length > 8 ? 'max-h-60 overflow-y-auto pr-1' : ''}`}>
          {sorted.map(user => (
            <div key={user.socketId} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className={`text-sm ${user.username === currentUser ? 'font-semibold' : ''}`}>
                {user.username}{user.username === currentUser && ' (you)'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic">Join a channel to see users</p>
      )}
    </div>
  );
}

export default UserList;
