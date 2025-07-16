import { useState } from 'react'
import { FiSearch, FiUserPlus, FiMessageCircle, FiCheck, FiX } from 'react-icons/fi'
import BaseLayout from '../components/layout/BaseLayout'

interface Friend {
  id: string
  username: string
  displayName: string
  avatar?: string
  isOnline: boolean
  lastSeen?: Date
}

interface FriendRequest {
  id: string
  username: string
  displayName: string
  avatar?: string
  type: 'incoming' | 'outgoing'
  sentAt: Date
}

// Mock data for development
const mockFriends: Friend[] = [
  { id: '1', username: 'alice_j', displayName: 'Alice Johnson', isOnline: true },
  { id: '2', username: 'bob_smith', displayName: 'Bob Smith', isOnline: true },
  { id: '3', username: 'david_w', displayName: 'David Wilson', isOnline: false, lastSeen: new Date('2024-01-10T10:30:00') },
  { id: '4', username: 'emma_d', displayName: 'Emma Davis', isOnline: false, lastSeen: new Date('2024-01-09T15:45:00') },
]

const mockRequests: FriendRequest[] = [
  { id: '1', username: 'charlie_b', displayName: 'Charlie Brown', type: 'incoming', sentAt: new Date('2024-01-11T09:00:00') },
]

function FriendsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddFriend, setShowAddFriend] = useState(false)
  const [newFriendQuery, setNewFriendQuery] = useState('')

  const filteredFriends = mockFriends.filter(friend =>
    friend.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const onlineFriends = filteredFriends.filter(friend => friend.isOnline)
  const offlineFriends = filteredFriends.filter(friend => !friend.isOnline)

  const handleSendFriendRequest = () => {
    // TODO: Implement friend request sending
    console.log('Sending friend request to:', newFriendQuery)
    setNewFriendQuery('')
    setShowAddFriend(false)
  }

  const handleAcceptRequest = (requestId: string) => {
    // TODO: Implement accept friend request
    console.log('Accepting request:', requestId)
  }

  const handleRejectRequest = (requestId: string) => {
    // TODO: Implement reject friend request
    console.log('Rejecting request:', requestId)
  }

  const handleStartConversation = (friendId: string) => {
    // TODO: Navigate to DM conversation
    console.log('Starting conversation with:', friendId)
  }

  return (
    <BaseLayout>
      <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Friends
          </h1>
          <button
            onClick={() => setShowAddFriend(true)}
            className="btn-icon text-primary-600 dark:text-primary-400"
            aria-label="Add friend"
          >
            <FiUserPlus className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="search"
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-primary pl-10"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-touch p-4 space-y-6">
        {/* Friend Requests */}
        {mockRequests.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Pending Requests
            </h2>
            <div className="space-y-2">
              {mockRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                      <span className="text-primary-600 dark:text-primary-400 font-medium">
                        {request.displayName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {request.displayName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        @{request.username}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleAcceptRequest(request.id)}
                      className="btn-icon text-green-600 dark:text-green-400"
                      aria-label="Accept request"
                    >
                      <FiCheck className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleRejectRequest(request.id)}
                      className="btn-icon text-red-600 dark:text-red-400"
                      aria-label="Reject request"
                    >
                      <FiX className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Online Friends */}
        {onlineFriends.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Online — {onlineFriends.length}
            </h2>
            <div className="space-y-2">
              {onlineFriends.map((friend) => (
                <div key={friend.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                        <span className="text-primary-600 dark:text-primary-400 font-medium">
                          {friend.displayName.charAt(0)}
                        </span>
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {friend.displayName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        @{friend.username}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleStartConversation(friend.id)}
                    className="btn-icon text-primary-600 dark:text-primary-400"
                    aria-label="Message"
                  >
                    <FiMessageCircle className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Offline Friends */}
        {offlineFriends.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              All Friends — {mockFriends.length}
            </h2>
            <div className="space-y-2">
              {offlineFriends.map((friend) => (
                <div key={friend.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">
                          {friend.displayName.charAt(0)}
                        </span>
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-400 border-2 border-white dark:border-gray-900 rounded-full"></div>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {friend.displayName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        @{friend.username}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleStartConversation(friend.id)}
                    className="btn-icon text-gray-500 dark:text-gray-400"
                    aria-label="Message"
                  >
                    <FiMessageCircle className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {filteredFriends.length === 0 && searchQuery && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No friends found matching "{searchQuery}"
            </p>
          </div>
        )}
      </div>

      {/* Add Friend Modal */}
      {showAddFriend && (
        <>
          <div className="drawer-overlay" onClick={() => setShowAddFriend(false)} />
          <div className="fixed inset-x-4 top-20 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 md:inset-x-auto md:w-96 md:left-1/2 md:transform md:-translate-x-1/2">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Add Friend
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Enter a username or email to send a friend request.
            </p>
            <input
              type="text"
              placeholder="Username or email"
              value={newFriendQuery}
              onChange={(e) => setNewFriendQuery(e.target.value)}
              className="input-primary mb-4"
              autoFocus
            />
            <div className="flex space-x-3">
              <button
                onClick={handleSendFriendRequest}
                disabled={!newFriendQuery.trim()}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send Request
              </button>
              <button
                onClick={() => setShowAddFriend(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
      </div>
    </BaseLayout>
  )
}

export default FriendsPage