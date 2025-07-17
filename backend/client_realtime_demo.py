#!/usr/bin/env python3
"""
Client-side demonstration of real-time events.
This shows how a frontend client would interact with the real-time messaging system.
"""

import asyncio
import json
from datetime import datetime
from typing import Dict, Any

class RealtimeClient:
    """Simulates a client connecting to the real-time messaging system"""
    
    def __init__(self, user_id: str, username: str):
        self.user_id = user_id
        self.username = username
        self.connected = False
        self.channels = []
        
    def connect_to_ably(self, token_request: Dict[str, Any]):
        """Simulate connecting to Ably with token"""
        print(f"🔗 {self.username} connecting to Ably...")
        
        # Simulate token validation
        if token_request.get("keyName") and token_request.get("capability"):
            self.connected = True
            print(f"✅ {self.username} connected to Ably successfully")
            return True
        
        print(f"❌ {self.username} failed to connect")
        return False
    
    def subscribe_to_channel(self, channel: str):
        """Subscribe to a channel"""
        if not self.connected:
            print(f"❌ {self.username} not connected to Ably")
            return
        
        if channel not in self.channels:
            self.channels.append(channel)
            print(f"📡 {self.username} subscribed to channel: {channel}")
        
    def handle_message_created(self, event: Dict[str, Any]):
        """Handle message.created event"""
        message = event["data"]
        timestamp = datetime.fromisoformat(event["timestamp"].replace("Z", "+00:00"))
        
        print(f"💬 {self.username} received new message:")
        print(f"   From: {message['username']}")
        print(f"   Content: {message['content']}")
        print(f"   Time: {timestamp.strftime('%H:%M:%S')}")
        
        if message.get("parent_message_id"):
            print(f"   📝 Reply to message: {message['parent_message_id']}")
        
        if message.get("files"):
            print(f"   📎 Files: {len(message['files'])}")
    
    def handle_message_updated(self, event: Dict[str, Any]):
        """Handle message.updated event"""
        message = event["data"]
        print(f"✏️ {self.username} saw message edited:")
        print(f"   Message ID: {message['id']}")
        print(f"   New content: {message['content']}")
        print(f"   ✍️ (edited)")
    
    def handle_message_deleted(self, event: Dict[str, Any]):
        """Handle message.deleted event"""
        data = event["data"]
        print(f"🗑️ {self.username} saw message deleted:")
        print(f"   Message ID: {data['message_id']}")
        print(f"   Deleted by: {data['deleted_by']}")
    
    def handle_reaction_added(self, event: Dict[str, Any]):
        """Handle reaction.added event"""
        data = event["data"]
        print(f"😊 {self.username} saw reaction added:")
        print(f"   {data['emoji']} by {data['username']}")
        print(f"   Message: {data['message_id']}")
    
    def handle_reaction_removed(self, event: Dict[str, Any]):
        """Handle reaction.removed event"""
        data = event["data"]
        print(f"😐 {self.username} saw reaction removed:")
        print(f"   {data['emoji']} by {data['username']}")
        print(f"   Message: {data['message_id']}")
    
    def handle_typing_start(self, event: Dict[str, Any]):
        """Handle typing.start event"""
        data = event["data"]
        if data["user_id"] != self.user_id:  # Don't show own typing
            print(f"⌨️ {self.username} sees: {data['username']} is typing...")
    
    def handle_typing_stop(self, event: Dict[str, Any]):
        """Handle typing.stop event"""
        data = event["data"]
        if data["user_id"] != self.user_id:  # Don't show own typing
            print(f"⌨️ {self.username} sees: {data['username']} stopped typing")
    
    def handle_event(self, event: Dict[str, Any]):
        """Route event to appropriate handler"""
        event_type = event.get("type")
        
        handlers = {
            "message.created": self.handle_message_created,
            "message.updated": self.handle_message_updated,
            "message.deleted": self.handle_message_deleted,
            "reaction.added": self.handle_reaction_added,
            "reaction.removed": self.handle_reaction_removed,
            "typing.start": self.handle_typing_start,
            "typing.stop": self.handle_typing_stop,
        }
        
        handler = handlers.get(event_type)
        if handler:
            handler(event)
        else:
            print(f"❓ {self.username} received unknown event type: {event_type}")
    
    def send_message(self, content: str, room_id: str = None, conversation_id: str = None):
        """Simulate sending a message"""
        print(f"📤 {self.username} sending message: '{content}'")
        
        # This would make an HTTP POST to /api/v1/messages
        # The backend would then publish the real-time event
        return {
            "id": f"msg-{datetime.now().timestamp()}",
            "content": content,
            "user_id": self.user_id,
            "username": self.username,
            "room_id": room_id,
            "conversation_id": conversation_id,
            "created_at": datetime.now().isoformat(),
            "files": [],
            "reactions": [],
            "reply_count": 0
        }
    
    def add_reaction(self, message_id: str, emoji: str):
        """Simulate adding a reaction"""
        print(f"😊 {self.username} adding reaction {emoji} to message {message_id}")
        
        # This would make an HTTP POST to /api/v1/messages/{message_id}/react
        # The backend would then publish the real-time event
        return {
            "message_id": message_id,
            "emoji": emoji,
            "user_id": self.user_id,
            "username": self.username
        }
    
    def start_typing(self, room_id: str = None, conversation_id: str = None):
        """Simulate starting to type"""
        print(f"⌨️ {self.username} started typing...")
        
        # This would make an HTTP POST to /api/v1/messages/typing/start
        # The backend would then publish the real-time event

async def demonstrate_realtime_messaging():
    """Demonstrate real-time messaging between multiple clients"""
    
    print("🚀 Real-time Messaging System Demo")
    print("=" * 40)
    
    # Create multiple clients
    alice = RealtimeClient("user-alice", "Alice")
    bob = RealtimeClient("user-bob", "Bob")
    charlie = RealtimeClient("user-charlie", "Charlie")
    
    # Simulate getting Ably tokens
    token_request = {
        "keyName": "test-key",
        "capability": {
            "user:user-alice": ["subscribe"],
            "room:test-room": ["subscribe", "publish"]
        },
        "ttl": 3600000
    }
    
    print("\n🔗 Connecting clients to Ably...")
    alice.connect_to_ably(token_request)
    bob.connect_to_ably(token_request)
    charlie.connect_to_ably(token_request)
    
    # Subscribe to room channel
    room_channel = "server-123:room-456"
    alice.subscribe_to_channel(room_channel)
    bob.subscribe_to_channel(room_channel)
    charlie.subscribe_to_channel(room_channel)
    
    print("\n📝 Simulating message flow...")
    
    # Alice sends a message
    message1 = alice.send_message("Hello everyone!", room_id="room-456")
    
    # Simulate real-time event being received by Bob and Charlie
    event1 = {
        "type": "message.created",
        "data": message1,
        "timestamp": datetime.now().isoformat(),
        "user_id": "user-alice"
    }
    
    await asyncio.sleep(0.1)
    bob.handle_event(event1)
    charlie.handle_event(event1)
    
    print("\n⌨️ Simulating typing indicators...")
    
    # Bob starts typing
    bob.start_typing(room_id="room-456")
    
    # Simulate typing event
    typing_event = {
        "type": "typing.start",
        "data": {
            "user_id": "user-bob",
            "username": "Bob",
            "action": "start"
        },
        "timestamp": datetime.now().isoformat(),
        "user_id": "user-bob"
    }
    
    await asyncio.sleep(0.1)
    alice.handle_event(typing_event)
    charlie.handle_event(typing_event)
    
    # Bob sends a message
    await asyncio.sleep(0.5)
    message2 = bob.send_message("Hi Alice! How are you?", room_id="room-456")
    
    event2 = {
        "type": "message.created",
        "data": message2,
        "timestamp": datetime.now().isoformat(),
        "user_id": "user-bob"
    }
    
    await asyncio.sleep(0.1)
    alice.handle_event(event2)
    charlie.handle_event(event2)
    
    # Bob stops typing
    typing_stop_event = {
        "type": "typing.stop",
        "data": {
            "user_id": "user-bob",
            "username": "Bob",
            "action": "stop"
        },
        "timestamp": datetime.now().isoformat(),
        "user_id": "user-bob"
    }
    
    await asyncio.sleep(0.1)
    alice.handle_event(typing_stop_event)
    charlie.handle_event(typing_stop_event)
    
    print("\n😊 Simulating reactions...")
    
    # Charlie adds a reaction
    reaction_data = charlie.add_reaction(message1["id"], "👍")
    
    reaction_event = {
        "type": "reaction.added",
        "data": reaction_data,
        "timestamp": datetime.now().isoformat(),
        "user_id": "user-charlie"
    }
    
    await asyncio.sleep(0.1)
    alice.handle_event(reaction_event)
    bob.handle_event(reaction_event)
    
    print("\n✏️ Simulating message editing...")
    
    # Alice edits her message
    edited_message = message1.copy()
    edited_message["content"] = "Hello everyone! Welcome to the chat!"
    edited_message["edited_at"] = datetime.now().isoformat()
    
    edit_event = {
        "type": "message.updated",
        "data": edited_message,
        "timestamp": datetime.now().isoformat(),
        "user_id": "user-alice"
    }
    
    await asyncio.sleep(0.1)
    bob.handle_event(edit_event)
    charlie.handle_event(edit_event)
    
    print("\n🔄 Simulating direct message...")
    
    # Alice and Bob start a DM conversation
    dm_channel = "dm:conversation-789"
    alice.subscribe_to_channel(dm_channel)
    bob.subscribe_to_channel(dm_channel)
    
    dm_message = alice.send_message("Hey Bob, can we talk privately?", 
                                   conversation_id="conversation-789")
    
    dm_event = {
        "type": "message.created",
        "data": dm_message,
        "timestamp": datetime.now().isoformat(),
        "user_id": "user-alice"
    }
    
    await asyncio.sleep(0.1)
    bob.handle_event(dm_event)
    # Charlie doesn't receive this event (not in DM channel)
    
    print("\n✅ Demo completed successfully!")
    print("\n📊 Real-time Events Demonstrated:")
    print("   ✅ message.created (room and DM)")
    print("   ✅ message.updated")
    print("   ✅ reaction.added")
    print("   ✅ typing.start")
    print("   ✅ typing.stop")
    print("   ✅ Channel subscriptions")
    print("   ✅ Multi-client synchronization")

async def main():
    """Run the real-time messaging demo"""
    await demonstrate_realtime_messaging()

if __name__ == "__main__":
    asyncio.run(main())