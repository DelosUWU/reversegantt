from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from app.models.task import TaskStatusEnum


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class UserRead(BaseModel):
    id: str
    email: EmailStr
    first_name: Optional[str]
    last_name: Optional[str]

    class Config:
        orm_mode = True


class Token(BaseModel):
    access_token: str
    token_type: str


class ProjectCreate(BaseModel):
    name: str
    final_deadline: Optional[datetime] = None

class ProjectRead(BaseModel):
    id: str
    name: str
    final_deadline: Optional[datetime]
    owner_id: Optional[str]
    owner: Optional[UserRead]

    class Config:
        orm_mode = True


class TaskCreate(BaseModel):
    name: str
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    project_id: Optional[str] = None
    parent_task_id: Optional[str] = None
    assigned_to_id: Optional[str] = None

class TaskRead(BaseModel):
    id: str
    name: str
    description: Optional[str]
    deadline: Optional[datetime]
    status: TaskStatusEnum
    project_id: Optional[str]
    assigned_to_id: Optional[str]
    parent_task_id: Optional[str] = None
    created_at: Optional[datetime] = None
    assigned_to: Optional[UserRead] = None

    class Config:
        orm_mode = True

class TaskStatusUpdate(BaseModel):
    status: TaskStatusEnum


class CommentCreate(BaseModel):
    text: str
    task_id: str

class CommentRead(BaseModel):
    id: str
    text: str
    created_at: datetime
    author_id: str
    task_id: str

    class Config:
        orm_mode = True

class ProjectMembershipCreate(BaseModel):
    user_email: EmailStr
    role: Optional[str] = "member"

class ProjectMembershipRead(BaseModel):
    id: str
    role: str
    user: UserRead

    class Config:
        orm_mode = True

class ProjectMembershipRoleUpdate(BaseModel):
    role: str

# Invitations
from app.models.project_invitation import InvitationStatusEnum

class ProjectInvitationCreate(BaseModel):
    invitee_email: EmailStr
    role: Optional[str] = "member"

class ProjectInvitationRead(BaseModel):
    id: str
    project_id: str
    inviter_id: str
    invitee_id: str
    role: str
    status: InvitationStatusEnum
    inviter: Optional[UserRead] = None
    invitee: Optional[UserRead] = None
    project: Optional[ProjectRead] = None

    class Config:
        orm_mode = True
