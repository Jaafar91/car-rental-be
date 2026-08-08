from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Car
from schemas import CarCreate, CarUpdate, CarResponse
from typing import List
from auth_utils import require_roles

router = APIRouter(prefix="/cars", tags=["Cars"])

@router.get("/", response_model=List[CarResponse], dependencies=[Depends(require_roles("admin", "manager", "agent"))])
def get_all(db: Session = Depends(get_db)):
    return db.query(Car).all()

@router.get("/{id}", response_model=CarResponse, dependencies=[Depends(require_roles("admin", "manager", "agent"))])
def get_one(id: int, db: Session = Depends(get_db)):
    obj = db.query(Car).filter(Car.car_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Car not found")
    return obj

@router.post("/", response_model=CarResponse, status_code=201, dependencies=[Depends(require_roles("admin", "manager"))])
def create(data: CarCreate, db: Session = Depends(get_db)):
    obj = Car(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.put("/{id}", response_model=CarResponse, dependencies=[Depends(require_roles("admin", "manager"))])
def update(id: int, data: CarUpdate, db: Session = Depends(get_db)):
    obj = db.query(Car).filter(Car.car_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Car not found")
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/{id}", status_code=204, dependencies=[Depends(require_roles("admin", "manager"))])
def delete(id: int, db: Session = Depends(get_db)):
    obj = db.query(Car).filter(Car.car_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Car not found")
    db.delete(obj)
    db.commit()