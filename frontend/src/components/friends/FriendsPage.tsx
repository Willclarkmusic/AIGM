import { useState, useEffect } from 'react'
import { 
  FiSearch, 
  FiUserPlus, 
  FiMessageCircle, 
  FiCheck, 
  FiX, 
  FiMoreHorizontal,
  FiFilter,
  FiUsers,
  FiUserMinus
} from 'react-icons/fi'
import { useResponsive } from '../../stores/uiStore'
import { useFriendsStore, useFriendsActions, useFriendsFilters } from '../../stores/friendsStore'

interface Friend {
  id: string
  username: string
  displayName: string
  avatar?: string
  isOnline: boolean
  lastSeen?: Date
  status?: string
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
  { id: '1', username: 'alice_j', displayName: 'Alice Johnson', isOnline: true, status: '🎮 Playing games' },
  { id: '2', username: 'bob_smith', displayName: 'Bob Smith', isOnline: true, status: '💼 Working' },
  { id: '3', username: 'charlie_b', displayName: 'Charlie Brown', isOnline: false, lastSeen: new Date('2024-01-10T10:30:00') },
  { id: '4', username: 'david_w', displayName: 'David Wilson', isOnline: false, lastSeen: new Date('2024-01-09T15:45:00') },
  { id: '5', username: 'emma_d', displayName: 'Emma Davis', isOnline: true },
  { id: '6', username: 'frank_m', displayName: 'Frank Miller', isOnline: false, lastSeen: new Date('2024-01-08T12:00:00') },
]

const mockRequests: FriendRequest[] = [
  { id: '1', username: 'charlie_b', displayName: 'Charlie Brown', type: 'incoming', sentAt: new Date('2024-01-11T09:00:00') },
  { id: '2', username: 'grace_h', displayName: 'Grace Hall', type: 'outgoing', sentAt: new Date('2024-01-10T14:30:00') },
]

function FriendsPage() {
  const { isMobile } = useResponsive()
  const [showAddFriend, setShowAddFriend] = useState(false)
  const [newFriendQuery, setNewFriendQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null)
  
  // Local state for demo (replace with actual store when integrated)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'recent'>('name')
  const [filterOnline, setFilterOnline] = useState(false)

  const filteredFriends = mockFriends.filter(friend => {
    const matchesSearch = friend.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         friend.username.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesOnlineFilter = !filterOnline || friend.isOnline
    return matchesSearch && matchesOnlineFilter
  }).sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.displayName.localeCompare(b.displayName)
      case 'status':
        if (a.isOnline && !b.isOnline) return -1
        if (!a.isOnline && b.isOnline) return 1
        return a.displayName.localeCompare(b.displayName)
      case 'recent':
        const aTime = a.lastSeen?.getTime() || 0
        const bTime = b.lastSeen?.getTime() || 0
        return bTime - aTime
      default:
        return 0
    }
  })

  const onlineFriends = filteredFriends.filter(friend => friend.isOnline)
  const offlineFriends = filteredFriends.filter(friend => !friend.isOnline)

  const handleSendFriendRequest = () => {
    console.log('Sending friend request to:', newFriendQuery)
    setNewFriendQuery('')
    setShowAddFriend(false)
  }

  const handleAcceptRequest = (requestId: string) => {
    console.log('Accepting request:', requestId)
  }

  const handleRejectRequest = (requestId: string) => {
    console.log('Rejecting request:', requestId)
  }

  const handleStartConversation = (friendId: string) => {
    console.log('Starting conversation with:', friendId)
  }

  const handleRemoveFriend = (friendId: string) => {
    console.log('Removing friend:', friendId)
    setSelectedFriend(null)
  }

  const formatLastSeen = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <FiUsers className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Friends
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            {!isMobile && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`btn-icon ${showFilters ? 'text-primary-600 dark:text-primary-400' : ''}`}
                aria-label="Toggle filters"
              >
                <FiFilter className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => setShowAddFriend(true)}
              className="btn-icon text-primary-600 dark:text-primary-400"
              aria-label="Add friend"
            >
              <FiUserPlus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="search"
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-primary pl-10"
          />
        </div>

        {/* Filters - Mobile */}
        {isMobile && (
          <div className="flex items-center space-x-2 overflow-x-auto">
            <button
              onClick={() => setFilterOnline(!filterOnline)}
              className={`
                px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                ${filterOnline 
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                }
              `}
            >
              Online Only
            </button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'status' | 'recent')}
              className="px-3 py-2 rounded-lg text-sm bg-gray-100 dark:bg-gray-800 border-none"
            >
              <option value="name">Name</option>
              <option value="status">Status</option>
              <option value="recent">Recent</option>
            </select>
          </div>
        )}

        {/* Filters - Desktop */}
        {!isMobile && showFilters && (
          <div className="flex items-center space-x-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filterOnline}
                onChange={(e) => setFilterOnline(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Online only</span>
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'status' | 'recent')}
              className="px-3 py-2 rounded-lg text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600"
            >
              <option value="name">Sort by Name</option>
              <option value="status">Sort by Status</option>
              <option value="recent">Sort by Recent</option>
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-touch">
        <div className="p-4 space-y-6">
          {/* Friend Requests */}
          {mockRequests.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center">
                <span>Pending Requests</span>
                <span className="ml-2 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 text-xs px-2 py-1 rounded-full">
                  {mockRequests.filter(r => r.type === 'incoming').length}
                </span>
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
                          @{request.username} • {request.type === 'incoming' ? 'Sent you a request' : 'Request sent'}
                        </p>
                      </div>
                    </div>
                    {request.type === 'incoming' ? (
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
                    ) : (
                      <span className="text-xs text-gray-500 dark:text-gray-400">Pending</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Online Friends */}
          {onlineFriends.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center">
                <span>Online</span>
                <span className="ml-2 w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="ml-1">{onlineFriends.length}</span>
              </h2>
              <div className="space-y-2">
                {onlineFriends.map((friend) => (
                  <div key={friend.id} className="group relative">
                    <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="relative">
                          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                            <span className="text-primary-600 dark:text-primary-400 font-medium">
                              {friend.displayName.charAt(0)}
                            </span>
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {friend.displayName}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {friend.status || `@${friend.username}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleStartConversation(friend.id)}
                          className="btn-icon text-primary-600 dark:text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Message"
                        >
                          <FiMessageCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setSelectedFriend(selectedFriend === friend.id ? null : friend.id)}
                          className="btn-icon text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="More options"
                        >
                          <FiMoreHorizontal className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Friend Options Menu */}
                    {selectedFriend === friend.id && (
                      <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2 z-10 min-w-[160px]">
                        <button
                          onClick={() => handleStartConversation(friend.id)}
                          className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
                        >
                          <FiMessageCircle className="w-4 h-4" />
                          <span>Send Message</span>
                        </button>
                        <button
                          onClick={() => handleRemoveFriend(friend.id)}
                          className="flex items-center space-x-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
                        >
                          <FiUserMinus className="w-4 h-4" />
                          <span>Remove Friend</span>
                        </button>
                      </div>
                    )}
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
                  <div key={friend.id} className="group relative">
                    <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="relative">
                          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">
                              {friend.displayName.charAt(0)}
                            </span>
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-400 border-2 border-white dark:border-gray-900 rounded-full"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {friend.displayName}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {friend.lastSeen ? `Last seen ${formatLastSeen(friend.lastSeen)}` : `@${friend.username}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleStartConversation(friend.id)}
                          className="btn-icon text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Message"
                        >
                          <FiMessageCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setSelectedFriend(selectedFriend === friend.id ? null : friend.id)}
                          className="btn-icon text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="More options"
                        >
                          <FiMoreHorizontal className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Friend Options Menu */}
                    {selectedFriend === friend.id && (
                      <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2 z-10 min-w-[160px]">
                        <button
                          onClick={() => handleStartConversation(friend.id)}
                          className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
                        >
                          <FiMessageCircle className="w-4 h-4" />
                          <span>Send Message</span>
                        </button>
                        <button
                          onClick={() => handleRemoveFriend(friend.id)}
                          className="flex items-center space-x-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
                        >
                          <FiUserMinus className="w-4 h-4" />
                          <span>Remove Friend</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {filteredFriends.length === 0 && searchQuery && (
            <div className="text-center py-12">
              <FiUsers className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 mb-2">
                No friends found matching "{searchQuery}"
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Try a different search term or add new friends
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Friend Modal */}
      {showAddFriend && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowAddFriend(false)} />
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

      {/* Click outside to close menus */}
      {selectedFriend && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setSelectedFriend(null)}
        />
      )}
    </div>
  )
}

export default FriendsPage