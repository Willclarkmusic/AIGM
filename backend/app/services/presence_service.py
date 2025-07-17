from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.models.user import User
from app.models.friendship import Friendship, FriendshipStatus
from app.services.realtime_service import realtime_service
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class PresenceService:
    """Service for managing user presence and online status"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def update_user_status(
        self,
        user: User,
        status: str,  # "online", "offline", "away", "busy"
        metadata: Dict[str, Any] = None
    ) -> bool:
        """Update user's online status and notify friends"""
        try:
            # Get user's friends
            friends = self.db.query(Friendship).filter(
                and_(
                    Friendship.status == FriendshipStatus.ACCEPTED,
                    or_(
                        Friendship.user_id == user.id,
                        Friendship.friend_id == user.id
                    )
                )
            ).all()
            
            friend_ids = []
            for friendship in friends:
                if friendship.user_id == user.id:
                    friend_ids.append(str(friendship.friend_id))
                else:
                    friend_ids.append(str(friendship.user_id))
            
            # Prepare user data for presence notification
            user_data = {
                "id": str(user.id),
                "username": user.username,
                "picture_url": user.picture_url,
                "user_type": user.user_type,
                "last_seen": datetime.utcnow().isoformat()
            }
            
            if metadata:
                user_data.update(metadata)
            
            # Publish presence update to friends
            success = await realtime_service.publish_user_presence(
                user_id=str(user.id),
                status=status,
                user_data=user_data,
                friend_user_ids=friend_ids
            )
            
            if success:
                logger.info(f"Updated presence for user {user.id} to {status}")
            else:
                logger.warning(f"Failed to update presence for user {user.id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to update user status: {e}")
            return False
    
    async def user_online(
        self,
        user: User,
        metadata: Dict[str, Any] = None
    ) -> bool:
        """Mark user as online and notify friends"""
        return await self.update_user_status(user, "online", metadata)
    
    async def user_offline(
        self,
        user: User,
        metadata: Dict[str, Any] = None
    ) -> bool:
        """Mark user as offline and notify friends"""
        return await self.update_user_status(user, "offline", metadata)
    
    async def user_away(
        self,
        user: User,
        metadata: Dict[str, Any] = None
    ) -> bool:
        """Mark user as away and notify friends"""
        return await self.update_user_status(user, "away", metadata)
    
    async def user_busy(
        self,
        user: User,
        metadata: Dict[str, Any] = None
    ) -> bool:
        """Mark user as busy and notify friends"""
        return await self.update_user_status(user, "busy", metadata)
    
    async def enter_channel_presence(
        self,
        user: User,
        channel_type: str,  # "room", "dm", "server"
        channel_id: str,
        additional_data: Dict[str, Any] = None
    ) -> bool:
        """Enter presence on a specific channel"""
        try:
            # Determine channel name based on type
            if channel_type == "room":
                # For room channels, we need server_id:room_id format
                # This should be passed as "server_id:room_id"
                channel_name = f"room:{channel_id}"
            elif channel_type == "dm":
                channel_name = f"dm:{channel_id}"
            elif channel_type == "server":
                channel_name = f"server:{channel_id}"
            else:
                logger.error(f"Unknown channel type: {channel_type}")
                return False
            
            # Prepare user data for presence
            user_data = {
                "id": str(user.id),
                "username": user.username,
                "picture_url": user.picture_url,
                "user_type": user.user_type,
                "entered_at": datetime.utcnow().isoformat()
            }
            
            if additional_data:
                user_data.update(additional_data)
            
            # Enter presence on the channel
            success = await realtime_service.enter_presence(
                user_id=str(user.id),
                channel_name=channel_name,
                user_data=user_data
            )
            
            if success:
                logger.info(f"User {user.id} entered presence on {channel_name}")
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to enter channel presence: {e}")
            return False
    
    async def leave_channel_presence(
        self,
        user: User,
        channel_type: str,
        channel_id: str,
        additional_data: Dict[str, Any] = None
    ) -> bool:
        """Leave presence on a specific channel"""
        try:
            # Determine channel name based on type
            if channel_type == "room":
                channel_name = f"room:{channel_id}"
            elif channel_type == "dm":
                channel_name = f"dm:{channel_id}"
            elif channel_type == "server":
                channel_name = f"server:{channel_id}"
            else:
                logger.error(f"Unknown channel type: {channel_type}")
                return False
            
            # Prepare user data for presence
            user_data = {
                "id": str(user.id),
                "username": user.username,
                "left_at": datetime.utcnow().isoformat()
            }
            
            if additional_data:
                user_data.update(additional_data)
            
            # Leave presence on the channel
            success = await realtime_service.leave_presence(
                user_id=str(user.id),
                channel_name=channel_name,
                user_data=user_data
            )
            
            if success:
                logger.info(f"User {user.id} left presence on {channel_name}")
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to leave channel presence: {e}")
            return False
    
    def get_user_friends(self, user: User) -> List[str]:
        """Get list of user's friend IDs"""
        try:
            friends = self.db.query(Friendship).filter(
                and_(
                    Friendship.status == FriendshipStatus.ACCEPTED,
                    or_(
                        Friendship.user_id == user.id,
                        Friendship.friend_id == user.id
                    )
                )
            ).all()
            
            friend_ids = []
            for friendship in friends:
                if friendship.user_id == user.id:
                    friend_ids.append(str(friendship.friend_id))
                else:
                    friend_ids.append(str(friendship.user_id))
            
            return friend_ids
            
        except Exception as e:
            logger.error(f"Failed to get user friends: {e}")
            return []