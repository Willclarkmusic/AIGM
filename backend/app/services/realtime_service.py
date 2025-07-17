from typing import Dict, Any, Optional, List
from ably import AblyRest
from app.core.config import settings
from app.models.user import User
import json
import logging
from datetime import datetime
import asyncio

logger = logging.getLogger(__name__)

class RealtimeService:
    def __init__(self):
        if settings.ABLY_API_KEY:
            self.client = AblyRest(settings.ABLY_API_KEY)
        else:
            logger.warning("Ably API key not configured")
            self.client = None
        
        # Channel naming constants
        self.ROOM_CHANNEL_PREFIX = "room"
        self.DM_CHANNEL_PREFIX = "dm"
        self.USER_CHANNEL_PREFIX = "user"
        self.SERVER_CHANNEL_PREFIX = "server"
    
    async def publish_to_room(
        self, 
        server_id: str, 
        room_id: str, 
        event_type: str, 
        data: Dict[str, Any],
        user_id: Optional[str] = None
    ) -> bool:
        """Publish event to a room channel: room:{server_id}:{room_id}"""
        if not self.client:
            logger.warning("Ably client not initialized")
            return False
        
        try:
            channel_name = f"{self.ROOM_CHANNEL_PREFIX}:{server_id}:{room_id}"
            channel = self.client.channels.get(channel_name)
            
            event = {
                "type": event_type,
                "data": data,
                "timestamp": datetime.utcnow().isoformat(),
                "user_id": user_id
            }
            
            channel.publish(event_type, event)
            logger.info(f"Published {event_type} to room channel: {channel_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to publish to room channel {channel_name}: {e}")
            return False
    
    async def publish_to_dm(
        self, 
        conversation_id: str, 
        event_type: str, 
        data: Dict[str, Any],
        user_id: Optional[str] = None
    ) -> bool:
        """Publish event to a direct message channel: dm:{conversation_id}"""
        if not self.client:
            logger.warning("Ably client not initialized")
            return False
        
        try:
            channel_name = f"{self.DM_CHANNEL_PREFIX}:{conversation_id}"
            channel = self.client.channels.get(channel_name)
            
            event = {
                "type": event_type,
                "data": data,
                "timestamp": datetime.utcnow().isoformat(),
                "user_id": user_id
            }
            
            channel.publish(event_type, event)
            logger.info(f"Published {event_type} to DM channel: {channel_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to publish to DM channel {channel_name}: {e}")
            return False
    
    async def publish_to_user(
        self, 
        user_id: str, 
        event_type: str, 
        data: Dict[str, Any]
    ) -> bool:
        """Publish event to a user's personal channel: user:{user_id}"""
        if not self.client:
            logger.warning("Ably client not initialized")
            return False
        
        try:
            channel_name = f"{self.USER_CHANNEL_PREFIX}:{user_id}"
            channel = self.client.channels.get(channel_name)
            
            event = {
                "type": event_type,
                "data": data,
                "timestamp": datetime.utcnow().isoformat(),
                "user_id": user_id
            }
            
            channel.publish(event_type, event)
            logger.info(f"Published {event_type} to user channel: {channel_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to publish to user channel {channel_name}: {e}")
            return False
    
    async def publish_to_server(
        self, 
        server_id: str, 
        event_type: str, 
        data: Dict[str, Any],
        user_id: Optional[str] = None
    ) -> bool:
        """Publish event to a server channel: server:{server_id}"""
        if not self.client:
            logger.warning("Ably client not initialized")
            return False
        
        try:
            channel_name = f"{self.SERVER_CHANNEL_PREFIX}:{server_id}"
            channel = self.client.channels.get(channel_name)
            
            event = {
                "type": event_type,
                "data": data,
                "timestamp": datetime.utcnow().isoformat(),
                "user_id": user_id
            }
            
            channel.publish(event_type, event)
            logger.info(f"Published {event_type} to server channel: {channel_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to publish to server channel {channel_name}: {e}")
            return False
    
    def generate_token_request(self, user: User, user_servers: List[str] = None, user_rooms: List[str] = None, user_conversations: List[str] = None) -> Optional[Dict[str, Any]]:
        """Generate Ably token request for authenticated user with specific capabilities"""
        if not self.client:
            return None
        
        try:
            # Define capabilities for the user
            capabilities = {
                # User can subscribe to their personal channel
                f"{self.USER_CHANNEL_PREFIX}:{user.id}": ["subscribe"],
            }
            
            # Add room channels user has access to
            if user_rooms:
                for room_info in user_rooms:
                    if ':' in room_info:
                        server_id, room_id = room_info.split(':', 1)
                        channel_name = f"{self.ROOM_CHANNEL_PREFIX}:{server_id}:{room_id}"
                        capabilities[channel_name] = ["subscribe", "publish"]
            
            # Add DM channels user has access to
            if user_conversations:
                for conversation_id in user_conversations:
                    channel_name = f"{self.DM_CHANNEL_PREFIX}:{conversation_id}"
                    capabilities[channel_name] = ["subscribe", "publish"]
            
            # Add server channels user has access to
            if user_servers:
                for server_id in user_servers:
                    channel_name = f"{self.SERVER_CHANNEL_PREFIX}:{server_id}"
                    capabilities[channel_name] = ["subscribe"]
            
            token_request = self.client.auth.create_token_request({
                'client_id': str(user.id),
                'capability': capabilities,
                'ttl': 3600 * 1000  # 1 hour in milliseconds
            })
            
            logger.info(f"Generated token for user {user.id} with {len(capabilities)} capabilities")
            return token_request
            
        except Exception as e:
            logger.error(f"Failed to generate token request: {e}")
            return None
    
    # ====================================================================
    # MESSAGE EVENTS
    # ====================================================================
    
    async def publish_message_created(
        self,
        message_data: Dict[str, Any],
        server_id: Optional[str] = None,
        room_id: Optional[str] = None,
        conversation_id: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> bool:
        """Publish message.created event"""
        try:
            if room_id and server_id:
                return await self.publish_to_room(
                    server_id=server_id,
                    room_id=room_id,
                    event_type="message.created",
                    data=message_data,
                    user_id=user_id
                )
            elif conversation_id:
                return await self.publish_to_dm(
                    conversation_id=conversation_id,
                    event_type="message.created",
                    data=message_data,
                    user_id=user_id
                )
            else:
                logger.error("No valid channel specified for message.created event")
                return False
        except Exception as e:
            logger.error(f"Failed to publish message.created: {e}")
            return False
    
    async def publish_message_updated(
        self,
        message_data: Dict[str, Any],
        server_id: Optional[str] = None,
        room_id: Optional[str] = None,
        conversation_id: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> bool:
        """Publish message.updated event"""
        try:
            if room_id and server_id:
                return await self.publish_to_room(
                    server_id=server_id,
                    room_id=room_id,
                    event_type="message.updated",
                    data=message_data,
                    user_id=user_id
                )
            elif conversation_id:
                return await self.publish_to_dm(
                    conversation_id=conversation_id,
                    event_type="message.updated",
                    data=message_data,
                    user_id=user_id
                )
            else:
                logger.error("No valid channel specified for message.updated event")
                return False
        except Exception as e:
            logger.error(f"Failed to publish message.updated: {e}")
            return False
    
    async def publish_message_deleted(
        self,
        message_id: str,
        deleted_by: str,
        server_id: Optional[str] = None,
        room_id: Optional[str] = None,
        conversation_id: Optional[str] = None
    ) -> bool:
        """Publish message.deleted event"""
        try:
            data = {
                "message_id": message_id,
                "deleted_by": deleted_by
            }
            
            if room_id and server_id:
                return await self.publish_to_room(
                    server_id=server_id,
                    room_id=room_id,
                    event_type="message.deleted",
                    data=data,
                    user_id=deleted_by
                )
            elif conversation_id:
                return await self.publish_to_dm(
                    conversation_id=conversation_id,
                    event_type="message.deleted",
                    data=data,
                    user_id=deleted_by
                )
            else:
                logger.error("No valid channel specified for message.deleted event")
                return False
        except Exception as e:
            logger.error(f"Failed to publish message.deleted: {e}")
            return False
    
    # ====================================================================
    # REACTION EVENTS
    # ====================================================================
    
    async def publish_reaction_added(
        self,
        message_id: str,
        emoji: str,
        user_id: str,
        username: str,
        server_id: Optional[str] = None,
        room_id: Optional[str] = None,
        conversation_id: Optional[str] = None
    ) -> bool:
        """Publish reaction.added event"""
        try:
            data = {
                "message_id": message_id,
                "emoji": emoji,
                "user_id": user_id,
                "username": username
            }
            
            if room_id and server_id:
                return await self.publish_to_room(
                    server_id=server_id,
                    room_id=room_id,
                    event_type="reaction.added",
                    data=data,
                    user_id=user_id
                )
            elif conversation_id:
                return await self.publish_to_dm(
                    conversation_id=conversation_id,
                    event_type="reaction.added",
                    data=data,
                    user_id=user_id
                )
            else:
                logger.error("No valid channel specified for reaction.added event")
                return False
        except Exception as e:
            logger.error(f"Failed to publish reaction.added: {e}")
            return False
    
    async def publish_reaction_removed(
        self,
        message_id: str,
        emoji: str,
        user_id: str,
        username: str,
        server_id: Optional[str] = None,
        room_id: Optional[str] = None,
        conversation_id: Optional[str] = None
    ) -> bool:
        """Publish reaction.removed event"""
        try:
            data = {
                "message_id": message_id,
                "emoji": emoji,
                "user_id": user_id,
                "username": username
            }
            
            if room_id and server_id:
                return await self.publish_to_room(
                    server_id=server_id,
                    room_id=room_id,
                    event_type="reaction.removed",
                    data=data,
                    user_id=user_id
                )
            elif conversation_id:
                return await self.publish_to_dm(
                    conversation_id=conversation_id,
                    event_type="reaction.removed",
                    data=data,
                    user_id=user_id
                )
            else:
                logger.error("No valid channel specified for reaction.removed event")
                return False
        except Exception as e:
            logger.error(f"Failed to publish reaction.removed: {e}")
            return False
    
    # ====================================================================
    # TYPING INDICATORS
    # ====================================================================
    
    async def publish_typing_start(
        self,
        user_id: str,
        username: str,
        server_id: Optional[str] = None,
        room_id: Optional[str] = None,
        conversation_id: Optional[str] = None
    ) -> bool:
        """Publish typing.start event"""
        try:
            data = {
                "user_id": user_id,
                "username": username,
                "action": "start"
            }
            
            if room_id and server_id:
                return await self.publish_to_room(
                    server_id=server_id,
                    room_id=room_id,
                    event_type="typing.start",
                    data=data,
                    user_id=user_id
                )
            elif conversation_id:
                return await self.publish_to_dm(
                    conversation_id=conversation_id,
                    event_type="typing.start",
                    data=data,
                    user_id=user_id
                )
            else:
                logger.error("No valid channel specified for typing.start event")
                return False
        except Exception as e:
            logger.error(f"Failed to publish typing.start: {e}")
            return False
    
    async def publish_typing_stop(
        self,
        user_id: str,
        username: str,
        server_id: Optional[str] = None,
        room_id: Optional[str] = None,
        conversation_id: Optional[str] = None
    ) -> bool:
        """Publish typing.stop event"""
        try:
            data = {
                "user_id": user_id,
                "username": username,
                "action": "stop"
            }
            
            if room_id and server_id:
                return await self.publish_to_room(
                    server_id=server_id,
                    room_id=room_id,
                    event_type="typing.stop",
                    data=data,
                    user_id=user_id
                )
            elif conversation_id:
                return await self.publish_to_dm(
                    conversation_id=conversation_id,
                    event_type="typing.stop",
                    data=data,
                    user_id=user_id
                )
            else:
                logger.error("No valid channel specified for typing.stop event")
                return False
        except Exception as e:
            logger.error(f"Failed to publish typing.stop: {e}")
            return False
    
    # ====================================================================
    # FRIEND EVENTS
    # ====================================================================
    
    async def publish_friend_request(
        self,
        target_user_id: str,
        requester_data: Dict[str, Any]
    ) -> bool:
        """Publish friend.request event"""
        try:
            data = {
                "requester": requester_data,
                "message": f"{requester_data['username']} sent you a friend request"
            }
            return await self.publish_to_user(
                user_id=target_user_id,
                event_type="friend.request",
                data=data
            )
        except Exception as e:
            logger.error(f"Failed to publish friend.request: {e}")
            return False
    
    async def publish_friend_accepted(
        self,
        target_user_id: str,
        accepter_data: Dict[str, Any]
    ) -> bool:
        """Publish friend.accepted event"""
        try:
            data = {
                "accepter": accepter_data,
                "message": f"{accepter_data['username']} accepted your friend request"
            }
            return await self.publish_to_user(
                user_id=target_user_id,
                event_type="friend.accepted",
                data=data
            )
        except Exception as e:
            logger.error(f"Failed to publish friend.accepted: {e}")
            return False
    
    async def publish_friend_removed(
        self,
        target_user_id: str,
        remover_data: Dict[str, Any]
    ) -> bool:
        """Publish friend.removed event"""
        try:
            data = {
                "remover": remover_data,
                "message": f"{remover_data['username']} removed you as a friend"
            }
            return await self.publish_to_user(
                user_id=target_user_id,
                event_type="friend.removed",
                data=data
            )
        except Exception as e:
            logger.error(f"Failed to publish friend.removed: {e}")
            return False
    
    async def publish_friend_online(
        self,
        friend_user_ids: List[str],
        user_data: Dict[str, Any]
    ) -> bool:
        """Publish friend.online event to all friends"""
        try:
            data = {
                "user": user_data,
                "status": "online"
            }
            
            success = True
            for friend_id in friend_user_ids:
                result = await self.publish_to_user(
                    user_id=friend_id,
                    event_type="friend.online",
                    data=data
                )
                if not result:
                    success = False
            
            return success
        except Exception as e:
            logger.error(f"Failed to publish friend.online: {e}")
            return False
    
    async def publish_friend_offline(
        self,
        friend_user_ids: List[str],
        user_data: Dict[str, Any]
    ) -> bool:
        """Publish friend.offline event to all friends"""
        try:
            data = {
                "user": user_data,
                "status": "offline"
            }
            
            success = True
            for friend_id in friend_user_ids:
                result = await self.publish_to_user(
                    user_id=friend_id,
                    event_type="friend.offline",
                    data=data
                )
                if not result:
                    success = False
            
            return success
        except Exception as e:
            logger.error(f"Failed to publish friend.offline: {e}")
            return False
    
    # ====================================================================
    # PRESENCE TRACKING
    # ====================================================================
    
    async def publish_user_presence(
        self,
        user_id: str,
        status: str,
        user_data: Dict[str, Any],
        friend_user_ids: List[str] = None
    ) -> bool:
        """Publish user presence update to friends"""
        try:
            if not friend_user_ids:
                return True
            
            data = {
                "user": user_data,
                "status": status,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            success = True
            for friend_id in friend_user_ids:
                result = await self.publish_to_user(
                    user_id=friend_id,
                    event_type=f"presence.{status}",
                    data=data
                )
                if not result:
                    success = False
            
            return success
        except Exception as e:
            logger.error(f"Failed to publish user presence: {e}")
            return False
    
    async def enter_presence(
        self,
        user_id: str,
        channel_name: str,
        user_data: Dict[str, Any]
    ) -> bool:
        """Enter presence on a channel"""
        try:
            if not self.client:
                return False
            
            channel = self.client.channels.get(channel_name)
            channel.presence.enter(user_data)
            logger.info(f"User {user_id} entered presence on {channel_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to enter presence: {e}")
            return False
    
    async def leave_presence(
        self,
        user_id: str,
        channel_name: str,
        user_data: Dict[str, Any] = None
    ) -> bool:
        """Leave presence on a channel"""
        try:
            if not self.client:
                return False
            
            channel = self.client.channels.get(channel_name)
            channel.presence.leave(user_data)
            logger.info(f"User {user_id} left presence on {channel_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to leave presence: {e}")
            return False
    
    # ====================================================================
    # LEGACY COMPATIBILITY METHODS
    # ====================================================================
    
    # Keep old method names for backward compatibility
    async def send_friend_request_notification(self, target_user_id: str, requester_data: Dict[str, Any]) -> bool:
        return await self.publish_friend_request(target_user_id, requester_data)
    
    async def send_friend_accepted_notification(self, target_user_id: str, accepter_data: Dict[str, Any]) -> bool:
        return await self.publish_friend_accepted(target_user_id, accepter_data)
    
    async def send_friend_removed_notification(self, target_user_id: str, remover_data: Dict[str, Any]) -> bool:
        return await self.publish_friend_removed(target_user_id, remover_data)
    
    async def send_friend_online_notification(self, friend_user_ids: List[str], user_data: Dict[str, Any]) -> bool:
        return await self.publish_friend_online(friend_user_ids, user_data)
    
    async def send_friend_offline_notification(self, friend_user_ids: List[str], user_data: Dict[str, Any]) -> bool:
        return await self.publish_friend_offline(friend_user_ids, user_data)
    
    # Server and room notifications
    async def send_server_notification(self, target_user_id: str, event_type: str, server_data: Dict[str, Any]) -> bool:
        return await self.publish_to_user(
            user_id=target_user_id,
            event_type=f"server.{event_type}",
            data=server_data
        )
    
    async def send_room_notification(self, target_user_id: str, event_type: str, room_data: Dict[str, Any]) -> bool:
        return await self.publish_to_user(
            user_id=target_user_id,
            event_type=f"room.{event_type}",
            data=room_data
        )

# Global instance
realtime_service = RealtimeService()