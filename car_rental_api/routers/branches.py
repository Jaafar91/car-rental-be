from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Branch
from schemas import BranchCreate, BranchUpdate, BranchResponse
from typing import List
from auth_utils import require_roles

router = APIRouter(prefix="/branches", tags=["Branches"])

@router.get("/", response_model=List[BranchResponse], dependencies=[Depends(require_roles("admin", "manager", "agent"))])
def get_all(db: Session = Depends(get_db)):
    return db.query(Branch).all()

@router.get("/{id}", response_model=BranchResponse, dependencies=[Depends(require_roles("admin", "manager", "agent"))])
def get_one(id: int, db: Session = Depends(get_db)):
    obj = db.query(Branch).filter(Branch.branch_id == id).first()
    if not obj: raise HTTPException(404, "Branch not found")
    return obj

@router.post("/", response_model=BranchResponse, status_code=201, dependencies=[Depends(require_roles("admin", "manager"))])
def create(data: BranchCreate, db: Session = Depends(get_db)):
    obj = Branch(**data.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.put("/{id}", response_model=BranchResponse, dependencies=[Depends(require_roles("admin", "manager"))])
def update(id: int, data: BranchUpdate, db: Session = Depends(get_db)):
    obj = db.query(Branch).filter(Branch.branch_id == id).first()
    if not obj: raise HTTPException(404, "Branch not found")
    for k, v in data.model_dump().items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    return obj

@router.delete("/{id}", status_code=204, dependencies=[Depends(require_roles("admin", "manager"))])
def delete(id: int, db: Session = Depends(get_db)):
    obj = db.query(Branch).filter(Branch.branch_id == id).first()
    if not obj: raise HTTPException(404, "Branch not found")
    db.delete(obj); db.commit()