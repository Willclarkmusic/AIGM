from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from pydantic import BaseModel, EmailStr, field_validator
from typing import List, Optional
from app.db.database import get_db
from app.core.mock_auth import get_current_user
from app.models.user import User
from app.models.friendship import Friendship, FriendshipStatus
from app.services.user_service import UserService
from app.services.realtime_service import RealtimeService
from app.services.friendship_service import FriendshipService
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

class FriendRequestRequest(BaseModel):
    """Request body for sending a friend request"""
    user_id: str
    
    @field_validator('user_id')
    @classmethod
    def validate_user_id(cls, v):
        if not v or not v.strip():
            raise ValueError('User ID is required')
        return v.strip()

class FriendRequestByIdentifierRequest(BaseModel):
    """Request body for sending a friend request by username or email"""
    identifier: str  # username or email
    
    @field_validator('identifier')
    @classmethod
    def validate_identifier(cls, v):
        if not v or not v.strip():
            raise ValueError('Username or email is required')
        return v.strip()

class FriendResponse(BaseModel):
    """Friend information response"""
    id: str
    username: str
    picture_url: Optional[str]
    external_link: Optional[str]
    user_type: str
    online_status: bool = False
    created_at: str

class FriendRequestResponse(BaseModel):
    """Friend request information response"""
    id: str
    requester: FriendResponse
    friend: FriendResponse
    status: str
    created_at: str
    accepted_at: Optional[str] = None

class FriendshipStatusResponse(BaseModel):
    """Response for friendship status operations"""
    message: str
    status: str

@router.get("/", response_model=List[FriendResponse])
async def list_friends(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all accepted friends with their online status"""
    try:
        # Get all accepted friendships where current user is either requester or friend
        friendships = db.query(Friendship).filter(
            and_(
                Friendship.status == FriendshipStatus.ACCEPTED,
                or_(
                    Friendship.user_id == current_user.id,
                    Friendship.friend_id == current_user.id
                )
            )
        ).all()
        
        friends = []
        for friendship in friendships:
            # Get the friend user (not the current user)
            friend_user = None
            if friendship.user_id == current_user.id:
                friend_user = friendship.friend
            else:
                friend_user = friendship.requester
            
            if friend_user:
                # TODO: Get real online status from presence system
                online_status = False  # Placeholder for now
                
                friends.append(FriendResponse(
                    id=str(friend_user.id),
                    username=friend_user.username,
                    picture_url=friend_user.picture_url,
                    external_link=friend_user.external_link,
                    user_type=friend_user.user_type,
                    online_status=online_status,
                    created_at=friend_user.created_at.isoformat()
                ))
        
        return friends
        
    except Exception as e:
        logger.error(f"Failed to list friends: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve friends list"
        )

@router.post("/request", response_model=FriendshipStatusResponse)
async def send_friend_request(
    request_data: FriendRequestRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a friend request to another user by user ID"""
    try:
        # Prevent self-friending
        if request_data.user_id == str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot send a friend request to yourself"
            )
        
        # Check if target user exists
        user_service = UserService(db)
        target_user = await user_service.get_user_by_id(request_data.user_id)
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Check if friendship already exists
        existing_friendship = db.query(Friendship).filter(
            or_(
                and_(
                    Friendship.user_id == current_user.id,
                    Friendship.friend_id == target_user.id
                ),
                and_(
                    Friendship.user_id == target_user.id,
                    Friendship.friend_id == current_user.id
                )
            )
        ).first()
        
        if existing_friendship:
            if existing_friendship.status == FriendshipStatus.ACCEPTED:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="You are already friends with this user"
                )
            elif existing_friendship.status == FriendshipStatus.PENDING:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Friend request already pending"
                )
            elif existing_friendship.status == FriendshipStatus.REJECTED:
                # Update the existing rejected request to pending
                existing_friendship.status = FriendshipStatus.PENDING
                existing_friendship.user_id = current_user.id
                existing_friendship.friend_id = target_user.id
                db.commit()
                
                # Send real-time notification
                background_tasks.add_task(
                    send_friend_request_notification,
                    current_user,
                    target_user
                )
                
                return FriendshipStatusResponse(
                    message="Friend request sent successfully",
                    status="pending"
                )
        
        # Create new friendship
        friendship = Friendship(
            user_id=current_user.id,
            friend_id=target_user.id,
            status=FriendshipStatus.PENDING
        )
        
        db.add(friendship)
        db.commit()
        
        # Send real-time notification
        background_tasks.add_task(
            send_friend_request_notification,
            current_user,
            target_user
        )
        
        return FriendshipStatusResponse(
            message="Friend request sent successfully",
            status="pending"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to send friend request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send friend request"
        )

@router.post("/request-by-identifier", response_model=FriendshipStatusResponse)
async def send_friend_request_by_identifier(
    request_data: FriendRequestByIdentifierRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a friend request to another user by username or email"""
    try:
        user_service = UserService(db)
        
        # Try to find user by username first, then by email
        target_user = await user_service.get_user_by_username(request_data.identifier)
        if not target_user and "@" in request_data.identifier:
            target_user = await user_service.get_user_by_email(request_data.identifier)
        
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Use the existing friend request logic
        friend_request = FriendRequestRequest(user_id=str(target_user.id))
        return await send_friend_request(friend_request, background_tasks, current_user, db)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to send friend request by identifier: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send friend request"
        )

@router.get("/requests", response_model=List[FriendRequestResponse])
async def list_friend_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all pending friend requests received by the current user"""
    try:
        # Get pending requests where current user is the friend (recipient)
        pending_requests = db.query(Friendship).filter(
            and_(
                Friendship.friend_id == current_user.id,
                Friendship.status == FriendshipStatus.PENDING
            )
        ).all()
        
        requests = []
        for friendship in pending_requests:
            requests.append(FriendRequestResponse(
                id=str(friendship.id),
                requester=FriendResponse(
                    id=str(friendship.requester.id),
                    username=friendship.requester.username,
                    picture_url=friendship.requester.picture_url,
                    external_link=friendship.requester.external_link,
                    user_type=friendship.requester.user_type,
                    created_at=friendship.requester.created_at.isoformat()
                ),
                friend=FriendResponse(
                    id=str(friendship.friend.id),
                    username=friendship.friend.username,
                    picture_url=friendship.friend.picture_url,
                    external_link=friendship.friend.external_link,
                    user_type=friendship.friend.user_type,
                    created_at=friendship.friend.created_at.isoformat()
                ),
                status=friendship.status,
                created_at=friendship.created_at.isoformat(),
                accepted_at=friendship.accepted_at.isoformat() if friendship.accepted_at else None
            ))
        
        return requests
        
    except Exception as e:
        logger.error(f"Failed to list friend requests: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve friend requests"
        )

@router.post("/accept/{friendship_id}", response_model=FriendshipStatusResponse)
async def accept_friend_request(
    friendship_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Accept a friend request"""
    try:
        # Find the friendship
        friendship = db.query(Friendship).filter(
            and_(
                Friendship.id == friendship_id,
                Friendship.friend_id == current_user.id,
                Friendship.status == FriendshipStatus.PENDING
            )
        ).first()
        
        if not friendship:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Friend request not found or already processed"
            )
        
        # Update friendship status
        friendship.status = FriendshipStatus.ACCEPTED
        from datetime import datetime
        friendship.accepted_at = datetime.utcnow()
        
        db.commit()
        
        # Send real-time notification
        background_tasks.add_task(
            send_friend_accepted_notification,
            friendship.requester,
            current_user
        )
        
        return FriendshipStatusResponse(
            message="Friend request accepted",
            status="accepted"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to accept friend request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to accept friend request"
        )

@router.post("/reject/{friendship_id}", response_model=FriendshipStatusResponse)
async def reject_friend_request(
    friendship_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reject a friend request"""
    try:
        # Find the friendship
        friendship = db.query(Friendship).filter(
            and_(
                Friendship.id == friendship_id,
                Friendship.friend_id == current_user.id,
                Friendship.status == FriendshipStatus.PENDING
            )
        ).first()
        
        if not friendship:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Friend request not found or already processed"
            )
        
        # Update friendship status
        friendship.status = FriendshipStatus.REJECTED
        
        db.commit()
        
        return FriendshipStatusResponse(
            message="Friend request rejected",
            status="rejected"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to reject friend request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reject friend request"
        )

@router.delete("/{friend_id}", response_model=FriendshipStatusResponse)
async def remove_friend(
    friend_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a friend (delete friendship)"""
    try:
        # Find the friendship
        friendship = db.query(Friendship).filter(
            and_(
                Friendship.status == FriendshipStatus.ACCEPTED,
                or_(
                    and_(
                        Friendship.user_id == current_user.id,
                        Friendship.friend_id == friend_id
                    ),
                    and_(
                        Friendship.user_id == friend_id,
                        Friendship.friend_id == current_user.id
                    )
                )
            )
        ).first()
        
        if not friendship:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Friendship not found"
            )
        
        # Get the friend user for notification
        friend_user = None
        if friendship.user_id == current_user.id:
            friend_user = friendship.friend
        else:
            friend_user = friendship.requester
        
        # Delete the friendship
        db.delete(friendship)
        db.commit()
        
        # Send real-time notification
        background_tasks.add_task(
            send_friend_removed_notification,
            current_user,
            friend_user
        )
        
        return FriendshipStatusResponse(
            message="Friend removed successfully",
            status="removed"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to remove friend: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove friend"
        )

@router.get("/status/{user_id}")
async def get_friendship_status(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get friendship status with another user"""
    try:
        # Check if friendship exists
        friendship = db.query(Friendship).filter(
            or_(
                and_(
                    Friendship.user_id == current_user.id,
                    Friendship.friend_id == user_id
                ),
                and_(
                    Friendship.user_id == user_id,
                    Friendship.friend_id == current_user.id
                )
            )
        ).first()
        
        if not friendship:
            return {"status": "none", "can_send_request": True}
        
        # Determine who sent the request
        is_requester = friendship.user_id == current_user.id
        
        return {
            "status": friendship.status,
            "is_requester": is_requester,
            "can_send_request": False,
            "created_at": friendship.created_at.isoformat(),
            "accepted_at": friendship.accepted_at.isoformat() if friendship.accepted_at else None
        }
        
    except Exception as e:
        logger.error(f"Failed to get friendship status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get friendship status"
        )

# Helper functions for real-time notifications
async def send_friend_request_notification(requester: User, target: User):
    """Send real-time notification for friend request"""
    try:
        realtime_service = RealtimeService()
        await realtime_service.send_friend_request_notification(
            target_user_id=str(target.id),
            requester_data={
                "id": str(requester.id),
                "username": requester.username,
                "picture_url": requester.picture_url
            }
        )
    except Exception as e:
        logger.error(f"Failed to send friend request notification: {e}")

async def send_friend_accepted_notification(requester: User, accepter: User):
    """Send real-time notification for friend request acceptance"""
    try:
        realtime_service = RealtimeService()
        await realtime_service.send_friend_accepted_notification(
            target_user_id=str(requester.id),
            accepter_data={
                "id": str(accepter.id),
                "username": accepter.username,
                "picture_url": accepter.picture_url
            }
        )
    except Exception as e:
        logger.error(f"Failed to send friend accepted notification: {e}")

async def send_friend_removed_notification(remover: User, removed: User):
    """Send real-time notification for friend removal"""
    try:
        realtime_service = RealtimeService()
        await realtime_service.send_friend_removed_notification(
            target_user_id=str(removed.id),
            remover_data={
                "id": str(remover.id),
                "username": remover.username
            }
        )
    except Exception as e:
        logger.error(f"Failed to send friend removed notification: {e}")

@router.post("/block/{user_id}", response_model=FriendshipStatusResponse)
async def block_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Block a user"""
    try:
        # Prevent self-blocking
        if user_id == str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot block yourself"
            )
        
        # Check if target user exists
        user_service = UserService(db)
        target_user = await user_service.get_user_by_id(user_id)
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Block the user
        friendship_service = FriendshipService(db)
        success = friendship_service.block_user(str(current_user.id), user_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to block user"
            )
        
        return FriendshipStatusResponse(
            message="User blocked successfully",
            status="blocked"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to block user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to block user"
        )

@router.post("/unblock/{user_id}", response_model=FriendshipStatusResponse)
async def unblock_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unblock a user"""
    try:
        # Check if target user exists
        user_service = UserService(db)
        target_user = await user_service.get_user_by_id(user_id)
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Unblock the user
        friendship_service = FriendshipService(db)
        success = friendship_service.unblock_user(str(current_user.id), user_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User is not blocked"
            )
        
        return FriendshipStatusResponse(
            message="User unblocked successfully",
            status="unblocked"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to unblock user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unblock user"
        )

@router.get("/blocked", response_model=List[FriendResponse])
async def list_blocked_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all blocked users"""
    try:
        # Get all blocked users where current user is the blocker
        blocked_friendships = db.query(Friendship).filter(
            and_(
                Friendship.user_id == current_user.id,
                Friendship.status == FriendshipStatus.BLOCKED
            )
        ).all()
        
        blocked_users = []
        for friendship in blocked_friendships:
            blocked_user = friendship.friend
            blocked_users.append(FriendResponse(
                id=str(blocked_user.id),
                username=blocked_user.username,
                picture_url=blocked_user.picture_url,
                external_link=blocked_user.external_link,
                user_type=blocked_user.user_type,
                online_status=False,  # Blocked users are always shown as offline
                created_at=blocked_user.created_at.isoformat()
            ))
        
        return blocked_users
        
    except Exception as e:
        logger.error(f"Failed to list blocked users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve blocked users list"
        )