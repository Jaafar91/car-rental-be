from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import CarStatus
from schemas import CarStatusCreate, CarStatusUpdate, CarStatusResponse
from typing import List

router = APIRouter(prefix="/car-status", tags=["Car Status"])

@router.get("/", response_model=List[CarStatusResponse])
def get_all(db: Session = Depends(get_db)):
    return db.query(CarStatus).all()

@router.get("/{id}", response_model=CarStatusResponse)
def get_one(id: int, db: Session = Depends(get_db)):
    obj = db.query(CarStatus).filter(CarStatus.status_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Car Status not found")
    return obj

@router.post("/", response_model=CarStatusResponse, status_code=201)
def create(data: CarStatusCreate, db: Session = Depends(get_db)):
    obj = CarStatus(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.put("/{id}", response_model=CarStatusResponse)
def update(id: int, data: CarStatusUpdate, db: Session = Depends(get_db)):
    obj = db.query(CarStatus).filter(CarStatus.status_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Car Status not found")
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/{id}", status_code=204)
def delete(id: int, db: Session = Depends(get_db)):
    obj = db.query(CarStatus).filter(CarStatus.status_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Car Status not found")
    db.delete(obj)
    db.commit()