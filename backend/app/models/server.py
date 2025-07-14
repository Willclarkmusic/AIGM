from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
import uuid

class Server(Base):
    __tablename__ = "servers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    access_code = Column(String(5), unique=True, nullable=False, index=True)
    is_private = Column(Boolean, default=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Constraint to limit servers per user (will be enforced in application logic)
    __table_args__ = (
        CheckConstraint(
            "length(access_code) = 5",
            name="check_access_code_length"
        ),
    )

    # Relationships
    creator = relationship("User", back_populates="created_servers")
    rooms = relationship("Room", back_populates="server", cascade="all, delete-orphan")
    user_memberships = relationship("UserServer", back_populates="server")

class UserServer(Base):
    __tablename__ = "user_servers"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    server_id = Column(UUID(as_uuid=True), ForeignKey("servers.id"), primary_key=True)
    role = Column(String(20), nullable=False)  # 'owner', 'admin', 'member'
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="server_memberships")
    server = relationship("Server", back_populates="user_memberships")