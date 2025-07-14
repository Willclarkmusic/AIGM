from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
import uuid

class AIAgentLog(Base):
    __tablename__ = "ai_agent_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    room_id = Column(UUID(as_uuid=True), ForeignKey("rooms.id"))
    action = Column(String(50), nullable=False)
    details = Column(JSON)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    agent = relationship("AIAgent", back_populates="logs")
    room = relationship("Room")