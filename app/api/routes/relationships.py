from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.core.database import get_session
from app.models.relationships import Relationship, RelationshipCreate, RelationshipRead

router = APIRouter(prefix="/relationships", tags=["Relationships"])


@router.get("/", response_model=list[RelationshipRead])
def list_relationships(session: Session = Depends(get_session)):
    return session.exec(select(Relationship)).all()


@router.post("/", response_model=RelationshipRead, status_code=201)
def create_relationship(rel: RelationshipCreate, session: Session = Depends(get_session)):
    db_rel = Relationship.model_validate(rel)
    session.add(db_rel)
    session.commit()
    session.refresh(db_rel)
    return db_rel


@router.get("/{rel_id}", response_model=RelationshipRead)
def get_relationship(rel_id: int, session: Session = Depends(get_session)):
    rel = session.get(Relationship, rel_id)
    if not rel:
        raise HTTPException(status_code=404, detail="Relationship not found")
    return rel


@router.delete("/{rel_id}", status_code=204)
def delete_relationship(rel_id: int, session: Session = Depends(get_session)):
    rel = session.get(Relationship, rel_id)
    if not rel:
        raise HTTPException(status_code=404, detail="Relationship not found")
    session.delete(rel)
    session.commit()