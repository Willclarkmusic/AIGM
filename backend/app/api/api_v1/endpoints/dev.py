"""
Development endpoints for testing and seeding data
These endpoints are only available in development mode
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Any
from app.db.database import get_db
from app.models.user import User, UserType
from app.models.server import Server, UserServer  
from app.models.room import Room, UserRoom
from app.models.friendship import DirectConversation, DirectConversationMember
from app.models.message import Message
from app.core.config import settings
import logging
import random
import string
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)
router = APIRouter()

class SeedDataResponse(BaseModel):
    """Response for seed data creation"""
    message: str
    users: List[Dict[str, Any]]
    server: Dict[str, Any]
    room: Dict[str, Any]
    direct_conversation: Dict[str, Any]

class HealthCheckResponse(BaseModel):
    """Response for health check"""
    status: str
    database: str
    tables_count: int
    ably_configured: bool
    environment: str
    timestamp: str

def generate_access_code() -> str:
    """Generate a 5-character access code for servers"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))

@router.post("/seed", response_model=SeedDataResponse)
async def create_seed_data(db: Session = Depends(get_db)):
    """
    Create seed data for testing with 2 users, 1 server, 1 room, and sample messages
    """
    try:
        logger.info("Creating seed data...")
        
        # Clear existing data (for development only)
        logger.info("Clearing existing data...")
        db.query(Message).delete()
        db.query(UserRoom).delete()
        db.query(UserServer).delete()
        db.query(Room).delete()
        db.query(Server).delete()
        db.query(DirectConversationMember).delete()
        db.query(DirectConversation).delete()
        db.query(User).delete()
        db.commit()
        
        # Create test users with fixed UUIDs for testing
        alice_id = uuid.UUID("550e8400-e29b-41d4-a716-446655440001")
        bob_id = uuid.UUID("550e8400-e29b-41d4-a716-446655440002")
        
        user1 = User(
            id=alice_id,
            username="alice",
            email="alice@example.com",
            picture_url="https://api.dicebear.com/7.x/avataaars/svg?seed=alice",
            user_type=UserType.HUMAN,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        user2 = User(
            id=bob_id,
            username="bob",
            email="bob@example.com", 
            picture_url="https://api.dicebear.com/7.x/avataaars/svg?seed=bob",
            user_type=UserType.HUMAN,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(user1)
        db.add(user2)
        db.commit()
        db.refresh(user1)
        db.refresh(user2)
        
        logger.info(f"Created users: {user1.username} ({user1.id}), {user2.username} ({user2.id})")
        
        # Create a test server
        server = Server(
            name="Test Server",
            access_code=generate_access_code(),
            is_private=False,
            created_by=user1.id,
            created_at=datetime.utcnow()
        )
        
        db.add(server)
        db.commit()
        db.refresh(server)
        
        logger.info(f"Created server: {server.name} ({server.id}) with access code: {server.access_code}")
        
        # Add both users to the server
        user_server1 = UserServer(
            user_id=user1.id,
            server_id=server.id,
            role="owner",
            joined_at=datetime.utcnow()
        )
        
        user_server2 = UserServer(
            user_id=user2.id,
            server_id=server.id,
            role="member",
            joined_at=datetime.utcnow()
        )
        
        db.add(user_server1)
        db.add(user_server2)
        db.commit()
        
        # Create a test room
        room = Room(
            server_id=server.id,
            name="general",
            is_private=False,
            created_by=user1.id,
            created_at=datetime.utcnow()
        )
        
        db.add(room)
        db.commit()
        db.refresh(room)
        
        logger.info(f"Created room: {room.name} ({room.id})")
        
        # Add users to the room
        user_room1 = UserRoom(
            user_id=user1.id,
            room_id=room.id,
            role="member",
            joined_at=datetime.utcnow()
        )
        
        user_room2 = UserRoom(
            user_id=user2.id,
            room_id=room.id,
            role="member",
            joined_at=datetime.utcnow()
        )
        
        db.add(user_room1)
        db.add(user_room2)
        db.commit()
        
        # Create a direct conversation between the users
        direct_conversation = DirectConversation(
            created_at=datetime.utcnow()
        )
        
        db.add(direct_conversation)
        db.commit()
        db.refresh(direct_conversation)
        
        # Add both users to the direct conversation
        dm_member1 = DirectConversationMember(
            conversation_id=direct_conversation.id,
            user_id=user1.id
        )
        
        dm_member2 = DirectConversationMember(
            conversation_id=direct_conversation.id,
            user_id=user2.id
        )
        
        db.add(dm_member1)
        db.add(dm_member2)
        db.commit()
        
        # Create some sample messages
        sample_messages = [
            Message(
                room_id=room.id,
                user_id=user1.id,
                content="Welcome to the test server! 👋",
                created_at=datetime.utcnow()
            ),
            Message(
                room_id=room.id,
                user_id=user2.id,
                content="Hello Alice! Thanks for setting this up.",
                created_at=datetime.utcnow()
            ),
            Message(
                conversation_id=direct_conversation.id,
                user_id=user1.id,
                content="Hey Bob, how's the testing going?",
                created_at=datetime.utcnow()
            )
        ]
        
        for message in sample_messages:
            db.add(message)
        
        db.commit()
        
        logger.info(f"Created {len(sample_messages)} sample messages")
        
        # Prepare response data
        response = SeedDataResponse(
            message="Seed data created successfully",
            users=[
                {
                    "id": str(user1.id),
                    "username": user1.username,
                    "email": user1.email,
                    "picture_url": user1.picture_url,
                    "user_type": user1.user_type
                },
                {
                    "id": str(user2.id),
                    "username": user2.username,
                    "email": user2.email,
                    "picture_url": user2.picture_url,
                    "user_type": user2.user_type
                }
            ],
            server={
                "id": str(server.id),
                "name": server.name,
                "access_code": server.access_code,
                "created_by": str(server.created_by)
            },
            room={
                "id": str(room.id),
                "name": room.name,
                "server_id": str(room.server_id),
                "created_by": str(room.created_by)
            },
            direct_conversation={
                "id": str(direct_conversation.id),
                "member_count": 2
            }
        )
        
        logger.info("✅ Seed data creation completed successfully")
        return response
        
    except Exception as e:
        logger.error(f"Failed to create seed data: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create seed data: {str(e)}"
        )

@router.get("/health", response_model=HealthCheckResponse)
async def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint to verify system status
    """
    try:
        # Test database connection
        db.execute("SELECT 1")
        
        # Count tables
        if "sqlite" in settings.DATABASE_URL:
            result = db.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table'")
        else:
            result = db.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")
        
        table_count = result.scalar()
        
        return HealthCheckResponse(
            status="healthy",
            database="connected",
            tables_count=table_count,
            ably_configured=bool(settings.ABLY_API_KEY),
            environment=settings.ENVIRONMENT if hasattr(settings, 'ENVIRONMENT') else 'development',
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"System unhealthy: {str(e)}"
        )

@router.delete("/clear-data")
async def clear_all_data(db: Session = Depends(get_db)):
    """
    Clear all data from the database (development only)
    """
    try:
        logger.info("Clearing all database data...")
        
        # Clear in order to respect foreign key constraints
        db.query(Message).delete()
        db.query(UserRoom).delete() 
        db.query(UserServer).delete()
        db.query(Room).delete()
        db.query(Server).delete()
        db.query(DirectConversationMember).delete()
        db.query(DirectConversation).delete()
        db.query(User).delete()
        
        db.commit()
        
        logger.info("✅ All data cleared successfully")
        return {"message": "All data cleared successfully"}
        
    except Exception as e:
        logger.error(f"Failed to clear data: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear data: {str(e)}"
        )