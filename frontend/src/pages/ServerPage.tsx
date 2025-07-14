import { useParams } from 'react-router-dom'

export default function ServerPage() {
  const { serverId, roomId } = useParams()

  return (
    <div className="h-screen flex">
      {/* Server Sidebar */}
      <div className="w-16 bg-gray-800 flex flex-col items-center py-4">
        <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center text-white font-bold">
          S
        </div>
      </div>

      {/* Rooms Sidebar */}
      <div className="w-60 bg-gray-700 text-white">
        <div className="p-4 border-b border-gray-600">
          <h1 className="font-semibold">Server {serverId}</h1>
        </div>
        <div className="p-2">
          <div className="text-gray-400 text-xs uppercase font-semibold mb-2">
            Text Channels
          </div>
          <div className="space-y-1">
            <div className="px-2 py-1 rounded hover:bg-gray-600 cursor-pointer">
              # general
            </div>
            <div className="px-2 py-1 rounded hover:bg-gray-600 cursor-pointer">
              # random
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="h-16 bg-white dark:bg-gray-800 border-b dark:border-gray-700 flex items-center px-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            # {roomId || 'general'}
          </h2>
        </div>

        {/* Messages Area */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="text-center text-gray-500 dark:text-gray-400">
            Chat functionality pending implementation
          </div>
        </div>

        {/* Message Input */}
        <div className="p-4 border-t dark:border-gray-700">
          <input
            type="text"
            placeholder="Type a message..."
            className="input-primary"
            disabled
          />
        </div>
      </div>
    </div>
  )
}