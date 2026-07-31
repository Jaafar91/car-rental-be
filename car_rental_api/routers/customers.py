from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Customer
from schemas import CustomerCreate, CustomerUpdate, CustomerResponse
from typing import List

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.get("/", response_model=List[CustomerResponse])
def get_all(db: Session = Depends(get_db)):
    return db.query(Customer).all()

@router.get("/{id}", response_model=CustomerResponse)
def get_one(id: int, db: Session = Depends(get_db)):
    obj = db.query(Customer).filter(Customer.customer_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Customer not found")
    return obj

@router.post("/", response_model=CustomerResponse, status_code=201)
def create(data: CustomerCreate, db: Session = Depends(get_db)):
    obj = Customer(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.put("/{id}", response_model=CustomerResponse)
def update(id: int, data: CustomerUpdate, db: Session = Depends(get_db)):
    obj = db.query(Customer).filter(Customer.customer_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Customer not found")
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/{id}", status_code=204)
def delete(id: int, db: Session = Depends(get_db)):
    obj = db.query(Customer).filter(Customer.customer_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Customer not found")
    db.delete(obj)
    db.commit()