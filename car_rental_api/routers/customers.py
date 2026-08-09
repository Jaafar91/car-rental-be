from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
from models import Customer
from schemas import CustomerCreate, CustomerUpdate, CustomerResponse
from typing import List, Optional
from auth_utils import require_roles
from file_utils import save_identity_document
from pathlib import Path

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.get("/", response_model=List[CustomerResponse], dependencies=[Depends(require_roles("admin", "manager", "agent"))])
def get_all(db: Session = Depends(get_db)):
    return db.query(Customer).all()

@router.get("/{id}", response_model=CustomerResponse, dependencies=[Depends(require_roles("admin", "manager", "agent"))])
def get_one(id: int, db: Session = Depends(get_db)):
    obj = db.query(Customer).filter(Customer.customer_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Customer not found")
    return obj

@router.post("/", response_model=CustomerResponse, status_code=201, dependencies=[Depends(require_roles("admin", "manager"))])
def create(data: CustomerCreate, db: Session = Depends(get_db)):
    obj = Customer(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.post("/with-document", response_model=CustomerResponse, status_code=201, dependencies=[Depends(require_roles("admin", "manager"))])
def create_with_document(
    full_name: str = Form(...),
    email: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    license_no: Optional[str] = Form(None),
    license_exp: Optional[str] = Form(None),
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
):
    customer = Customer(
        full_name=full_name,
        email=email or None,
        phone=phone or None,
        license_no=license_no or None,
        license_exp=license_exp and license_exp[:10] or None,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)

    if file is not None and getattr(file, "filename", None):
        try:
            document_path = save_identity_document(file, customer.customer_id)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        customer.identity_document_path = document_path
        db.commit()
        db.refresh(customer)

    return customer

@router.put("/{id}", response_model=CustomerResponse, dependencies=[Depends(require_roles("admin", "manager"))])
def update(id: int, data: CustomerUpdate, db: Session = Depends(get_db)):
    obj = db.query(Customer).filter(Customer.customer_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Customer not found")
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj

@router.put("/{id}/document", response_model=CustomerResponse, dependencies=[Depends(require_roles("admin", "manager"))])
def upload_document(
    id: int,
    full_name: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    license_no: Optional[str] = Form(None),
    license_exp: Optional[str] = Form(None),
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
):
    obj = db.query(Customer).filter(Customer.customer_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Customer not found")

    if full_name is not None:
        obj.full_name = full_name or obj.full_name
    if email is not None:
        obj.email = email or None
    if phone is not None:
        obj.phone = phone or None
    if license_no is not None:
        obj.license_no = license_no or None
    if license_exp is not None:
        obj.license_exp = license_exp and license_exp[:10] or None

    if file is not None and getattr(file, "filename", None):
        try:
            document_path = save_identity_document(file, obj.customer_id)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        obj.identity_document_path = document_path

    db.commit()
    db.refresh(obj)
    return obj

@router.get("/{id}/document", dependencies=[Depends(require_roles("admin", "manager", "agent"))])
def download_document(id: int, db: Session = Depends(get_db)):
    obj = db.query(Customer).filter(Customer.customer_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Customer not found")
    if not obj.identity_document_path:
        raise HTTPException(status_code=404, detail="No document uploaded")

    file_path = Path(obj.identity_document_path.lstrip("/"))
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Document file not found")

    return FileResponse(file_path, media_type="application/pdf", filename=file_path.name)

@router.delete("/{id}", status_code=204, dependencies=[Depends(require_roles("admin", "manager"))])
def delete(id: int, db: Session = Depends(get_db)):
    obj = db.query(Customer).filter(Customer.customer_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Customer not found")
    db.delete(obj)
    db.commit()