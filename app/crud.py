from sqlalchemy.orm import Session, joinedload
from app import models
from passlib.context import CryptContext
from datetime import datetime

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Users
def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_user(db: Session, user_id: str):
    return db.query(models.User).get(user_id)

def create_user(db: Session, email: str, password: str, first_name=None, last_name=None):
    hashed = pwd_context.hash(password)
    user = models.User(email=email, hashed_password=hashed, first_name=first_name, last_name=last_name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)


def create_project(db: Session, name: str, owner_id: str = None, final_deadline=None):
    project = models.Project(name=name, owner_id=owner_id, final_deadline=final_deadline)
    db.add(project)
    db.commit()
    db.refresh(project)

    return (
        db.query(models.Project)
        .options(joinedload(models.Project.owner))
        .filter(models.Project.id == project.id)
        .first()
    )

def get_project(db: Session, project_id: str):
    return (
        db.query(models.Project)
        .options(joinedload(models.Project.owner))
        .filter(models.Project.id == project_id)
        .first()
    )

def edit_project(db: Session, project_id: str, name: str = None, final_deadline = None):
    project = get_project(db, project_id)
    if not project:
        return None
    if name:
        project.name = name
    if final_deadline:
        project.final_deadline = final_deadline
    db.commit()
    return project

def delete_project(db: Session, project_id: str):
    project = get_project(db, project_id)
    if project:
        db.delete(project)
        db.commit()
        return True
    return False

def list_projects(db: Session):
    return (
        db.query(models.Project)
        .options(joinedload(models.Project.owner))
        .order_by(models.Project.created_at.desc())
        .all()
    )

def list_members_by_project(db: Session, project_id: str):
    return (
        db.query(models.ProjectMembership)
        .options(joinedload(models.ProjectMembership.user))
        .filter(models.ProjectMembership.project_id == project_id)
        .order_by(models.ProjectMembership.role.asc())
        .all()
    )


def add_member(db: Session, project_id: str, user_id: str, role: str = "member"):
    membership = models.ProjectMembership(project_id=project_id, user_id=user_id, role=role)
    db.add(membership)
    db.commit()
    db.refresh(membership)
    return membership

def get_membership(db: Session, project_id: str, user_id: str):
    return db.query(models.ProjectMembership).filter_by(project_id=project_id, user_id=user_id).first()

def remove_membership(db: Session, membership_id: str):
    mem = db.query(models.ProjectMembership).get(membership_id)
    if mem:
        db.delete(mem)
        db.commit()
        return True
    return False

def set_membership_role(db: Session, membership_id: str, new_role: str):
    mem = db.query(models.ProjectMembership).get(membership_id)
    if mem:
        mem.role = new_role
        db.commit()
        return mem
    return None


def create_task(db: Session, **kwargs):
    task = models.Task(**kwargs)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

def get_task(db: Session, task_id: str):
    return db.query(models.Task).get(task_id)

def edit_task(db: Session, task_id: str, **kwargs):
    task = get_task(db, task_id)
    if not task:
        return None
    for k, v in kwargs.items():
        setattr(task, k, v)
    db.commit()
    return task

def delete_task(db: Session, task_id: str):
    task = get_task(db, task_id)
    if task:
        db.delete(task)
        db.commit()
        return True
    return False

def list_tasks_by_project(db: Session, project_id: str):
    return db.query(models.Task).filter(models.Task.project_id == project_id).order_by(models.Task.created_at.desc()).all()


def create_comment(db: Session, text: str, task_id: str, author_id: str):
    c = models.Comment(text=text, task_id=task_id, author_id=author_id)
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


def is_project_owner(db: Session, project_id: str, user_id: str) -> bool:

    project = get_project(db, project_id)
    if not project:
        return False
    return project.owner_id == user_id

def is_project_member(db: Session, project_id: str, user_id: str) -> bool:

    membership = get_membership(db, project_id, user_id)
    return membership is not None

def is_project_owner_or_leader(db: Session, project_id: str, user_id: str) -> bool:

    if is_project_owner(db, project_id, user_id):
        return True
    membership = get_membership(db, project_id, user_id)
    return membership is not None and membership.role == "leader"

def can_access_project(db: Session, project_id: str, user_id: str) -> bool:

    return is_project_owner(db, project_id, user_id) or is_project_member(db, project_id, user_id)

# Invitations
def create_invitation(db: Session, project_id: str, inviter_id: str, invitee_id: str, role: str = "member"):

    invitation = models.ProjectInvitation(
        project_id=project_id,
        inviter_id=inviter_id,
        invitee_id=invitee_id,
        role=role,
        status=models.InvitationStatusEnum.Pending
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    return invitation

def get_invitation(db: Session, invitation_id: str):

    return db.query(models.ProjectInvitation).get(invitation_id)

def get_invitation_by_project_and_invitee(db: Session, project_id: str, invitee_id: str):

    return (
        db.query(models.ProjectInvitation)
        .filter_by(project_id=project_id, invitee_id=invitee_id, status=models.InvitationStatusEnum.Pending)
        .first()
    )

def list_invitations_by_invitee(db: Session, invitee_id: str):

    return (
        db.query(models.ProjectInvitation)
        .options(joinedload(models.ProjectInvitation.project), joinedload(models.ProjectInvitation.inviter))
        .filter_by(invitee_id=invitee_id, status=models.InvitationStatusEnum.Pending)
        .all()
    )

def list_invitations_by_project(db: Session, project_id: str):

    return (
        db.query(models.ProjectInvitation)
        .options(joinedload(models.ProjectInvitation.invitee), joinedload(models.ProjectInvitation.inviter))
        .filter_by(project_id=project_id)
        .all()
    )

def accept_invitation(db: Session, invitation_id: str, user_id: str):

    invitation = get_invitation(db, invitation_id)
    if not invitation:
        return None
    if invitation.invitee_id != user_id:
        return None
    if invitation.status != models.InvitationStatusEnum.Pending:
        return None
    

    membership = add_member(db, invitation.project_id, invitation.invitee_id, invitation.role)
    

    invitation.status = models.InvitationStatusEnum.Accepted
    db.commit()
    db.refresh(invitation)
    
    return membership

def decline_invitation(db: Session, invitation_id: str, user_id: str):

    invitation = get_invitation(db, invitation_id)
    if not invitation:
        return None
    if invitation.invitee_id != user_id:
        return None
    if invitation.status != models.InvitationStatusEnum.Pending:
        return None
    
    invitation.status = models.InvitationStatusEnum.Declined
    db.commit()
    db.refresh(invitation)
    return invitation
