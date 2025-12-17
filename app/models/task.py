import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship, backref
from datetime import datetime
from app.database import Base
import enum

class TaskStatusEnum(str, enum.Enum):
    New = "New"
    InProgress = "InProgress"
    UnderReview = "UnderReview"
    Completed = "Completed"
    Overdue = "Overdue"


class Task(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    deadline = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    status = Column(SAEnum(TaskStatusEnum), default=TaskStatusEnum.New)

    project_id = Column(String, ForeignKey("projects.id"), nullable=True)
    project = relationship("Project", back_populates="tasks")

    parent_task_id = Column(String, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True)
    parent_task = relationship(
        "Task",
        remote_side=[id],
        backref=backref("subtasks", cascade="all, delete-orphan"),
        passive_deletes=True,
    )

    assigned_to_id = Column(String, ForeignKey("users.id"), nullable=True)
    assigned_to = relationship("User", back_populates="tasks_assigned")

    comments = relationship("Comment", back_populates="task", cascade="all, delete-orphan")
