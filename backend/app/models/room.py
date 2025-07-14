from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
import uuid

class Room(Base):
    __tablename__ = "rooms"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    server_id = Column(UUID(as_uuid=True), ForeignKey("servers.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    is_private = Column(Boolean, default=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    server = relationship("Server", back_populates="rooms")
    creator = relationship("User", back_populates="created_rooms")
    messages = relationship("Message", back_populates="room", cascade="all, delete-orphan")
    user_memberships = relationship("UserRoom", back_populates="room")

class UserRoom(Base):
    __tablename__ = "user_rooms"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    room_id = Column(UUID(as_uuid=True), ForeignKey("rooms.id"), primary_key=True)
    role = Column(String(20), nullable=False)  # 'owner', 'admin', 'member'
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    last_read_at = Column(DateTime(timezone=True))

    # Relationships
    user = relationship("User", back_populates="room_memberships")
    room = relationship("Room", back_populates="user_memberships")