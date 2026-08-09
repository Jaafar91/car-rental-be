# schemas.py
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date, datetime
from decimal import Decimal
from enum import Enum

from config import settings

DEFAULT_CURRENCY = settings.default_currency

# ══════════════════════════════════════════════════════════════
# 🏢 BRANCH
# ══════════════════════════════════════════════════════════════
class BranchBase(BaseModel):
    branch_name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None


class BranchCreate(BranchBase):
    pass


class BranchUpdate(BranchBase):
    pass


class BranchResponse(BranchBase):
    branch_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ══════════════════════════════════════════════════════════════
# 🚗 CAR CATEGORY
# ══════════════════════════════════════════════════════════════
class CarCategoryBase(BaseModel):
    category_name: str
    description: Optional[str] = None 
    daily_rate: Decimal


class CarCategoryCreate(CarCategoryBase):
    pass


class CarCategoryUpdate(CarCategoryBase):
    pass


class CarCategoryResponse(CarCategoryBase):
    category_id: int

    class Config:
        from_attributes = True


# ══════════════════════════════════════════════════════════════
# 🔵 CAR STATUS
# ══════════════════════════════════════════════════════════════
class CarStatusBase(BaseModel):
    status_name: str
    description: Optional[str] = None 


class CarStatusCreate(CarStatusBase):
    pass


class CarStatusUpdate(CarStatusBase):
    pass


class CarStatusResponse(CarStatusBase):
    status_id: int

    class Config:
        from_attributes = True


# ══════════════════════════════════════════════════════════════
# 👤 CUSTOMER
# ══════════════════════════════════════════════════════════════
class CustomerBase(BaseModel):
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    license_no: Optional[str] = None
    license_exp: Optional[date] = None
    identity_document_path: Optional[str] = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(CustomerBase):
    pass


class CustomerResponse(CustomerBase):
    customer_id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ══════════════════════════════════════════════════════════════
# 👨‍💼 STAFF
# ══════════════════════════════════════════════════════════════
class StaffBase(BaseModel):
    first_name: str
    last_name: str
    branch_id: int
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None
    password_hash: Optional[str] = None
    hire_date: Optional[date] = None
    is_active: Optional[bool] = True


class StaffCreate(StaffBase):
    pass


class StaffUpdate(StaffBase):
    pass


class StaffResponse(StaffBase):
    staff_id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ══════════════════════════════════════════════════════════════
# 🚙 CAR
# ══════════════════════════════════════════════════════════════
class CarBase(BaseModel):
    category_id: Optional[int] = None
    status_id: Optional[int] = None
    branch_id: Optional[int] = None
    vin: Optional[str] = None
    license_plate: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    seat_count: Optional[int] = None
    transmission: Optional[str] = None
    fuel_type: Optional[str] = None


class CarCreate(CarBase):
    pass


class CarUpdate(CarBase):
    pass


class CarResponse(CarBase):
    car_id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ══════════════════════════════════════════════════════════════
# 🔧 MAINTENANCE
# ══════════════════════════════════════════════════════════════
class MaintenanceBase(BaseModel):
    car_id: int
    description: Optional[str] = None
    maintenance_type: Optional[str] = None
    status: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cost_amount: Optional[Decimal] = None


class MaintenanceCreate(MaintenanceBase):
    pass


class MaintenanceUpdate(MaintenanceBase):
    pass


class MaintenanceResponse(MaintenanceBase):
    maintenance_id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ══════════════════════════════════════════════════════════════
# 📅 RESERVATION
# ══════════════════════════════════════════════════════════════
class ReservationStatus(str, Enum):
    pending = "pending"
    confirmed = "confirmed"
    cancelled = "cancelled"
    completed = "completed"


class ReservationBase(BaseModel):
    customer_id: int
    branch_id: Optional[int] = None
    car_id: int
    total_amount: Optional[Decimal] = Decimal("0.00")
    deposit_amount: Optional[Decimal] = Decimal("0.00")
    pickup_at: datetime
    dropoff_at: datetime
    status: Optional[ReservationStatus] = ReservationStatus.pending
    notes: Optional[str] = None
    agreement_signed: Optional[bool] = False
    agreement_signature: Optional[str] = None


class ReservationCreate(ReservationBase):
    pass


class ReservationUpdate(ReservationBase):
    pass


class ReservationResponse(ReservationBase):
    reservation_id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ══════════════════════════════════════════════════════════════
# 🚀 RENTAL
# ══════════════════════════════════════════════════════════════
class RentalStatus(str, Enum):
    active = "active"
    closed = "closed"
    cancelled = "cancelled"


class RentalBase(BaseModel):
    reservation_id: int
    customer_id: int
    car_id: int
    staff_id: Optional[int] = None
    branch_pickup_id: Optional[int] = None
    branch_dropoff_id: Optional[int] = None
    rental_date: datetime
    due_date: datetime
    return_date: Optional[datetime] = None
    daily_rate: Decimal
    discount_amount: Optional[Decimal] = Decimal("0.00")
    currency: Optional[str] = None
    status: Optional[RentalStatus] = RentalStatus.active
    mileage_start: Optional[int] = None
    mileage_end: Optional[int] = None
    total_amount: Optional[Decimal] = None


class RentalCreate(RentalBase):
    currency: Optional[str] = DEFAULT_CURRENCY


class RentalUpdate(BaseModel):
    reservation_id: Optional[int] = None
    customer_id: Optional[int] = None
    car_id: Optional[int] = None
    staff_id: Optional[int] = None
    branch_pickup_id: Optional[int] = None
    branch_dropoff_id: Optional[int] = None
    rental_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    return_date: Optional[datetime] = None
    daily_rate: Optional[Decimal] = None
    discount_amount: Optional[Decimal] = None
    currency: Optional[str] = None
    status: Optional[RentalStatus] = None
    mileage_start: Optional[int] = None
    mileage_end: Optional[int] = None
    total_amount: Optional[Decimal] = None


class RentalResponse(RentalBase):
    rental_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ══════════════════════════════════════════════════════════════
# 💳 PAYMENT
# ══════════════════════════════════════════════════════════════
class PaymentMethod(str, Enum):
    cash = "cash"
    card = "card"
    bank_transfer = "bank_transfer"
    other = "other"


class PaymentStatus(str, Enum):
    paid = "paid"
    pending = "pending"
    failed = "failed"
    refunded = "refunded"


class PaymentBase(BaseModel):
    rental_id: int
    amount: Decimal
    currency: Optional[str] = None
    method: PaymentMethod
    status: Optional[PaymentStatus] = PaymentStatus.pending
    paid_at: Optional[datetime] = None
    reference: Optional[str] = None


class PaymentCreate(PaymentBase):
    currency: Optional[str] = DEFAULT_CURRENCY


class PaymentUpdate(BaseModel):
    rental_id: Optional[int] = None
    amount: Optional[Decimal] = None
    currency: Optional[str] = None
    method: Optional[PaymentMethod] = None
    status: Optional[PaymentStatus] = None
    paid_at: Optional[datetime] = None
    reference: Optional[str] = None


class PaymentResponse(PaymentBase):
    payment_id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True