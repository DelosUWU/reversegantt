from sqlalchemy.orm import Session
from app import crud

class ProjectService:
    def create(self, db: Session, name: str, owner_id: str = None, final_deadline=None):
        project = crud.create_project(db, name=name, owner_id=owner_id, final_deadline=final_deadline)
        return project

    def edit(self, db: Session, project_id: str, name: str = None, final_deadline=None):
        return crud.edit_project(db, project_id, name, final_deadline)

    def delete(self, db: Session, project_id: str):
        return crud.delete_project(db, project_id)

    def add_member(self, db: Session, project_id: str, user_id: str, role="member"):
        return crud.add_member(db, project_id, user_id, role)

    def kick_member(self, db: Session, membership_id: str):
        return crud.remove_membership(db, membership_id)

    def set_role(self, db: Session, membership_id: str, new_role: str):
        return crud.set_membership_role(db, membership_id, new_role)
