from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from pydantic import BaseModel, field_validator
from typing import Optional, Dict, Any
from app.db.database import get_db
from app.core.mock_auth import get_current_user
from app.models.user import User
from app.models.server import UserServer
from app.models.room import UserRoom
from app.models.friendship import DirectConversationMember
from app.services.realtime_service import realtime_service
from app.services.presence_service import PresenceService

router = APIRouter()

# Pydantic schemas for presence
class UpdateStatusRequest(BaseModel):
    """Request body for updating user status"""
    status: str
    metadata: Optional[Dict[str, Any]] = None
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        allowed_statuses = ["online", "offline", "away", "busy"]
        if v not in allowed_statuses:
            raise ValueError(f"Status must be one of: {', '.join(allowed_statuses)}")
        return v

class ChannelPresenceRequest(BaseModel):
    """Request body for channel presence"""
    channel_type: str
    channel_id: str
    metadata: Optional[Dict[str, Any]] = None
    
    @field_validator('channel_type')
    @classmethod
    def validate_channel_type(cls, v):
        allowed_types = ["room", "dm", "server"]
        if v not in allowed_types:
            raise ValueError(f"Channel type must be one of: {', '.join(allowed_types)}")
        return v
    
    @field_validator('channel_id')
    @classmethod
    def validate_channel_id(cls, v):
        if not v or not v.strip():
            raise ValueError("Channel ID is required")
        return v.strip()

class StatusResponse(BaseModel):
    """Response for status operations"""
    message: str
    status: Optional[str] = None

@router.get("/ably-token")
async def get_ably_token(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate Ably token for authenticated user with proper channel capabilities"""
    try:
        # Get user's servers
        user_servers = db.query(UserServer.server_id).filter(
            UserServer.user_id == current_user.id
        ).all()
        server_ids = [str(server.server_id) for server in user_servers]
        
        # Get user's rooms (with server context)
        from app.models.room import Room
        user_rooms = db.query(UserRoom, Room).join(
            Room, UserRoom.room_id == Room.id
        ).filter(UserRoom.user_id == current_user.id).all()
        
        room_channels = []
        for user_room, room in user_rooms:
            room_channels.append(f"{room.server_id}:{user_room.room_id}")
        
        # Get user's DM conversations
        user_conversations = db.query(DirectConversationMember.conversation_id).filter(
            DirectConversationMember.user_id == current_user.id
        ).all()
        conversation_ids = [str(conv.conversation_id) for conv in user_conversations]
        
        # Generate token with specific capabilities
        token_request = realtime_service.generate_token_request(
            user=current_user,
            user_servers=server_ids,
            user_rooms=room_channels,
            user_conversations=conversation_ids
        )
        
        if not token_request:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate Ably token"
            )
        
        return token_request
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate Ably token: {str(e)}"
        )

@router.post("/status", response_model=StatusResponse)
async def update_user_status(
    request_data: UpdateStatusRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user's online status and notify friends"""
    try:
        presence_service = PresenceService(db)
        
        success = await presence_service.update_user_status(
            user=current_user,
            status=request_data.status,
            metadata=request_data.metadata
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update user status"
            )
        
        return StatusResponse(
            message=f"Status updated to {request_data.status}",
            status=request_data.status
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update status: {str(e)}"
        )

@router.post("/presence/enter", response_model=StatusResponse)
async def enter_channel_presence(
    request_data: ChannelPresenceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Enter presence on a specific channel"""
    try:
        presence_service = PresenceService(db)
        
        success = await presence_service.enter_channel_presence(
            user=current_user,
            channel_type=request_data.channel_type,
            channel_id=request_data.channel_id,
            additional_data=request_data.metadata
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to enter channel presence"
            )
        
        return StatusResponse(
            message=f"Entered presence on {request_data.channel_type}:{request_data.channel_id}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to enter presence: {str(e)}"
        )

@router.post("/presence/leave", response_model=StatusResponse)
async def leave_channel_presence(
    request_data: ChannelPresenceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Leave presence on a specific channel"""
    try:
        presence_service = PresenceService(db)
        
        success = await presence_service.leave_channel_presence(
            user=current_user,
            channel_type=request_data.channel_type,
            channel_id=request_data.channel_id,
            additional_data=request_data.metadata
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to leave channel presence"
            )
        
        return StatusResponse(
            message=f"Left presence on {request_data.channel_type}:{request_data.channel_id}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to leave presence: {str(e)}"
        )