import os
import smtplib
from email.message import EmailMessage
from email.utils import make_msgid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Reservation, Customer, Car
from schemas import ReservationCreate, ReservationUpdate, ReservationResponse
from typing import List
from auth_utils import require_roles
from config import settings
from agreement_utils import build_agreement_html

router = APIRouter(prefix="/reservations", tags=["Reservations"])

@router.get("/", response_model=List[ReservationResponse], dependencies=[Depends(require_roles("admin", "manager", "agent"))])
def get_all(db: Session = Depends(get_db)):
    return db.query(Reservation).all()

@router.get("/{id}", response_model=ReservationResponse, dependencies=[Depends(require_roles("admin", "manager", "agent"))])
def get_one(id: int, db: Session = Depends(get_db)):
    obj = db.query(Reservation).filter(Reservation.reservation_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return obj

@router.post("/", response_model=ReservationResponse, status_code=201, dependencies=[Depends(require_roles("admin", "manager"))])
def create(data: ReservationCreate, db: Session = Depends(get_db)):
    obj = Reservation(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.put("/{id}", response_model=ReservationResponse, dependencies=[Depends(require_roles("admin", "manager"))])
def update(id: int, data: ReservationUpdate, db: Session = Depends(get_db)):
    obj = db.query(Reservation).filter(Reservation.reservation_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Reservation not found")
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/{id}", status_code=204, dependencies=[Depends(require_roles("admin", "manager"))])
def delete(id: int, db: Session = Depends(get_db)):
    obj = db.query(Reservation).filter(Reservation.reservation_id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Reservation not found")
    db.delete(obj)
    db.commit()


@router.post("/{id}/send-agreement", dependencies=[Depends(require_roles("admin", "manager"))])
def send_agreement(id: int, db: Session = Depends(get_db)):
    reservation = db.query(Reservation).filter(Reservation.reservation_id == id).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    if not reservation.agreement_signed or not reservation.agreement_signature:
        raise HTTPException(status_code=400, detail="Agreement is not signed yet")

    customer = db.query(Customer).filter(Customer.customer_id == reservation.customer_id).first()
    car = db.query(Car).filter(Car.car_id == reservation.car_id).first()

    if not customer or not customer.email:
        raise HTTPException(status_code=400, detail="Customer email is required")

    if not settings.smtp_host or not settings.smtp_from_email:
        raise HTTPException(status_code=500, detail="SMTP settings are not configured")

    html = build_agreement_html(
        reservation={
            "reservation_id": reservation.reservation_id,
            "customer_id": reservation.customer_id,
            "car_id": reservation.car_id,
            "pickup_at": reservation.pickup_at,
            "dropoff_at": reservation.dropoff_at,
            "total_amount": reservation.total_amount,
            "notes": reservation.notes,
            "status": reservation.status,
        },
        customer={"full_name": customer.full_name, "email": customer.email},
        car={"make": car.make if car else None, "model": car.model if car else None, "license_plate": car.license_plate if car else None},
        signature_data=reservation.agreement_signature,
    )

    msg = EmailMessage()
    msg["Subject"] = f"Signed Rental Agreement - Reservation #{reservation.reservation_id}"
    msg["From"] = settings.smtp_from_email
    msg["To"] = customer.email
    msg.set_content("Please find your signed agreement attached.")
    msg.add_alternative(html, subtype="html")

    cid = make_msgid()
    msg.get_payload()[1].add_related(
        reservation.agreement_signature.encode("utf-8") if isinstance(reservation.agreement_signature, str) else reservation.agreement_signature,
        maintype="image",
        subtype="png",
        cid=cid,
    )

    msg.add_attachment(html.encode("utf-8"), maintype="text", subtype="html", filename="agreement.html")

    smtp_server = smtplib.SMTP(settings.smtp_host, settings.smtp_port)
    if settings.smtp_use_tls:
        smtp_server.starttls()
    if settings.smtp_username:
        smtp_server.login(settings.smtp_username, settings.smtp_password)
    smtp_server.send_message(msg)
    smtp_server.quit()

    return {"message": "Agreement emailed successfully"}