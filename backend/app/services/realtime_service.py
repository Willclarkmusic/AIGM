from typing import Dict, Any, Optional
from ably import AblyRest
from app.core.config import settings
from app.models.user import User
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class RealtimeService:
    def __init__(self):
        if settings.ABLY_API_KEY:
            self.client = AblyRest(settings.ABLY_API_KEY)
        else:
            logger.warning("Ably API key not configured")
            self.client = None
    
    async def publish_to_room(
        self, 
        server_id: str, 
        room_id: str, 
        event_type: str, 
        data: Dict[str, Any],
        user_id: Optional[str] = None
    ) -> bool:
        """Publish event to a room channel"""
        if not self.client:
            logger.warning("Ably client not initialized")
            return False
        
        try:
            channel_name = f"{server_id}:{room_id}"
            channel = self.client.channels.get(channel_name)
            
            event = {
                "type": event_type,
                "data": data,
                "timestamp": datetime.utcnow().isoformat(),
                "user_id": user_id
            }
            
            await channel.publish(event_type, event)
            return True
            
        except Exception as e:
            logger.error(f"Failed to publish to room channel: {e}")
            return False
    
    async def publish_to_user(
        self, 
        user_id: str, 
        event_type: str, 
        data: Dict[str, Any]
    ) -> bool:
        """Publish event to a user's personal channel"""
        if not self.client:
            logger.warning("Ably client not initialized")
            return False
        
        try:
            channel_name = f"user:{user_id}"
            channel = self.client.channels.get(channel_name)
            
            event = {
                "type": event_type,
                "data": data,
                "timestamp": datetime.utcnow().isoformat(),
                "user_id": user_id
            }
            
            await channel.publish(event_type, event)
            return True
            
        except Exception as e:
            logger.error(f"Failed to publish to user channel: {e}")
            return False
    
    async def publish_to_dm(
        self, 
        conversation_id: str, 
        event_type: str, 
        data: Dict[str, Any],
        user_id: Optional[str] = None
    ) -> bool:
        """Publish event to a direct message channel"""
        if not self.client:
            logger.warning("Ably client not initialized")
            return False
        
        try:
            channel_name = f"dm:{conversation_id}"
            channel = self.client.channels.get(channel_name)
            
            event = {
                "type": event_type,
                "data": data,
                "timestamp": datetime.utcnow().isoformat(),
                "user_id": user_id
            }
            
            await channel.publish(event_type, event)
            return True
            
        except Exception as e:
            logger.error(f"Failed to publish to DM channel: {e}")
            return False
    
    async def publish_to_server(
        self, 
        server_id: str, 
        event_type: str, 
        data: Dict[str, Any],
        user_id: Optional[str] = None
    ) -> bool:
        """Publish event to a server channel"""
        if not self.client:
            logger.warning("Ably client not initialized")
            return False
        
        try:
            channel_name = f"server:{server_id}"
            channel = self.client.channels.get(channel_name)
            
            event = {
                "type": event_type,
                "data": data,
                "timestamp": datetime.utcnow().isoformat(),
                "user_id": user_id
            }
            
            await channel.publish(event_type, event)
            return True
            
        except Exception as e:
            logger.error(f"Failed to publish to server channel: {e}")
            return False
    
    def generate_token_request(self, user: User) -> Optional[Dict[str, Any]]:
        """Generate Ably token request for authenticated user"""
        if not self.client:
            return None
        
        try:
            # Define capabilities for the user
            capabilities = {
                # User can subscribe to their personal channel
                f"user:{user.id}": ["subscribe"],
                # User can subscribe and publish to channels they have access to
                # This will be refined based on server/room permissions
                "*": ["subscribe", "publish"]
            }
            
            token_request = self.client.auth.create_token_request({
                'client_id': str(user.id),
                'capability': capabilities,
                'ttl': 3600 * 1000  # 1 hour in milliseconds
            })
            
            return token_request
            
        except Exception as e:
            logger.error(f"Failed to generate token request: {e}")
            return None
    
    # Friend-related notifications
    async def send_friend_request_notification(
        self, 
        target_user_id: str, 
        requester_data: Dict[str, Any]
    ) -> bool:
        """Send friend request notification to target user"""
        return await self.publish_to_user(
            user_id=target_user_id,
            event_type="friend.request",
            data={
                "requester": requester_data,
                "message": f"{requester_data['username']} sent you a friend request"
            }
        )
    
    async def send_friend_accepted_notification(
        self, 
        target_user_id: str, 
        accepter_data: Dict[str, Any]
    ) -> bool:
        """Send friend request accepted notification"""
        return await self.publish_to_user(
            user_id=target_user_id,
            event_type="friend.accepted",
            data={
                "accepter": accepter_data,
                "message": f"{accepter_data['username']} accepted your friend request"
            }
        )
    
    async def send_friend_removed_notification(
        self, 
        target_user_id: str, 
        remover_data: Dict[str, Any]
    ) -> bool:
        """Send friend removed notification"""
        return await self.publish_to_user(
            user_id=target_user_id,
            event_type="friend.removed",
            data={
                "remover": remover_data,
                "message": f"{remover_data['username']} removed you as a friend"
            }
        )
    
    async def send_friend_online_notification(
        self, 
        friend_user_ids: list, 
        user_data: Dict[str, Any]
    ) -> bool:
        """Send friend online status notification to all friends"""
        success = True
        for friend_id in friend_user_ids:
            result = await self.publish_to_user(
                user_id=friend_id,
                event_type="friend.online",
                data={
                    "user": user_data,
                    "status": "online"
                }
            )
            if not result:
                success = False
        return success
    
    async def send_friend_offline_notification(
        self, 
        friend_user_ids: list, 
        user_data: Dict[str, Any]
    ) -> bool:
        """Send friend offline status notification to all friends"""
        success = True
        for friend_id in friend_user_ids:
            result = await self.publish_to_user(
                user_id=friend_id,
                event_type="friend.offline",
                data={
                    "user": user_data,
                    "status": "offline"
                }
            )
            if not result:
                success = False
        return success
    
    # Server-related notifications
    async def send_server_notification(
        self, 
        target_user_id: str, 
        event_type: str, 
        server_data: Dict[str, Any]
    ) -> bool:
        """Send server-related notification to target user"""
        return await self.publish_to_user(
            user_id=target_user_id,
            event_type=f"server.{event_type}",
            data=server_data
        )
    
    # Room-related notifications  
    async def send_room_notification(
        self, 
        target_user_id: str, 
        event_type: str, 
        room_data: Dict[str, Any]
    ) -> bool:
        """Send room-related notification to target user"""
        return await self.publish_to_user(
            user_id=target_user_id,
            event_type=f"room.{event_type}",
            data=room_data
        )

# Global instance
realtime_service = RealtimeService()