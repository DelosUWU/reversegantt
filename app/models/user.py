import uuid
from sqlalchemy import Column, String
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)

    # owned projects (TeamLeader -> Project.Project.owner_id)
    owned_projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")

    # project memberships (TeamMember / TeamLeader roles)
    project_memberships = relationship("ProjectMembership", back_populates="user", cascade="all, delete-orphan")

    # comments authored
    comments = relationship("Comment", back_populates="author", cascade="all, delete-orphan")

    # tasks assigned to user
    tasks_assigned = relationship("Task", back_populates="assigned_to")

    # invitations sent
    sent_invitations = relationship("ProjectInvitation", foreign_keys="ProjectInvitation.inviter_id", back_populates="inviter")

    # invitations received
    received_invitations = relationship("ProjectInvitation", foreign_keys="ProjectInvitation.invitee_id", back_populates="invitee")