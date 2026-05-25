from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.core.database import get_session
from app.models.entities import Entity, EntityCreate, EntityRead, EntityUpdate
from datetime import datetime

router = APIRouter(prefix="/entities", tags=["Entities"])


@router.get("/", response_model=list[EntityRead])
def list_entities(session: Session = Depends(get_session)):
    return session.exec(select(Entity)).all()


@router.post("/", response_model=EntityRead, status_code=201)
def create_entity(entity: EntityCreate, session: Session = Depends(get_session)):
    db_entity = Entity.model_validate(entity)
    session.add(db_entity)
    session.commit()
    session.refresh(db_entity)
    return db_entity


@router.get("/{entity_id}", response_model=EntityRead)
def get_entity(entity_id: int, session: Session = Depends(get_session)):
    entity = session.get(Entity, entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    return entity


@router.patch("/{entity_id}", response_model=EntityRead)
def update_entity(entity_id: int, updates: EntityUpdate, session: Session = Depends(get_session)):
    entity = session.get(Entity, entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    update_data = updates.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(entity, key, value)
    entity.updated_at = datetime.utcnow()
    session.add(entity)
    session.commit()
    session.refresh(entity)
    return entity


@router.delete("/{entity_id}", status_code=204)
def delete_entity(entity_id: int, session: Session = Depends(get_session)):
    entity = session.get(Entity, entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    session.delete(entity)
    session.commit()