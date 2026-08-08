from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import Staff
from schemas import StaffCreate, StaffUpdate, StaffResponse
from typing import List
from auth_utils import create_access_token, get_current_staff, hash_password, require_roles, verify_password
from pydantic import BaseModel

router = APIRouter(prefix="/staff", tags=["Staff"])

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    staff_id: int
    name: str

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_new_password: str

@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    staff = db.query(Staff).filter(Staff.email == data.email.strip().lower()).first()
    if not staff or not verify_password(data.password, staff.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not staff.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Staff account is inactive")

    token = create_access_token(staff)
    return TokenResponse(
        access_token=token,
        role=(staff.role or "agent").strip().lower(),
        staff_id=staff.staff_id,
        name=f"{staff.first_name} {staff.last_name}".strip(),
    )

@router.get("/me", response_model=StaffResponse)
def get_me(staff: Staff = Depends(get_current_staff)):
    return staff

@router.post("/me/password")
def change_password(data: PasswordChangeRequest, staff: Staff = Depends(get_current_staff), db: Session = Depends(get_db)):
    if len(data.new_password or "") < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be at least 8 characters")
    if data.new_password != data.confirm_new_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New passwords do not match")
    if not verify_password(data.current_password, staff.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password is incorrect")

    staff.password_hash = hash_password(data.new_password)
    db.commit()
    db.refresh(staff)
    return {"message": "Password updated successfully"}

@router.get("/", response_model=List[StaffResponse], dependencies=[Depends(require_roles("admin", "manager"))])
def get_all(db: Session = Depends(get_db)):
    return db.query(Staff).all()

@router.get("/{id}", response_model=StaffResponse, dependencies=[Depends(require_roles("admin", "manager"))])
def get_one(id: int, db: Session = Depends(get_db)):
    obj = db.query(Staff).filter(Staff.staff_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Staff not found")
    return obj

@router.post("/", response_model=StaffResponse, status_code=201, dependencies=[Depends(require_roles("admin"))])
def create(data: StaffCreate, db: Session = Depends(get_db)):
    payload = data.model_dump()
    password = payload.pop("password", None)
    if password:
        payload["password_hash"] = hash_password(password)
    obj = Staff(**payload)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.put("/{id}", response_model=StaffResponse, dependencies=[Depends(require_roles("admin"))])
def update(id: int, data: StaffUpdate, db: Session = Depends(get_db)):
    obj = db.query(Staff).filter(Staff.staff_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Staff not found")
    payload = data.model_dump()
    password = payload.pop("password", None)
    if password:
        payload["password_hash"] = hash_password(password)
    for k, v in payload.items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/{id}", status_code=204, dependencies=[Depends(require_roles("admin"))])
def delete(id: int, db: Session = Depends(get_db)):
    obj = db.query(Staff).filter(Staff.staff_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Staff not found")
    db.delete(obj)
    db.commit()