from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from pydantic import BaseModel, validator
from typing import List, Optional
from app.db.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.server import Server, UserServer
from app.models.room import Room
from app.services.realtime_service import RealtimeService
import logging
import random
import string
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter()

# Pydantic schemas
class CreateServerRequest(BaseModel):
    """Request body for creating a server"""
    name: str
    is_private: bool = False
    
    @validator('name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Server name is required')
        if len(v.strip()) > 100:
            raise ValueError('Server name must be 100 characters or less')
        return v.strip()

class UpdateServerRequest(BaseModel):
    """Request body for updating a server"""
    name: Optional[str] = None
    is_private: Optional[bool] = None
    
    @validator('name')
    def validate_name(cls, v):
        if v is not None:
            if not v or not v.strip():
                raise ValueError('Server name cannot be empty')
            if len(v.strip()) > 100:
                raise ValueError('Server name must be 100 characters or less')
            return v.strip()
        return v

class JoinServerRequest(BaseModel):
    """Request body for joining a server by access code"""
    access_code: str
    
    @validator('access_code')
    def validate_access_code(cls, v):
        if not v or len(v.strip()) != 5:
            raise ValueError('Access code must be exactly 5 characters')
        return v.strip().upper()

class ServerMemberResponse(BaseModel):
    """Server member information response"""
    id: str
    username: str
    picture_url: Optional[str]
    user_type: str
    role: str
    joined_at: str

class ServerResponse(BaseModel):
    """Server information response"""
    id: str
    name: str
    access_code: str
    is_private: bool
    created_by: str
    created_at: str
    member_count: int
    user_role: Optional[str] = None

class ServerWithMembersResponse(BaseModel):
    """Detailed server response with members"""
    id: str
    name: str
    access_code: str
    is_private: bool
    created_by: str
    created_at: str
    members: List[ServerMemberResponse]

class ServerStatusResponse(BaseModel):
    """Response for server operations"""
    message: str
    server_id: Optional[str] = None
    access_code: Optional[str] = None

def generate_access_code(db: Session) -> str:
    """Generate a unique 5-character access code"""
    while True:
        # Generate random 5-character code (alphanumeric, uppercase)
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
        
        # Check if code already exists
        existing = db.query(Server).filter(Server.access_code == code).first()
        if not existing:
            return code

@router.post("/", response_model=ServerStatusResponse)
async def create_server(
    request_data: CreateServerRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new server (max 3 per user - ENFORCED)"""
    try:
        # CRITICAL: Check 3-server limit
        user_server_count = db.query(UserServer).filter(
            and_(
                UserServer.user_id == current_user.id,
                UserServer.role == "owner"
            )
        ).count()
        
        if user_server_count >= 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You have reached the maximum limit of 3 servers. Please delete a server before creating a new one."
            )
        
        # Generate unique access code
        access_code = generate_access_code(db)
        
        # Create server
        server = Server(
            name=request_data.name,
            access_code=access_code,
            is_private=request_data.is_private,
            created_by=current_user.id
        )
        
        db.add(server)
        db.flush()  # Get server ID
        
        # Add creator as owner member
        user_server = UserServer(
            user_id=current_user.id,
            server_id=server.id,
            role="owner"
        )
        
        db.add(user_server)
        db.commit()
        
        # Send real-time notification
        background_tasks.add_task(
            send_server_created_notification,
            current_user,
            server
        )
        
        return ServerStatusResponse(
            message="Server created successfully",
            server_id=str(server.id),
            access_code=access_code
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create server: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create server"
        )

@router.get("/", response_model=List[ServerResponse])
async def get_user_servers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all servers for the current user"""
    try:
        # Get all servers where user is a member
        user_servers = db.query(UserServer, Server).join(
            Server, UserServer.server_id == Server.id
        ).filter(UserServer.user_id == current_user.id).all()
        
        servers = []
        for user_server, server in user_servers:
            # Get member count
            member_count = db.query(UserServer).filter(
                UserServer.server_id == server.id
            ).count()
            
            servers.append(ServerResponse(
                id=str(server.id),
                name=server.name,
                access_code=server.access_code,
                is_private=server.is_private,
                created_by=str(server.created_by),
                created_at=server.created_at.isoformat(),
                member_count=member_count,
                user_role=user_server.role
            ))
        
        return servers
        
    except Exception as e:
        logger.error(f"Failed to get user servers: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve servers"
        )

@router.get("/{server_id}", response_model=ServerWithMembersResponse)
async def get_server(
    server_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get server by ID with member list"""
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
        
        # Get server details
        server = db.query(Server).filter(Server.id == server_id).first()
        if not server:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Server not found"
            )
        
        # Get all members
        members_data = db.query(UserServer, User).join(
            User, UserServer.user_id == User.id
        ).filter(UserServer.server_id == server_id).all()
        
        members = []
        for user_server_rel, user in members_data:
            members.append(ServerMemberResponse(
                id=str(user.id),
                username=user.username,
                picture_url=user.picture_url,
                user_type=user.user_type,
                role=user_server_rel.role,
                joined_at=user_server_rel.joined_at.isoformat()
            ))
        
        return ServerWithMembersResponse(
            id=str(server.id),
            name=server.name,
            access_code=server.access_code,
            is_private=server.is_private,
            created_by=str(server.created_by),
            created_at=server.created_at.isoformat(),
            members=members
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get server: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve server"
        )

@router.patch("/{server_id}", response_model=ServerStatusResponse)
async def update_server(
    server_id: str,
    request_data: UpdateServerRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update server information (owner/admin only)"""
    try:
        # Check if user has permission (owner or admin)
        user_server = db.query(UserServer).filter(
            and_(
                UserServer.user_id == current_user.id,
                UserServer.server_id == server_id,
                UserServer.role.in_(["owner", "admin"])
            )
        ).first()
        
        if not user_server:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to update this server"
            )
        
        # Get server
        server = db.query(Server).filter(Server.id == server_id).first()
        if not server:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Server not found"
            )
        
        # Update fields
        if request_data.name is not None:
            server.name = request_data.name
        if request_data.is_private is not None:
            server.is_private = request_data.is_private
        
        db.commit()
        
        return ServerStatusResponse(
            message="Server updated successfully",
            server_id=str(server.id)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update server: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update server"
        )

@router.delete("/{server_id}", response_model=ServerStatusResponse)
async def delete_server(
    server_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete server (owner only) - cascades to rooms"""
    try:
        # Check if user is owner
        user_server = db.query(UserServer).filter(
            and_(
                UserServer.user_id == current_user.id,
                UserServer.server_id == server_id,
                UserServer.role == "owner"
            )
        ).first()
        
        if not user_server:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the server owner can delete the server"
            )
        
        # Get server
        server = db.query(Server).filter(Server.id == server_id).first()
        if not server:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Server not found"
            )
        
        # Delete server (cascade will handle rooms and memberships)
        db.delete(server)
        db.commit()
        
        return ServerStatusResponse(
            message="Server deleted successfully",
            server_id=str(server_id)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete server: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete server"
        )

@router.post("/join", response_model=ServerStatusResponse)
async def join_server(
    request_data: JoinServerRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Join server by access code"""
    try:
        # Find server by access code
        server = db.query(Server).filter(
            Server.access_code == request_data.access_code
        ).first()
        
        if not server:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid access code"
            )
        
        # Check if user is already a member
        existing_membership = db.query(UserServer).filter(
            and_(
                UserServer.user_id == current_user.id,
                UserServer.server_id == server.id
            )
        ).first()
        
        if existing_membership:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You are already a member of this server"
            )
        
        # Add user as member
        user_server = UserServer(
            user_id=current_user.id,
            server_id=server.id,
            role="member"
        )
        
        db.add(user_server)
        db.commit()
        
        # Send real-time notification
        background_tasks.add_task(
            send_user_joined_server_notification,
            current_user,
            server
        )
        
        return ServerStatusResponse(
            message=f"Successfully joined server '{server.name}'",
            server_id=str(server.id)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to join server: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to join server"
        )

@router.post("/{server_id}/leave", response_model=ServerStatusResponse)
async def leave_server(
    server_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Leave server (cannot leave if owner)"""
    try:
        # Get user's membership
        user_server = db.query(UserServer).filter(
            and_(
                UserServer.user_id == current_user.id,
                UserServer.server_id == server_id
            )
        ).first()
        
        if not user_server:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="You are not a member of this server"
            )
        
        if user_server.role == "owner":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Server owner cannot leave. Transfer ownership or delete the server instead."
            )
        
        # Remove membership
        db.delete(user_server)
        db.commit()
        
        return ServerStatusResponse(
            message="Successfully left the server",
            server_id=str(server_id)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to leave server: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to leave server"
        )

# Helper functions for real-time notifications
async def send_server_created_notification(creator: User, server: Server):
    """Send real-time notification for server creation"""
    try:
        realtime_service = RealtimeService()
        await realtime_service.send_server_notification(
            target_user_id=str(creator.id),
            event_type="server_created",
            server_data={
                "id": str(server.id),
                "name": server.name,
                "access_code": server.access_code
            }
        )
    except Exception as e:
        logger.error(f"Failed to send server created notification: {e}")

async def send_user_joined_server_notification(user: User, server: Server):
    """Send real-time notification when user joins server"""
    try:
        realtime_service = RealtimeService()
        
        # Note: This would require db session - for now just log the event
        logger.info(f"User {user.username} joined server {server.name}")
        
        await realtime_service.send_server_notification(
            target_user_id=str(user.id),
            event_type="user_joined_server",
            server_data={
                "id": str(server.id),
                "name": server.name,
                "member": {
                    "id": str(user.id),
                    "username": user.username
                }
            }
        )
    except Exception as e:
        logger.error(f"Failed to send user joined server notification: {e}")