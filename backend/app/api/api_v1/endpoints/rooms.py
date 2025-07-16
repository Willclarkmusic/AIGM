from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from pydantic import BaseModel, validator
from typing import List, Optional
from app.db.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.server import Server, UserServer
from app.models.room import Room, UserRoom
from app.services.realtime_service import RealtimeService
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter()

# Pydantic schemas
class CreateRoomRequest(BaseModel):
    """Request body for creating a room"""
    server_id: str
    name: str
    is_private: bool = False
    
    @validator('name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Room name is required')
        if len(v.strip()) > 100:
            raise ValueError('Room name must be 100 characters or less')
        return v.strip()
    
    @validator('server_id')
    def validate_server_id(cls, v):
        if not v or not v.strip():
            raise ValueError('Server ID is required')
        return v.strip()

class UpdateRoomRequest(BaseModel):
    """Request body for updating a room"""
    name: Optional[str] = None
    is_private: Optional[bool] = None
    
    @validator('name')
    def validate_name(cls, v):
        if v is not None:
            if not v or not v.strip():
                raise ValueError('Room name cannot be empty')
            if len(v.strip()) > 100:
                raise ValueError('Room name must be 100 characters or less')
            return v.strip()
        return v

class RoomMemberResponse(BaseModel):
    """Room member information response"""
    id: str
    username: str
    picture_url: Optional[str]
    user_type: str
    role: str
    joined_at: str
    last_read_at: Optional[str] = None

class RoomResponse(BaseModel):
    """Room information response"""
    id: str
    server_id: str
    name: str
    is_private: bool
    created_by: str
    created_at: str
    member_count: int
    user_role: Optional[str] = None

class RoomWithMembersResponse(BaseModel):
    """Detailed room response with members"""
    id: str
    server_id: str
    name: str
    is_private: bool
    created_by: str
    created_at: str
    members: List[RoomMemberResponse]

class RoomStatusResponse(BaseModel):
    """Response for room operations"""
    message: str
    room_id: Optional[str] = None

@router.post("/", response_model=RoomStatusResponse)
async def create_room(
    request_data: CreateRoomRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new room in a server"""
    try:
        # Check if user is member of the server with admin/owner role
        user_server = db.query(UserServer).filter(
            and_(
                UserServer.user_id == current_user.id,
                UserServer.server_id == request_data.server_id,
                UserServer.role.in_(["owner", "admin"])
            )
        ).first()
        
        if not user_server:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to create rooms in this server"
            )
        
        # Verify server exists
        server = db.query(Server).filter(Server.id == request_data.server_id).first()
        if not server:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Server not found"
            )
        
        # Check if room name already exists in this server
        existing_room = db.query(Room).filter(
            and_(
                Room.server_id == request_data.server_id,
                Room.name == request_data.name
            )
        ).first()
        
        if existing_room:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A room with this name already exists in the server"
            )
        
        # Create room
        room = Room(
            server_id=request_data.server_id,
            name=request_data.name,
            is_private=request_data.is_private,
            created_by=current_user.id
        )
        
        db.add(room)
        db.flush()  # Get room ID
        
        # Add creator as owner member
        user_room = UserRoom(
            user_id=current_user.id,
            room_id=room.id,
            role="owner"
        )
        
        db.add(user_room)
        db.commit()
        
        # Send real-time notification to server members
        background_tasks.add_task(
            send_room_created_notification,
            current_user,
            room,
            server
        )
        
        return RoomStatusResponse(
            message="Room created successfully",
            room_id=str(room.id)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create room: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create room"
        )

@router.get("/server/{server_id}", response_model=List[RoomResponse])
async def get_server_rooms(
    server_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all rooms in a server that user has access to"""
    try:
        # Check if user is member of the server
        user_server = db.query(UserServer).filter(
            and_(
                UserServer.user_id == current_user.id,
                UserServer.server_id == server_id
            )
        ).first()
        
        if not user_server:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Server not found or you are not a member"
            )
        
        # Get all rooms in the server
        rooms = db.query(Room).filter(Room.server_id == server_id).all()
        
        room_responses = []
        for room in rooms:
            # Check if user has access to this room
            user_room = db.query(UserRoom).filter(
                and_(
                    UserRoom.user_id == current_user.id,
                    UserRoom.room_id == room.id
                )
            ).first()
            
            # If room is private and user is not a member, skip
            if room.is_private and not user_room:
                continue
            
            # Get member count
            member_count = db.query(UserRoom).filter(
                UserRoom.room_id == room.id
            ).count()
            
            room_responses.append(RoomResponse(
                id=str(room.id),
                server_id=str(room.server_id),
                name=room.name,
                is_private=room.is_private,
                created_by=str(room.created_by),
                created_at=room.created_at.isoformat(),
                member_count=member_count,
                user_role=user_room.role if user_room else None
            ))
        
        return room_responses
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get server rooms: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve rooms"
        )

@router.get("/{room_id}", response_model=RoomWithMembersResponse)
async def get_room(
    room_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get room by ID with member list"""
    try:
        # Get room
        room = db.query(Room).filter(Room.id == room_id).first()
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room not found"
            )
        
        # Check if user has access to this room
        user_room = db.query(UserRoom).filter(
            and_(
                UserRoom.user_id == current_user.id,
                UserRoom.room_id == room_id
            )
        ).first()
        
        # Check if user is member of the server
        user_server = db.query(UserServer).filter(
            and_(
                UserServer.user_id == current_user.id,
                UserServer.server_id == room.server_id
            )
        ).first()
        
        if not user_server:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room not found or you don't have access"
            )
        
        # If room is private and user is not a member, deny access
        if room.is_private and not user_room:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this private room"
            )
        
        # Get all members
        members_data = db.query(UserRoom, User).join(
            User, UserRoom.user_id == User.id
        ).filter(UserRoom.room_id == room_id).all()
        
        members = []
        for user_room_rel, user in members_data:
            members.append(RoomMemberResponse(
                id=str(user.id),
                username=user.username,
                picture_url=user.picture_url,
                user_type=user.user_type,
                role=user_room_rel.role,
                joined_at=user_room_rel.joined_at.isoformat(),
                last_read_at=user_room_rel.last_read_at.isoformat() if user_room_rel.last_read_at else None
            ))
        
        return RoomWithMembersResponse(
            id=str(room.id),
            server_id=str(room.server_id),
            name=room.name,
            is_private=room.is_private,
            created_by=str(room.created_by),
            created_at=room.created_at.isoformat(),
            members=members
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get room: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve room"
        )

@router.patch("/{room_id}", response_model=RoomStatusResponse)
async def update_room(
    room_id: str,
    request_data: UpdateRoomRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update room information (owner/admin only)"""
    try:
        # Check if user has permission (room owner/admin or server owner/admin)
        user_room = db.query(UserRoom).filter(
            and_(
                UserRoom.user_id == current_user.id,
                UserRoom.room_id == room_id,
                UserRoom.role.in_(["owner", "admin"])
            )
        ).first()
        
        # Get room to check server permissions
        room = db.query(Room).filter(Room.id == room_id).first()
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room not found"
            )
        
        # Also allow server admins/owners to update rooms
        user_server = db.query(UserServer).filter(
            and_(
                UserServer.user_id == current_user.id,
                UserServer.server_id == room.server_id,
                UserServer.role.in_(["owner", "admin"])
            )
        ).first()
        
        if not user_room and not user_server:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to update this room"
            )
        
        # Update fields
        if request_data.name is not None:
            # Check if new name conflicts with existing room in server
            existing_room = db.query(Room).filter(
                and_(
                    Room.server_id == room.server_id,
                    Room.name == request_data.name,
                    Room.id != room_id
                )
            ).first()
            
            if existing_room:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A room with this name already exists in the server"
                )
            
            room.name = request_data.name
        
        if request_data.is_private is not None:
            room.is_private = request_data.is_private
        
        db.commit()
        
        return RoomStatusResponse(
            message="Room updated successfully",
            room_id=str(room.id)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update room: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update room"
        )

@router.delete("/{room_id}", response_model=RoomStatusResponse)
async def delete_room(
    room_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete room (owner or server owner/admin only)"""
    try:
        # Get room
        room = db.query(Room).filter(Room.id == room_id).first()
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room not found"
            )
        
        # Check if user has permission (room owner or server owner/admin)
        user_room = db.query(UserRoom).filter(
            and_(
                UserRoom.user_id == current_user.id,
                UserRoom.room_id == room_id,
                UserRoom.role == "owner"
            )
        ).first()
        
        user_server = db.query(UserServer).filter(
            and_(
                UserServer.user_id == current_user.id,
                UserServer.server_id == room.server_id,
                UserServer.role.in_(["owner", "admin"])
            )
        ).first()
        
        if not user_room and not user_server:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to delete this room"
            )
        
        # Delete room (cascade will handle messages and memberships)
        db.delete(room)
        db.commit()
        
        return RoomStatusResponse(
            message="Room deleted successfully",
            room_id=str(room_id)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete room: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete room"
        )

@router.post("/{room_id}/join", response_model=RoomStatusResponse)
async def join_room(
    room_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Join room (must be server member first)"""
    try:
        # Get room
        room = db.query(Room).filter(Room.id == room_id).first()
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room not found"
            )
        
        # Check if user is member of the server
        user_server = db.query(UserServer).filter(
            and_(
                UserServer.user_id == current_user.id,
                UserServer.server_id == room.server_id
            )
        ).first()
        
        if not user_server:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be a server member to join rooms"
            )
        
        # Check if user is already a room member
        existing_membership = db.query(UserRoom).filter(
            and_(
                UserRoom.user_id == current_user.id,
                UserRoom.room_id == room_id
            )
        ).first()
        
        if existing_membership:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You are already a member of this room"
            )
        
        # If room is private, deny access
        if room.is_private:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot join private room. You must be invited by an admin."
            )
        
        # Add user as member
        user_room = UserRoom(
            user_id=current_user.id,
            room_id=room_id,
            role="member"
        )
        
        db.add(user_room)
        db.commit()
        
        # Send real-time notification
        background_tasks.add_task(
            send_user_joined_room_notification,
            current_user,
            room
        )
        
        return RoomStatusResponse(
            message=f"Successfully joined room '{room.name}'",
            room_id=str(room_id)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to join room: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to join room"
        )

@router.post("/{room_id}/leave", response_model=RoomStatusResponse)
async def leave_room(
    room_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Leave room (cannot leave if owner)"""
    try:
        # Get user's room membership
        user_room = db.query(UserRoom).filter(
            and_(
                UserRoom.user_id == current_user.id,
                UserRoom.room_id == room_id
            )
        ).first()
        
        if not user_room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="You are not a member of this room"
            )
        
        if user_room.role == "owner":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Room owner cannot leave. Transfer ownership or delete the room instead."
            )
        
        # Remove membership
        db.delete(user_room)
        db.commit()
        
        return RoomStatusResponse(
            message="Successfully left the room",
            room_id=str(room_id)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to leave room: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to leave room"
        )

# Helper functions for real-time notifications
async def send_room_created_notification(creator: User, room: Room, server: Server):
    """Send real-time notification for room creation"""
    try:
        realtime_service = RealtimeService()
        
        # Note: This would require db session - for now just notify creator
        await realtime_service.send_room_notification(
            target_user_id=str(creator.id),
            event_type="room_created",
            room_data={
                "id": str(room.id),
                "name": room.name,
                "server_id": str(server.id),
                "server_name": server.name,
                "creator": {
                    "id": str(creator.id),
                    "username": creator.username
                }
            }
        )
    except Exception as e:
        logger.error(f"Failed to send room created notification: {e}")

async def send_user_joined_room_notification(user: User, room: Room):
    """Send real-time notification when user joins room"""
    try:
        realtime_service = RealtimeService()
        
        # Note: This would require db session - for now just log the event
        logger.info(f"User {user.username} joined room {room.name}")
        
        await realtime_service.send_room_notification(
            target_user_id=str(user.id),
            event_type="user_joined_room",
            room_data={
                "id": str(room.id),
                "name": room.name,
                "member": {
                    "id": str(user.id),
                    "username": user.username
                }
            }
        )
    except Exception as e:
        logger.error(f"Failed to send user joined room notification: {e}")