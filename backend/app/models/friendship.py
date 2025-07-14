from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
import uuid
import enum

class FriendshipStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"

class Friendship(Base):
    __tablename__ = "friendships"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    friend_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    status = Column(String(20), default=FriendshipStatus.PENDING.value, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    accepted_at = Column(DateTime(timezone=True))

    # Unique constraint on user_id and friend_id combination
    __table_args__ = (
        UniqueConstraint("user_id", "friend_id", name="unique_friendship"),
    )

    # Relationships
    requester = relationship("User", foreign_keys=[user_id], back_populates="sent_friend_requests")
    friend = relationship("User", foreign_keys=[friend_id], back_populates="received_friend_requests")

class DirectConversation(Base):
    __tablename__ = "direct_conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    members = relationship("DirectConversationMember", back_populates="conversation", cascade="all, delete-orphan")

class DirectConversationMember(Base):
    __tablename__ = "direct_conversation_members"

    conversation_id = Column(UUID(as_uuid=True), ForeignKey("direct_conversations.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    last_read_at = Column(DateTime(timezone=True))

    # Relationships
    conversation = relationship("DirectConversation", back_populates="members")
    user = relationship("User")