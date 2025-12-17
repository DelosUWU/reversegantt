import uuid
from sqlalchemy import Column, String, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class InvitationStatusEnum(str, enum.Enum):
    Pending = "pending"
    Accepted = "accepted"
    Declined = "declined"

class ProjectInvitation(Base):
    __tablename__ = "project_invitations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    inviter_id = Column(String, ForeignKey("users.id"), nullable=False)
    invitee_id = Column(String, ForeignKey("users.id"), nullable=False)
    role = Column(String, default="member")  # "member" or "leader"
    status = Column(SAEnum(InvitationStatusEnum), default=InvitationStatusEnum.Pending)

    project = relationship("Project", back_populates="invitations")
    inviter = relationship("User", foreign_keys=[inviter_id], back_populates="sent_invitations")
    invitee = relationship("User", foreign_keys=[invitee_id], back_populates="received_invitations")

