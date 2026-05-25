from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.core.database import get_session
from app.models.ingestion import IngestionEvent, IngestionEventCreate, IngestionEventRead, IngestionStatus
from datetime import datetime

router = APIRouter(prefix="/ingestion", tags=["Ingestion"])


@router.get("/events", response_model=list[IngestionEventRead])
def list_events(session: Session = Depends(get_session)):
    return session.exec(select(IngestionEvent)).all()


@router.post("/events", response_model=IngestionEventRead, status_code=201)
def submit_event(event: IngestionEventCreate, session: Session = Depends(get_session)):
    db_event = IngestionEvent.model_validate(event)
    session.add(db_event)
    session.commit()
    session.refresh(db_event)
    return db_event


@router.get("/events/{event_id}", response_model=IngestionEventRead)
def get_event(event_id: int, session: Session = Depends(get_session)):
    event = session.get(IngestionEvent, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.patch("/events/{event_id}/status", response_model=IngestionEventRead)
def update_event_status(event_id: int, status: IngestionStatus, session: Session = Depends(get_session)):
    event = session.get(IngestionEvent, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    event.status = status
    if status == IngestionStatus.processed:
        event.processed_at = datetime.utcnow()
    session.add(event)
    session.commit()
    session.refresh(event)
    return event