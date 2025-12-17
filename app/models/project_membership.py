import uuid
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class ProjectMembership(Base):
    __tablename__ = "project_memberships"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"))
    project_id = Column(String, ForeignKey("projects.id"))
    role = Column(String, default="member")  # "member" or "leader"

    user = relationship("User", back_populates="project_memberships")
    project = relationship("Project", back_populates="participants")
