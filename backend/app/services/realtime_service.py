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

# Global instance
realtime_service = RealtimeService()