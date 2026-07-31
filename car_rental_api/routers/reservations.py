from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Reservation
from schemas import ReservationCreate, ReservationUpdate, ReservationResponse
from typing import List

router = APIRouter(prefix="/reservations", tags=["Reservations"])

@router.get("/", response_model=List[ReservationResponse])
def get_all(db: Session = Depends(get_db)):
    return db.query(Reservation).all()

@router.get("/{id}", response_model=ReservationResponse)
def get_one(id: int, db: Session = Depends(get_db)):
    obj = db.query(Reservation).filter(Reservation.reservation_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return obj

@router.post("/", response_model=ReservationResponse, status_code=201)
def create(data: ReservationCreate, db: Session = Depends(get_db)):
    obj = Reservation(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.put("/{id}", response_model=ReservationResponse)
def update(id: int, data: ReservationUpdate, db: Session = Depends(get_db)):
    obj = db.query(Reservation).filter(Reservation.reservation_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Reservation not found")
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/{id}", status_code=204)
def delete(id: int, db: Session = Depends(get_db)):
    obj = db.query(Reservation).filter(Reservation.reservation_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Reservation not found")
    db.delete(obj)
    db.commit()