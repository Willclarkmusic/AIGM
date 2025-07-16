from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.models.user import User
from app.models.friendship import Friendship, FriendshipStatus
from app.models.server import UserServer
import logging

logger = logging.getLogger(__name__)

class FriendshipService:
    """Service for handling friendship operations and DM permissions"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def are_friends(self, user1_id: str, user2_id: str) -> bool:
        """Check if two users are friends (accepted friendship)"""
        friendship = self.db.query(Friendship).filter(
            and_(
                Friendship.status == FriendshipStatus.ACCEPTED,
                or_(
                    and_(
                        Friendship.user_id == user1_id,
                        Friendship.friend_id == user2_id
                    ),
                    and_(
                        Friendship.user_id == user2_id,
                        Friendship.friend_id == user1_id
                    )
                )
            )
        ).first()
        
        return friendship is not None
    
    def are_in_same_server(self, user1_id: str, user2_id: str) -> bool:
        """Check if two users are in the same server"""
        # Get all servers for user1
        user1_servers = self.db.query(UserServer.server_id).filter(
            UserServer.user_id == user1_id
        ).subquery()
        
        # Check if user2 is in any of user1's servers
        common_server = self.db.query(UserServer).filter(
            and_(
                UserServer.user_id == user2_id,
                UserServer.server_id.in_(user1_servers)
            )
        ).first()
        
        return common_server is not None
    
    def can_send_dm(self, sender_id: str, recipient_id: str) -> Tuple[bool, str]:
        """
        Check if a user can send a DM to another user.
        Returns (can_send, reason)
        
        Rules:
        - Users can DM if they are friends OR in the same server
        - Users cannot DM if they are blocked
        """
        # Check if blocked
        blocking_friendship = self.db.query(Friendship).filter(
            and_(
                Friendship.status == FriendshipStatus.BLOCKED,
                or_(
                    and_(
                        Friendship.user_id == sender_id,
                        Friendship.friend_id == recipient_id
                    ),
                    and_(
                        Friendship.user_id == recipient_id,
                        Friendship.friend_id == sender_id
                    )
                )
            )
        ).first()
        
        if blocking_friendship:
            return False, "User has blocked communication"
        
        # Check if friends
        if self.are_friends(sender_id, recipient_id):
            return True, "Users are friends"
        
        # Check if in same server
        if self.are_in_same_server(sender_id, recipient_id):
            return True, "Users are in the same server"
        
        return False, "Users are not friends and not in the same server"
    
    def get_friendship_status(self, user1_id: str, user2_id: str) -> Optional[Friendship]:
        """Get the friendship status between two users"""
        return self.db.query(Friendship).filter(
            or_(
                and_(
                    Friendship.user_id == user1_id,
                    Friendship.friend_id == user2_id
                ),
                and_(
                    Friendship.user_id == user2_id,
                    Friendship.friend_id == user1_id
                )
            )
        ).first()
    
    def get_friends_list(self, user_id: str) -> List[User]:
        """Get list of all accepted friends for a user"""
        # Get all accepted friendships where user is either requester or friend
        friendships = self.db.query(Friendship).filter(
            and_(
                Friendship.status == FriendshipStatus.ACCEPTED,
                or_(
                    Friendship.user_id == user_id,
                    Friendship.friend_id == user_id
                )
            )
        ).all()
        
        friends = []
        for friendship in friendships:
            # Get the friend user (not the current user)
            if friendship.user_id == user_id:
                friends.append(friendship.friend)
            else:
                friends.append(friendship.requester)
        
        return friends
    
    def get_friend_ids(self, user_id: str) -> List[str]:
        """Get list of friend user IDs for notifications"""
        friends = self.get_friends_list(user_id)
        return [str(friend.id) for friend in friends]
    
    def get_pending_requests_received(self, user_id: str) -> List[Friendship]:
        """Get all pending friend requests received by a user"""
        return self.db.query(Friendship).filter(
            and_(
                Friendship.friend_id == user_id,
                Friendship.status == FriendshipStatus.PENDING
            )
        ).all()
    
    def get_pending_requests_sent(self, user_id: str) -> List[Friendship]:
        """Get all pending friend requests sent by a user"""
        return self.db.query(Friendship).filter(
            and_(
                Friendship.user_id == user_id,
                Friendship.status == FriendshipStatus.PENDING
            )
        ).all()
    
    def block_user(self, blocker_id: str, blocked_id: str) -> bool:
        """Block a user (creates or updates friendship to blocked status)"""
        try:
            # Check if friendship already exists
            existing_friendship = self.get_friendship_status(blocker_id, blocked_id)
            
            if existing_friendship:
                # Update existing friendship to blocked
                existing_friendship.status = FriendshipStatus.BLOCKED
                existing_friendship.user_id = blocker_id  # Blocker is always the user_id
                existing_friendship.friend_id = blocked_id
                existing_friendship.accepted_at = None
            else:
                # Create new blocked friendship
                new_friendship = Friendship(
                    user_id=blocker_id,
                    friend_id=blocked_id,
                    status=FriendshipStatus.BLOCKED
                )
                self.db.add(new_friendship)
            
            self.db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Failed to block user: {e}")
            self.db.rollback()
            return False
    
    def unblock_user(self, blocker_id: str, blocked_id: str) -> bool:
        """Unblock a user (removes blocked friendship)"""
        try:
            blocked_friendship = self.db.query(Friendship).filter(
                and_(
                    Friendship.user_id == blocker_id,
                    Friendship.friend_id == blocked_id,
                    Friendship.status == FriendshipStatus.BLOCKED
                )
            ).first()
            
            if blocked_friendship:
                self.db.delete(blocked_friendship)
                self.db.commit()
                return True
            
            return False  # No blocked relationship found
            
        except Exception as e:
            logger.error(f"Failed to unblock user: {e}")
            self.db.rollback()
            return False
    
    def is_blocked(self, user1_id: str, user2_id: str) -> bool:
        """Check if either user has blocked the other"""
        blocked_friendship = self.db.query(Friendship).filter(
            and_(
                Friendship.status == FriendshipStatus.BLOCKED,
                or_(
                    and_(
                        Friendship.user_id == user1_id,
                        Friendship.friend_id == user2_id
                    ),
                    and_(
                        Friendship.user_id == user2_id,
                        Friendship.friend_id == user1_id
                    )
                )
            )
        ).first()
        
        return blocked_friendship is not None