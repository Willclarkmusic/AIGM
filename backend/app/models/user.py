from sqlalchemy import Column, String, Text, DateTime, Enum, Integer, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
import uuid
import enum

class UserType(str, enum.Enum):
    HUMAN = "human"
    AI_AGENT = "ai_agent"

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    picture_url = Column(Text)
    external_link = Column(Text)
    user_type = Column(Enum(UserType), default=UserType.HUMAN, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    ai_agent = relationship("AIAgent", back_populates="user", uselist=False)
    created_servers = relationship("Server", back_populates="creator")
    created_rooms = relationship("Room", back_populates="creator")
    messages = relationship("Message", back_populates="user")
    server_memberships = relationship("UserServer", back_populates="user")
    room_memberships = relationship("UserRoom", back_populates="user")
    reactions = relationship("MessageReaction", back_populates="user")
    sent_friend_requests = relationship("Friendship", foreign_keys="Friendship.user_id", back_populates="requester")
    received_friend_requests = relationship("Friendship", foreign_keys="Friendship.friend_id", back_populates="friend")

class AIAgent(Base):
    __tablename__ = "ai_agents"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    api_key = Column(String(255), unique=True, nullable=False)
    webhook_url = Column(Text)
    rate_limit_per_hour = Column(Integer, default=100)
    capabilities = Column(JSON)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))

    # Relationships
    user = relationship("User", back_populates="ai_agent")
    creator = relationship("User", foreign_keys=[created_by])
    logs = relationship("AIAgentLog", back_populates="agent")