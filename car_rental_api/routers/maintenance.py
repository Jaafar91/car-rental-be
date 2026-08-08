from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Maintenance
from schemas import MaintenanceCreate, MaintenanceUpdate, MaintenanceResponse
from typing import List
from auth_utils import require_roles

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])

@router.get("/", response_model=List[MaintenanceResponse], dependencies=[Depends(require_roles("admin", "manager", "agent"))])
def get_all(db: Session = Depends(get_db)):
    return db.query(Maintenance).all()

@router.get("/{id}", response_model=MaintenanceResponse, dependencies=[Depends(require_roles("admin", "manager", "agent"))])
def get_one(id: int, db: Session = Depends(get_db)):
    obj = db.query(Maintenance).filter(Maintenance.maintenance_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    return obj

@router.post("/", response_model=MaintenanceResponse, status_code=201, dependencies=[Depends(require_roles("admin", "manager"))])
def create(data: MaintenanceCreate, db: Session = Depends(get_db)):
    obj = Maintenance(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.put("/{id}", response_model=MaintenanceResponse, dependencies=[Depends(require_roles("admin", "manager"))])
def update(id: int, data: MaintenanceUpdate, db: Session = Depends(get_db)):
    obj = db.query(Maintenance).filter(Maintenance.maintenance_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Maintenance record not found")

    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)

    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/{id}", status_code=204, dependencies=[Depends(require_roles("admin", "manager"))])
def delete(id: int, db: Session = Depends(get_db)):
    obj = db.query(Maintenance).filter(Maintenance.maintenance_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    db.delete(obj)
    db.commit()