from pathlib import Path

from typing import List

from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timedelta

from app.database import Base, engine, get_db
from app import crud, schemas
from app.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from jose import jwt, JWTError


Base.metadata.create_all(bind=engine)

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Project Management API (from UML)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

FRONTEND_DIR = Path(__file__).resolve().parents[1] / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

@app.get("/", include_in_schema=False)
def serve_frontend_index():
    index_path = FRONTEND_DIR / "index.html"
    if not index_path.exists():
        raise HTTPException(status_code=404, detail="Frontend not found")
    return FileResponse(index_path)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


@app.post("/register", response_model=schemas.UserRead)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    if crud.get_user_by_email(db, payload.email):
        raise HTTPException(status_code=400, detail="User already exists")
    user = crud.create_user(db, payload.email, payload.password, payload.first_name, payload.last_name)
    return user

@app.post("/login", response_model=schemas.Token)
def login(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, payload.email)
    if not user or not crud.verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    token = create_access_token({"sub": user.id})
    return {"access_token": token, "token_type": "bearer"}

@app.get("/users/me", response_model=schemas.UserRead)
def get_current_user_info(current_user=Depends(get_current_user)):
    return current_user




@app.post("/projects", response_model=schemas.ProjectRead)
def create_project(
    payload: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    project = crud.create_project(
        db,
        name=payload.name,
        owner_id=current_user.id,
        final_deadline=payload.final_deadline,
    )
    return project

@app.get("/projects", response_model=List[schemas.ProjectRead])
def list_projects(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    all_projects = crud.list_projects(db)
    user_projects = []
    for project in all_projects:
        if crud.can_access_project(db, project.id, current_user.id):
            user_projects.append(project)
    return user_projects

@app.get("/projects/{project_id}", response_model=schemas.ProjectRead)
def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    p = crud.get_project(db, project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    

    if not crud.can_access_project(db, project_id, current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return p

@app.put("/projects/{project_id}", response_model=schemas.ProjectRead)
def edit_project(
    project_id: str,
    payload: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    p = crud.get_project(db, project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    

    if not crud.is_project_owner(db, project_id, current_user.id):
        raise HTTPException(status_code=403, detail="Only project owner can edit project")
    
    p = crud.edit_project(db, project_id, payload.name, payload.final_deadline)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return p

@app.delete("/projects/{project_id}")
def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    p = crud.get_project(db, project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    

    if not crud.is_project_owner(db, project_id, current_user.id):
        raise HTTPException(status_code=403, detail="Only project owner can delete project")
    
    ok = crud.delete_project(db, project_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"detail": "deleted"}


@app.get("/projects/{project_id}/members", response_model=List[schemas.ProjectMembershipRead])
def list_project_members(
    project_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    if not crud.can_access_project(db, project_id, current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return crud.list_members_by_project(db, project_id)


@app.delete("/memberships/{membership_id}")
def kick_member(
    membership_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    from app import models
    mem = db.query(models.ProjectMembership).get(membership_id)
    if not mem:
        raise HTTPException(status_code=404, detail="Membership not found")
    

    if not crud.is_project_owner_or_leader(db, mem.project_id, current_user.id):
        raise HTTPException(status_code=403, detail="Only project owner or leader can remove members")


    project = crud.get_project(db, mem.project_id)
    if project and project.owner_id == mem.user_id:
        raise HTTPException(status_code=400, detail="Cannot remove project owner")
    
    ok = crud.remove_membership(db, membership_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Membership not found")
    return {"detail": "kicked"}

@app.patch("/memberships/{membership_id}/role", response_model=schemas.ProjectMembershipRead)
def update_membership_role(
    membership_id: str,
    payload: schemas.ProjectMembershipRoleUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    from app import models
    mem = db.query(models.ProjectMembership).get(membership_id)
    if not mem:
        raise HTTPException(status_code=404, detail="Membership not found")


    if not crud.is_project_owner_or_leader(db, mem.project_id, current_user.id):
        raise HTTPException(status_code=403, detail="Only project owner or leader can change roles")


    project = crud.get_project(db, mem.project_id)
    if project and project.owner_id == mem.user_id:
        raise HTTPException(status_code=400, detail="Cannot change role of project owner")

    updated = crud.set_membership_role(db, membership_id, payload.role)
    if not updated:
        raise HTTPException(status_code=404, detail="Membership not found")


    updated = (
        db.query(models.ProjectMembership)
        .options(joinedload(models.ProjectMembership.user))
        .get(membership_id)
    )
    return updated


@app.post("/tasks", response_model=schemas.TaskRead)
def create_task(
    payload: schemas.TaskCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    if not payload.project_id:
        raise HTTPException(status_code=400, detail="project_id is required")
    
    if not crud.can_access_project(db, payload.project_id, current_user.id):
        raise HTTPException(status_code=403, detail="Access denied to project")
    
    data = payload.dict()
    if not data.get("assigned_to_id"):
        data["assigned_to_id"] = current_user.id
    task = crud.create_task(db, **data)
    return task

@app.get("/projects/{project_id}/tasks", response_model=List[schemas.TaskRead])
def list_project_tasks(
    project_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    if not crud.can_access_project(db, project_id, current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    tasks = crud.list_tasks_by_project(db, project_id)
    return tasks

@app.get("/tasks/{task_id}", response_model=schemas.TaskRead)
def get_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    t = crud.get_task(db, task_id)
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    

    if t.project_id and not crud.can_access_project(db, t.project_id, current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return t

@app.put("/tasks/{task_id}", response_model=schemas.TaskRead)
def edit_task(
    task_id: str,
    payload: schemas.TaskCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    t = crud.get_task(db, task_id)
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    

    if t.project_id and not crud.can_access_project(db, t.project_id, current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    

    data = payload.dict()
    if "assigned_to_id" in data and data["assigned_to_id"] != t.assigned_to_id:
        if not crud.is_project_owner_or_leader(db, t.project_id, current_user.id):
            raise HTTPException(status_code=403, detail="Only project owner or leader can reassign task")

        if data["assigned_to_id"]:
            membership = crud.get_membership(db, t.project_id, data["assigned_to_id"])
            if not membership and crud.get_project(db, t.project_id).owner_id != data["assigned_to_id"]:
                raise HTTPException(status_code=400, detail="Assignee must be a project member or owner")
    t = crud.edit_task(db, task_id, **data)
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    return t

@app.patch("/tasks/{task_id}/status", response_model=schemas.TaskRead)
def change_task_status(
    task_id: str,
    payload: schemas.TaskStatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    t = crud.get_task(db, task_id)
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")


    if not (
        (t.assigned_to_id and t.assigned_to_id == current_user.id) or
        crud.is_project_owner_or_leader(db, t.project_id, current_user.id)
    ):
        raise HTTPException(status_code=403, detail="Only task owner or project owner/leader can change status")

    t = crud.edit_task(db, task_id, status=payload.status)
    return t

@app.delete("/tasks/{task_id}")
def delete_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    t = crud.get_task(db, task_id)
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    

    if t.project_id and not crud.can_access_project(db, t.project_id, current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    ok = crud.delete_task(db, task_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"detail": "deleted"}


@app.post("/comments", response_model=schemas.CommentRead)
def create_comment(
    payload: schemas.CommentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    task = crud.get_task(db, payload.task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.project_id and not crud.can_access_project(db, task.project_id, current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    c = crud.create_comment(db, text=payload.text, task_id=payload.task_id, author_id=current_user.id)
    return c


@app.post("/projects/{project_id}/invitations", response_model=schemas.ProjectInvitationRead)
def create_invitation(
    project_id: str,
    payload: schemas.ProjectInvitationCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    project = crud.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    

    if not crud.is_project_owner_or_leader(db, project_id, current_user.id):
        raise HTTPException(status_code=403, detail="Only project owner or leader can invite members")
    

    invitee = crud.get_user_by_email(db, payload.invitee_email)
    if not invitee:
        raise HTTPException(status_code=404, detail="User not found")
    

    if crud.get_membership(db, project_id, invitee.id):
        raise HTTPException(status_code=400, detail="User is already a member of the project")
    

    existing_invitation = crud.get_invitation_by_project_and_invitee(db, project_id, invitee.id)
    if existing_invitation:
        raise HTTPException(status_code=400, detail="Invitation already sent")
    

    if invitee.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot invite yourself")
    
    invitation = crud.create_invitation(db, project_id, current_user.id, invitee.id, payload.role)
    return invitation

@app.get("/invitations", response_model=List[schemas.ProjectInvitationRead])
def list_my_invitations(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    invitations = crud.list_invitations_by_invitee(db, current_user.id)
    return invitations

@app.post("/invitations/{invitation_id}/accept", response_model=schemas.ProjectMembershipRead)
def accept_invitation(
    invitation_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    membership = crud.accept_invitation(db, invitation_id, current_user.id)
    if not membership:
        raise HTTPException(status_code=404, detail="Invitation not found or cannot be accepted")
    return membership

@app.post("/invitations/{invitation_id}/decline", response_model=schemas.ProjectInvitationRead)
def decline_invitation(
    invitation_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    invitation = crud.decline_invitation(db, invitation_id, current_user.id)
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found or cannot be declined")
    return invitation

@app.get("/projects/{project_id}/invitations", response_model=List[schemas.ProjectInvitationRead])
def list_project_invitations(
    project_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    project = crud.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not crud.is_project_owner_or_leader(db, project_id, current_user.id):
        raise HTTPException(status_code=403, detail="Only project owner or leader can view invitations")
    
    invitations = crud.list_invitations_by_project(db, project_id)
    return invitations


@app.get("/{page:path}", include_in_schema=False)
def serve_frontend_page(page: str):
    if not page or not page.endswith(".html"):
        raise HTTPException(status_code=404, detail="Страница не найдена")

    page_path = FRONTEND_DIR / page
    if not page_path.exists():
        raise HTTPException(status_code=404, detail="Страница не найдена")

    return FileResponse(page_path)
