from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Rental
from schemas import RentalCreate, RentalUpdate, RentalResponse
from typing import List
from auth_utils import require_roles

router = APIRouter(prefix="/rentals", tags=["Rentals"])

@router.get("/", response_model=List[RentalResponse], dependencies=[Depends(require_roles("admin", "manager", "agent"))])
def get_all(db: Session = Depends(get_db)):
    return db.query(Rental).all()

@router.get("/{id}", response_model=RentalResponse, dependencies=[Depends(require_roles("admin", "manager", "agent"))])
def get_one(id: int, db: Session = Depends(get_db)):
    obj = db.query(Rental).filter(Rental.rental_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Rental not found")
    return obj

@router.post("/", response_model=RentalResponse, status_code=201, dependencies=[Depends(require_roles("admin", "manager", "agent"))])
def create(data: RentalCreate, db: Session = Depends(get_db)):
    obj = Rental(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.put("/{id}", response_model=RentalResponse, dependencies=[Depends(require_roles("admin", "manager", "agent"))])
def update(id: int, data: RentalUpdate, db: Session = Depends(get_db)):
    obj = db.query(Rental).filter(Rental.rental_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Rental not found")
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/{id}", status_code=204, dependencies=[Depends(require_roles("admin", "manager"))])
def delete(id: int, db: Session = Depends(get_db)):
    obj = db.query(Rental).filter(Rental.rental_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Rental not found")
    db.delete(obj)
    db.commit()