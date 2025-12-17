import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Comment(Base):
    __tablename__ = "comments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    text = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    author_id = Column(String, ForeignKey("users.id"))
    author = relationship("User", back_populates="comments")

    task_id = Column(String, ForeignKey("tasks.id"))
    task = relationship("Task", back_populates="comments")
