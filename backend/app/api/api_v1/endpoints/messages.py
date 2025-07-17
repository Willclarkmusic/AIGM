from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc
from pydantic import BaseModel, field_validator, ValidationInfo
from typing import List, Optional, Union
from app.db.database import get_db
from app.core.mock_auth import get_current_user
from app.models.user import User
from app.models.message import Message, MessageReaction, File
from app.models.room import Room, UserRoom
from app.models.server import UserServer
from app.models.friendship import DirectConversation, DirectConversationMember
from app.services.realtime_service import RealtimeService
from app.services.friendship_service import FriendshipService
import logging
from datetime import datetime
import re

logger = logging.getLogger(__name__)
router = APIRouter()

# Pydantic schemas
class CreateMessageRequest(BaseModel):
    """Request body for creating a message"""
    content: Optional[str] = None
    room_id: Optional[str] = None
    conversation_id: Optional[str] = None
    parent_message_id: Optional[str] = None
    files: Optional[List[dict]] = None
    
    @field_validator('content')
    @classmethod
    def validate_content(cls, v, info: ValidationInfo):
        # Content is required unless there are files
        if not v and not info.data.get('files'):
            raise ValueError('Message must have content or files')
        if v and len(v.strip()) > 4000:
            raise ValueError('Message content must be 4000 characters or less')
        return v.strip() if v else None
    
    @field_validator('conversation_id')
    @classmethod
    def validate_target(cls, v, info: ValidationInfo):
        room_id = info.data.get('room_id')
        conversation_id = v
        
        # Exactly one of room_id or conversation_id must be provided
        if not room_id and not conversation_id:
            raise ValueError('Either room_id or conversation_id must be provided')
        if room_id and conversation_id:
            raise ValueError('Cannot specify both room_id and conversation_id')
        
        return v

class UpdateMessageRequest(BaseModel):
    """Request body for updating a message"""
    content: str
    
    @field_validator('content')
    @classmethod
    def validate_content(cls, v):
        if not v or not v.strip():
            raise ValueError('Message content is required')
        if len(v.strip()) > 4000:
            raise ValueError('Message content must be 4000 characters or less')
        return v.strip()

class AddReactionRequest(BaseModel):
    """Request body for adding a reaction"""
    emoji: str
    
    @field_validator('emoji')
    @classmethod
    def validate_emoji(cls, v):
        if not v or not v.strip():
            raise ValueError('Emoji is required')
        # Basic emoji validation - should be 1-4 characters
        if len(v.strip()) > 4:
            raise ValueError('Invalid emoji format')
        return v.strip()

class RemoveReactionRequest(BaseModel):
    """Request body for removing a reaction"""
    emoji: str
    
    @field_validator('emoji')
    @classmethod
    def validate_emoji(cls, v):
        if not v or not v.strip():
            raise ValueError('Emoji is required')
        return v.strip()

class TypingRequest(BaseModel):
    """Request body for typing indicators"""
    room_id: Optional[str] = None
    conversation_id: Optional[str] = None
    
    @field_validator('conversation_id')
    @classmethod
    def validate_target(cls, v, info: ValidationInfo):
        room_id = info.data.get('room_id')
        conversation_id = v
        
        if not room_id and not conversation_id:
            raise ValueError('Either room_id or conversation_id must be provided')
        if room_id and conversation_id:
            raise ValueError('Cannot specify both room_id and conversation_id')
        
        return v

class FileResponse(BaseModel):
    """File attachment response"""
    id: str
    file_name: str
    file_size: int
    mime_type: str
    s3_key: str
    thumbnail_s3_key: Optional[str] = None
    uploaded_at: str

class ReactionResponse(BaseModel):
    """Reaction response"""
    id: str
    emoji: str
    user_id: str
    username: str
    created_at: str

class MessageResponse(BaseModel):
    """Message response"""
    id: str
    content: Optional[str]
    user_id: str
    username: str
    user_picture_url: Optional[str]
    room_id: Optional[str] = None
    conversation_id: Optional[str] = None
    parent_message_id: Optional[str] = None
    created_at: str
    edited_at: Optional[str] = None
    files: List[FileResponse] = []
    reactions: List[ReactionResponse] = []
    reply_count: int = 0

class MessageStatusResponse(BaseModel):
    """Response for message operations"""
    message: str
    message_id: Optional[str] = None

class ConversationRequest(BaseModel):
    """Request body for creating/getting DM conversation"""
    user_id: str
    
    @field_validator('user_id')
    @classmethod
    def validate_user_id(cls, v):
        if not v or not v.strip():
            raise ValueError('User ID is required')
        return v.strip()

class ConversationResponse(BaseModel):
    """DM conversation response"""
    id: str
    other_user: dict
    created_at: str
    last_message: Optional[MessageResponse] = None

@router.post("/", response_model=MessageResponse)
async def create_message(
    request_data: CreateMessageRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new message in room or DM conversation"""
    try:
        # Validate access to target (room or conversation)
        if request_data.room_id:
            # Validate room access
            room = db.query(Room).filter(Room.id == request_data.room_id).first()
            if not room:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Room not found"
                )
            
            # Check if user is room member or server member
            user_room = db.query(UserRoom).filter(
                and_(
                    UserRoom.user_id == current_user.id,
                    UserRoom.room_id == request_data.room_id
                )
            ).first()
            
            user_server = db.query(UserServer).filter(
                and_(
                    UserServer.user_id == current_user.id,
                    UserServer.server_id == room.server_id
                )
            ).first()
            
            if not user_room and not user_server:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have access to this room"
                )
            
            # If room is private and user is not room member, deny access
            if room.is_private and not user_room:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have access to this private room"
                )
        
        elif request_data.conversation_id:
            # Validate conversation access
            conversation = db.query(DirectConversation).filter(
                DirectConversation.id == request_data.conversation_id
            ).first()
            
            if not conversation:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Conversation not found"
                )
            
            # Check if user is member of conversation
            member = db.query(DirectConversationMember).filter(
                and_(
                    DirectConversationMember.conversation_id == request_data.conversation_id,
                    DirectConversationMember.user_id == current_user.id
                )
            ).first()
            
            if not member:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not a member of this conversation"
                )
        
        # Validate parent message if replying
        if request_data.parent_message_id:
            parent_message = db.query(Message).filter(
                Message.id == request_data.parent_message_id
            ).first()
            
            if not parent_message:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Parent message not found"
                )
            
            # Ensure parent message is in same room/conversation
            if request_data.room_id and parent_message.room_id != request_data.room_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Parent message is not in the same room"
                )
            
            if request_data.conversation_id and parent_message.conversation_id != request_data.conversation_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Parent message is not in the same conversation"
                )
        
        # Create message
        message = Message(
            content=request_data.content,
            user_id=current_user.id,
            room_id=request_data.room_id,
            conversation_id=request_data.conversation_id,
            parent_message_id=request_data.parent_message_id
        )
        
        db.add(message)
        db.flush()  # Get message ID
        
        # Handle file attachments
        file_responses = []
        if request_data.files:
            for file_data in request_data.files:
                file_attachment = File(
                    message_id=message.id,
                    file_name=file_data.get('file_name'),
                    file_size=file_data.get('file_size'),
                    mime_type=file_data.get('mime_type'),
                    s3_key=file_data.get('s3_key'),
                    thumbnail_s3_key=file_data.get('thumbnail_s3_key')
                )
                db.add(file_attachment)
                db.flush()
                
                file_responses.append(FileResponse(
                    id=str(file_attachment.id),
                    file_name=file_attachment.file_name,
                    file_size=file_attachment.file_size,
                    mime_type=file_attachment.mime_type,
                    s3_key=file_attachment.s3_key,
                    thumbnail_s3_key=file_attachment.thumbnail_s3_key,
                    uploaded_at=file_attachment.uploaded_at.isoformat()
                ))
        
        db.commit()
        
        # Prepare response
        message_response = MessageResponse(
            id=str(message.id),
            content=message.content,
            user_id=str(current_user.id),
            username=current_user.username,
            user_picture_url=current_user.picture_url,
            room_id=str(message.room_id) if message.room_id else None,
            conversation_id=str(message.conversation_id) if message.conversation_id else None,
            parent_message_id=str(message.parent_message_id) if message.parent_message_id else None,
            created_at=message.created_at.isoformat(),
            files=file_responses,
            reactions=[],
            reply_count=0
        )
        
        # Send real-time notification
        server_id = None
        if request_data.room_id:
            # Get server_id from room
            server_id = str(room.server_id) if room else None
        
        background_tasks.add_task(
            send_message_created_notification,
            message_response,
            current_user,
            server_id
        )
        
        return message_response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create message"
        )

@router.get("/room/{room_id}", response_model=List[MessageResponse])
async def get_room_messages(
    room_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=100),
    before: Optional[str] = Query(None),
    after: Optional[str] = Query(None)
):
    """Get messages for a room with pagination"""
    try:
        # Validate room access
        room = db.query(Room).filter(Room.id == room_id).first()
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room not found"
            )
        
        # Check access
        user_room = db.query(UserRoom).filter(
            and_(
                UserRoom.user_id == current_user.id,
                UserRoom.room_id == room_id
            )
        ).first()
        
        user_server = db.query(UserServer).filter(
            and_(
                UserServer.user_id == current_user.id,
                UserServer.server_id == room.server_id
            )
        ).first()
        
        if not user_room and not user_server:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this room"
            )
        
        if room.is_private and not user_room:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this private room"
            )
        
        # Build query with pagination
        query = db.query(Message).filter(Message.room_id == room_id)
        
        if before:
            # Get messages before this message (older)
            before_message = db.query(Message).filter(Message.id == before).first()
            if before_message:
                query = query.filter(Message.created_at < before_message.created_at)
        
        if after:
            # Get messages after this message (newer)
            after_message = db.query(Message).filter(Message.id == after).first()
            if after_message:
                query = query.filter(Message.created_at > after_message.created_at)
                query = query.order_by(asc(Message.created_at))
            else:
                query = query.order_by(desc(Message.created_at))
        else:
            query = query.order_by(desc(Message.created_at))
        
        messages = query.limit(limit).all()
        
        # Convert to response format
        return await format_messages_response(messages, db)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get room messages: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve messages"
        )

@router.get("/conversation/{conversation_id}", response_model=List[MessageResponse])
async def get_conversation_messages(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=100),
    before: Optional[str] = Query(None),
    after: Optional[str] = Query(None)
):
    """Get messages for a DM conversation with pagination"""
    try:
        # Validate conversation access
        conversation = db.query(DirectConversation).filter(
            DirectConversation.id == conversation_id
        ).first()
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        # Check if user is member
        member = db.query(DirectConversationMember).filter(
            and_(
                DirectConversationMember.conversation_id == conversation_id,
                DirectConversationMember.user_id == current_user.id
            )
        ).first()
        
        if not member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this conversation"
            )
        
        # Build query with pagination
        query = db.query(Message).filter(Message.conversation_id == conversation_id)
        
        if before:
            before_message = db.query(Message).filter(Message.id == before).first()
            if before_message:
                query = query.filter(Message.created_at < before_message.created_at)
        
        if after:
            after_message = db.query(Message).filter(Message.id == after).first()
            if after_message:
                query = query.filter(Message.created_at > after_message.created_at)
                query = query.order_by(asc(Message.created_at))
            else:
                query = query.order_by(desc(Message.created_at))
        else:
            query = query.order_by(desc(Message.created_at))
        
        messages = query.limit(limit).all()
        
        return await format_messages_response(messages, db)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get conversation messages: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve messages"
        )

@router.patch("/{message_id}", response_model=MessageResponse)
async def update_message(
    message_id: str,
    request_data: UpdateMessageRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update message content (author only)"""
    try:
        # Get message
        message = db.query(Message).filter(Message.id == message_id).first()
        if not message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found"
            )
        
        # Check if user is author
        if message.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only edit your own messages"
            )
        
        # Update message
        message.content = request_data.content
        message.edited_at = datetime.utcnow()
        
        db.commit()
        
        # Format response
        messages = await format_messages_response([message], db)
        message_response = messages[0] if messages else None
        
        if message_response:
            # Get server_id from room if it's a room message
            server_id = None
            if message.room_id:
                room = db.query(Room).filter(Room.id == message.room_id).first()
                server_id = str(room.server_id) if room else None
            
            # Send real-time notification
            background_tasks.add_task(
                send_message_updated_notification,
                message_response,
                current_user,
                server_id
            )
        
        return message_response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update message"
        )

@router.delete("/{message_id}", response_model=MessageStatusResponse)
async def delete_message(
    message_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete message (author only)"""
    try:
        # Get message
        message = db.query(Message).filter(Message.id == message_id).first()
        if not message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found"
            )
        
        # Check if user is author
        if message.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own messages"
            )
        
        # Store info for notification before deletion
        room_id = str(message.room_id) if message.room_id else None
        conversation_id = str(message.conversation_id) if message.conversation_id else None
        
        # Get server_id if it's a room message
        server_id = None
        if message.room_id:
            room = db.query(Room).filter(Room.id == message.room_id).first()
            server_id = str(room.server_id) if room else None
        
        # Delete message (cascade will handle files and reactions)
        db.delete(message)
        db.commit()
        
        # Send real-time notification
        background_tasks.add_task(
            send_message_deleted_notification,
            message_id,
            room_id,
            conversation_id,
            current_user,
            server_id
        )
        
        return MessageStatusResponse(
            message="Message deleted successfully",
            message_id=message_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete message"
        )

@router.post("/{message_id}/react", response_model=MessageStatusResponse)
async def add_reaction(
    message_id: str,
    request_data: AddReactionRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add emoji reaction to message"""
    try:
        # Validate message exists and user has access
        message = await validate_message_access(message_id, current_user, db)
        
        # Check if user already reacted with this emoji
        existing_reaction = db.query(MessageReaction).filter(
            and_(
                MessageReaction.message_id == message_id,
                MessageReaction.user_id == current_user.id,
                MessageReaction.emoji == request_data.emoji
            )
        ).first()
        
        if existing_reaction:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You have already reacted with this emoji"
            )
        
        # Create reaction
        reaction = MessageReaction(
            message_id=message_id,
            user_id=current_user.id,
            emoji=request_data.emoji
        )
        
        db.add(reaction)
        db.commit()
        
        # Get server_id if it's a room message
        server_id = None
        if message.room_id:
            room = db.query(Room).filter(Room.id == message.room_id).first()
            server_id = str(room.server_id) if room else None
        
        # Send real-time notification
        background_tasks.add_task(
            send_reaction_added_notification,
            message_id,
            request_data.emoji,
            current_user,
            message,
            server_id
        )
        
        return MessageStatusResponse(
            message="Reaction added successfully",
            message_id=message_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to add reaction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add reaction"
        )

@router.delete("/{message_id}/react", response_model=MessageStatusResponse)
async def remove_reaction(
    message_id: str,
    request_data: RemoveReactionRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove emoji reaction from message"""
    try:
        # Validate message exists and user has access
        message = await validate_message_access(message_id, current_user, db)
        
        # Find existing reaction
        reaction = db.query(MessageReaction).filter(
            and_(
                MessageReaction.message_id == message_id,
                MessageReaction.user_id == current_user.id,
                MessageReaction.emoji == request_data.emoji
            )
        ).first()
        
        if not reaction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reaction not found"
            )
        
        # Remove reaction
        db.delete(reaction)
        db.commit()
        
        # Get server_id if it's a room message
        server_id = None
        if message.room_id:
            room = db.query(Room).filter(Room.id == message.room_id).first()
            server_id = str(room.server_id) if room else None
        
        # Send real-time notification
        background_tasks.add_task(
            send_reaction_removed_notification,
            message_id,
            request_data.emoji,
            current_user,
            message,
            server_id
        )
        
        return MessageStatusResponse(
            message="Reaction removed successfully",
            message_id=message_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to remove reaction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove reaction"
        )

@router.post("/typing/start")
async def start_typing(
    request_data: TypingRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start typing indicator"""
    try:
        # Validate access to room or conversation
        if request_data.room_id:
            await validate_room_access(request_data.room_id, current_user, db)
        elif request_data.conversation_id:
            await validate_conversation_access(request_data.conversation_id, current_user, db)
        
        # Get server_id if it's a room
        server_id = None
        if request_data.room_id:
            room = db.query(Room).filter(Room.id == request_data.room_id).first()
            server_id = str(room.server_id) if room else None
        
        # Send typing start notification
        background_tasks.add_task(
            send_typing_notification,
            "start",
            current_user,
            request_data.room_id,
            request_data.conversation_id,
            server_id
        )
        
        return {"message": "Typing indicator started"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start typing: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start typing indicator"
        )

@router.post("/typing/stop")
async def stop_typing(
    request_data: TypingRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Stop typing indicator"""
    try:
        # Validate access to room or conversation
        if request_data.room_id:
            await validate_room_access(request_data.room_id, current_user, db)
        elif request_data.conversation_id:
            await validate_conversation_access(request_data.conversation_id, current_user, db)
        
        # Get server_id if it's a room
        server_id = None
        if request_data.room_id:
            room = db.query(Room).filter(Room.id == request_data.room_id).first()
            server_id = str(room.server_id) if room else None
        
        # Send typing stop notification
        background_tasks.add_task(
            send_typing_notification,
            "stop",
            current_user,
            request_data.room_id,
            request_data.conversation_id,
            server_id
        )
        
        return {"message": "Typing indicator stopped"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to stop typing: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to stop typing indicator"
        )

@router.post("/conversations", response_model=ConversationResponse)
async def get_or_create_conversation(
    request_data: ConversationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get or create DM conversation with another user"""
    try:
        # Validate target user exists
        target_user = db.query(User).filter(User.id == request_data.user_id).first()
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Prevent self-conversation
        if target_user.id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot create conversation with yourself"
            )
        
        # Check if users can DM (friends or same server)
        friendship_service = FriendshipService(db)
        can_dm, reason = friendship_service.can_send_dm(str(current_user.id), str(target_user.id))
        
        if not can_dm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Cannot send DM: {reason}"
            )
        
        # Check if conversation already exists
        existing_conversation = db.query(DirectConversation).join(
            DirectConversationMember
        ).filter(
            DirectConversationMember.user_id.in_([current_user.id, target_user.id])
        ).group_by(DirectConversation.id).having(
            db.func.count(DirectConversationMember.user_id) == 2
        ).first()
        
        if existing_conversation:
            # Get last message
            last_message = db.query(Message).filter(
                Message.conversation_id == existing_conversation.id
            ).order_by(desc(Message.created_at)).first()
            
            last_message_response = None
            if last_message:
                messages = await format_messages_response([last_message], db)
                last_message_response = messages[0] if messages else None
            
            return ConversationResponse(
                id=str(existing_conversation.id),
                other_user={
                    "id": str(target_user.id),
                    "username": target_user.username,
                    "picture_url": target_user.picture_url,
                    "user_type": target_user.user_type
                },
                created_at=existing_conversation.created_at.isoformat(),
                last_message=last_message_response
            )
        
        # Create new conversation
        conversation = DirectConversation()
        db.add(conversation)
        db.flush()
        
        # Add members
        member1 = DirectConversationMember(
            conversation_id=conversation.id,
            user_id=current_user.id
        )
        member2 = DirectConversationMember(
            conversation_id=conversation.id,
            user_id=target_user.id
        )
        
        db.add(member1)
        db.add(member2)
        db.commit()
        
        return ConversationResponse(
            id=str(conversation.id),
            other_user={
                "id": str(target_user.id),
                "username": target_user.username,
                "picture_url": target_user.picture_url,
                "user_type": target_user.user_type
            },
            created_at=conversation.created_at.isoformat(),
            last_message=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get/create conversation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get or create conversation"
        )

@router.get("/conversations", response_model=List[ConversationResponse])
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all DM conversations for current user"""
    try:
        # Get all conversations where user is member
        conversations = db.query(DirectConversation).join(
            DirectConversationMember
        ).filter(
            DirectConversationMember.user_id == current_user.id
        ).all()
        
        conversation_responses = []
        for conversation in conversations:
            # Get other user
            other_member = db.query(DirectConversationMember).join(User).filter(
                and_(
                    DirectConversationMember.conversation_id == conversation.id,
                    DirectConversationMember.user_id != current_user.id
                )
            ).first()
            
            if other_member:
                # Get last message
                last_message = db.query(Message).filter(
                    Message.conversation_id == conversation.id
                ).order_by(desc(Message.created_at)).first()
                
                last_message_response = None
                if last_message:
                    messages = await format_messages_response([last_message], db)
                    last_message_response = messages[0] if messages else None
                
                conversation_responses.append(ConversationResponse(
                    id=str(conversation.id),
                    other_user={
                        "id": str(other_member.user.id),
                        "username": other_member.user.username,
                        "picture_url": other_member.user.picture_url,
                        "user_type": other_member.user.user_type
                    },
                    created_at=conversation.created_at.isoformat(),
                    last_message=last_message_response
                ))
        
        return conversation_responses
        
    except Exception as e:
        logger.error(f"Failed to list conversations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve conversations"
        )

# Helper functions
async def format_messages_response(messages: List[Message], db: Session) -> List[MessageResponse]:
    """Format messages for response with files, reactions, and reply counts"""
    responses = []
    
    for message in messages:
        # Get files
        files = db.query(File).filter(File.message_id == message.id).all()
        file_responses = [
            FileResponse(
                id=str(file.id),
                file_name=file.file_name,
                file_size=file.file_size,
                mime_type=file.mime_type,
                s3_key=file.s3_key,
                thumbnail_s3_key=file.thumbnail_s3_key,
                uploaded_at=file.uploaded_at.isoformat()
            ) for file in files
        ]
        
        # Get reactions
        reactions = db.query(MessageReaction, User).join(
            User, MessageReaction.user_id == User.id
        ).filter(MessageReaction.message_id == message.id).all()
        
        reaction_responses = [
            ReactionResponse(
                id=str(reaction.id),
                emoji=reaction.emoji,
                user_id=str(reaction.user_id),
                username=user.username,
                created_at=reaction.created_at.isoformat()
            ) for reaction, user in reactions
        ]
        
        # Get reply count
        reply_count = db.query(Message).filter(
            Message.parent_message_id == message.id
        ).count()
        
        responses.append(MessageResponse(
            id=str(message.id),
            content=message.content,
            user_id=str(message.user_id),
            username=message.user.username,
            user_picture_url=message.user.picture_url,
            room_id=str(message.room_id) if message.room_id else None,
            conversation_id=str(message.conversation_id) if message.conversation_id else None,
            parent_message_id=str(message.parent_message_id) if message.parent_message_id else None,
            created_at=message.created_at.isoformat(),
            edited_at=message.edited_at.isoformat() if message.edited_at else None,
            files=file_responses,
            reactions=reaction_responses,
            reply_count=reply_count
        ))
    
    return responses

async def validate_message_access(message_id: str, user: User, db: Session) -> Message:
    """Validate user has access to message"""
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    if message.room_id:
        await validate_room_access(str(message.room_id), user, db)
    elif message.conversation_id:
        await validate_conversation_access(str(message.conversation_id), user, db)
    
    return message

async def validate_room_access(room_id: str, user: User, db: Session):
    """Validate user has access to room"""
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    user_room = db.query(UserRoom).filter(
        and_(UserRoom.user_id == user.id, UserRoom.room_id == room_id)
    ).first()
    
    user_server = db.query(UserServer).filter(
        and_(UserServer.user_id == user.id, UserServer.server_id == room.server_id)
    ).first()
    
    if not user_room and not user_server:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this room"
        )
    
    if room.is_private and not user_room:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this private room"
        )

async def validate_conversation_access(conversation_id: str, user: User, db: Session):
    """Validate user has access to conversation"""
    conversation = db.query(DirectConversation).filter(
        DirectConversation.id == conversation_id
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    member = db.query(DirectConversationMember).filter(
        and_(
            DirectConversationMember.conversation_id == conversation_id,
            DirectConversationMember.user_id == user.id
        )
    ).first()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this conversation"
        )

# Real-time notification functions
async def send_message_created_notification(message: MessageResponse, user: User, server_id: str = None):
    """Send real-time notification for new message"""
    try:
        realtime_service = RealtimeService()
        
        await realtime_service.publish_message_created(
            message_data=message.dict(),
            server_id=server_id,
            room_id=message.room_id,
            conversation_id=message.conversation_id,
            user_id=str(user.id)
        )
    except Exception as e:
        logger.error(f"Failed to send message created notification: {e}")

async def send_message_updated_notification(message: MessageResponse, user: User, server_id: str = None):
    """Send real-time notification for updated message"""
    try:
        realtime_service = RealtimeService()
        
        await realtime_service.publish_message_updated(
            message_data=message.dict(),
            server_id=server_id,
            room_id=message.room_id,
            conversation_id=message.conversation_id,
            user_id=str(user.id)
        )
    except Exception as e:
        logger.error(f"Failed to send message updated notification: {e}")

async def send_message_deleted_notification(message_id: str, room_id: str, conversation_id: str, user: User, server_id: str = None):
    """Send real-time notification for deleted message"""
    try:
        realtime_service = RealtimeService()
        
        await realtime_service.publish_message_deleted(
            message_id=message_id,
            deleted_by=str(user.id),
            server_id=server_id,
            room_id=room_id,
            conversation_id=conversation_id
        )
    except Exception as e:
        logger.error(f"Failed to send message deleted notification: {e}")

async def send_reaction_added_notification(message_id: str, emoji: str, user: User, message: Message, server_id: str = None):
    """Send real-time notification for added reaction"""
    try:
        realtime_service = RealtimeService()
        
        await realtime_service.publish_reaction_added(
            message_id=message_id,
            emoji=emoji,
            user_id=str(user.id),
            username=user.username,
            server_id=server_id,
            room_id=str(message.room_id) if message.room_id else None,
            conversation_id=str(message.conversation_id) if message.conversation_id else None
        )
    except Exception as e:
        logger.error(f"Failed to send reaction added notification: {e}")

async def send_reaction_removed_notification(message_id: str, emoji: str, user: User, message: Message, server_id: str = None):
    """Send real-time notification for removed reaction"""
    try:
        realtime_service = RealtimeService()
        
        await realtime_service.publish_reaction_removed(
            message_id=message_id,
            emoji=emoji,
            user_id=str(user.id),
            username=user.username,
            server_id=server_id,
            room_id=str(message.room_id) if message.room_id else None,
            conversation_id=str(message.conversation_id) if message.conversation_id else None
        )
    except Exception as e:
        logger.error(f"Failed to send reaction removed notification: {e}")

async def send_typing_notification(action: str, user: User, room_id: str = None, conversation_id: str = None, server_id: str = None):
    """Send typing start/stop notification"""
    try:
        realtime_service = RealtimeService()
        
        if action == "start":
            await realtime_service.publish_typing_start(
                user_id=str(user.id),
                username=user.username,
                server_id=server_id,
                room_id=room_id,
                conversation_id=conversation_id
            )
        elif action == "stop":
            await realtime_service.publish_typing_stop(
                user_id=str(user.id),
                username=user.username,
                server_id=server_id,
                room_id=room_id,
                conversation_id=conversation_id
            )
    except Exception as e:
        logger.error(f"Failed to send typing notification: {e}")