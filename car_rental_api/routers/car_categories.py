from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import CarCategory
from schemas import CarCategoryCreate, CarCategoryUpdate, CarCategoryResponse
from typing import List
from auth_utils import require_roles

router = APIRouter(prefix="/car-categories", tags=["Car Categories"])

@router.get("/", response_model=List[CarCategoryResponse], dependencies=[Depends(require_roles("admin", "manager", "agent"))])
def get_all(db: Session = Depends(get_db)):
    return db.query(CarCategory).all()

@router.get("/{id}", response_model=CarCategoryResponse, dependencies=[Depends(require_roles("admin", "manager", "agent"))])
def get_one(id: int, db: Session = Depends(get_db)):
    obj = db.query(CarCategory).filter(CarCategory.category_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Car Category not found")
    return obj

@router.post("/", response_model=CarCategoryResponse, status_code=201, dependencies=[Depends(require_roles("admin", "manager"))])
def create(data: CarCategoryCreate, db: Session = Depends(get_db)):
    obj = CarCategory(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.put("/{id}", response_model=CarCategoryResponse, dependencies=[Depends(require_roles("admin", "manager"))])
def update(id: int, data: CarCategoryUpdate, db: Session = Depends(get_db)):
    obj = db.query(CarCategory).filter(CarCategory.category_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Car Category not found")
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/{id}", status_code=204, dependencies=[Depends(require_roles("admin", "manager"))])
def delete(id: int, db: Session = Depends(get_db)):
    obj = db.query(CarCategory).filter(CarCategory.category_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Car Category not found")
    db.delete(obj)
    db.commit()