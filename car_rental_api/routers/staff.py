from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Staff
from schemas import StaffCreate, StaffUpdate, StaffResponse
from typing import List

router = APIRouter(prefix="/staff", tags=["Staff"])

@router.get("/", response_model=List[StaffResponse])
def get_all(db: Session = Depends(get_db)):
    return db.query(Staff).all()

@router.get("/{id}", response_model=StaffResponse)
def get_one(id: int, db: Session = Depends(get_db)):
    obj = db.query(Staff).filter(Staff.staff_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Staff not found")
    return obj

@router.post("/", response_model=StaffResponse, status_code=201)
def create(data: StaffCreate, db: Session = Depends(get_db)):
    obj = Staff(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.put("/{id}", response_model=StaffResponse)
def update(id: int, data: StaffUpdate, db: Session = Depends(get_db)):
    obj = db.query(Staff).filter(Staff.staff_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Staff not found")
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/{id}", status_code=204)
def delete(id: int, db: Session = Depends(get_db)):
    obj = db.query(Staff).filter(Staff.staff_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Staff not found")
    db.delete(obj)
    db.commit()