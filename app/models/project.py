import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    final_deadline = Column(DateTime, nullable=True)

    owner_id = Column(String, ForeignKey("users.id"), nullable=True)
    owner = relationship("User", back_populates="owned_projects")

    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    participants = relationship("ProjectMembership", back_populates="project", cascade="all, delete-orphan")
    invitations = relationship("ProjectInvitation", back_populates="project", cascade="all, delete-orphan")

    created_at = Column(DateTime, default=datetime.utcnow)
