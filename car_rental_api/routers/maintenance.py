from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Maintenance
from schemas import MaintenanceCreate, MaintenanceUpdate, MaintenanceResponse
from typing import List

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])

@router.get("/", response_model=List[MaintenanceResponse])
def get_all(db: Session = Depends(get_db)):
    return db.query(Maintenance).all()

@router.get("/{id}", response_model=MaintenanceResponse)
def get_one(id: int, db: Session = Depends(get_db)):
    obj = db.query(Maintenance).filter(Maintenance.maintenance_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    return obj

@router.post("/", response_model=MaintenanceResponse, status_code=201)
def create(data: MaintenanceCreate, db: Session = Depends(get_db)):
    obj = Maintenance(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.put("/{id}", response_model=MaintenanceResponse)
def update(id: int, data: MaintenanceUpdate, db: Session = Depends(get_db)):
    obj = db.query(Maintenance).filter(Maintenance.maintenance_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/{id}", status_code=204)
def delete(id: int, db: Session = Depends(get_db)):
    obj = db.query(Maintenance).filter(Maintenance.maintenance_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    db.delete(obj)
    db.commit()