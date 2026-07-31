from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Payment
from schemas import PaymentCreate, PaymentUpdate, PaymentResponse
from typing import List

router = APIRouter(prefix="/payments", tags=["Payments"])

@router.get("/", response_model=List[PaymentResponse])
def get_all(db: Session = Depends(get_db)):
    return db.query(Payment).all()

@router.get("/{id}", response_model=PaymentResponse)
def get_one(id: int, db: Session = Depends(get_db)):
    obj = db.query(Payment).filter(Payment.payment_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Payment not found")
    return obj

@router.post("/", response_model=PaymentResponse, status_code=201)
def create(data: PaymentCreate, db: Session = Depends(get_db)):
    obj = Payment(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.put("/{id}", response_model=PaymentResponse)
def update(id: int, data: PaymentUpdate, db: Session = Depends(get_db)):
    obj = db.query(Payment).filter(Payment.payment_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Payment not found")
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/{id}", status_code=204)
def delete(id: int, db: Session = Depends(get_db)):
    obj = db.query(Payment).filter(Payment.payment_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Payment not found")
    db.delete(obj)
    db.commit()