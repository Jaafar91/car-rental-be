from sqlalchemy import (
    Column, Integer, SmallInteger, BigInteger, String, Text,Boolean,
    Date, DateTime, Numeric, ForeignKey, CheckConstraint,
    Index, func
)
from sqlalchemy.dialects.postgresql import CHAR
from database import Base


# ─────────────────────────────────────────
# 🏢 Branch
# ─────────────────────────────────────────
class Branch(Base):
    __tablename__ = "branches"

    branch_id  = Column(BigInteger, primary_key=True, autoincrement=True)
    branch_name       = Column(String(120), nullable=False, unique=True)
    address    = Column(Text, nullable=True)
    phone      = Column(String(30), nullable=True)
    email      = Column(String(255), nullable=True)
    city      = Column(String(255), nullable=True)
    state      = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# ─────────────────────────────────────────
# 🚗 Car Category
# ─────────────────────────────────────────
class CarCategory(Base):
    __tablename__ = "car_categories"

    category_id = Column(BigInteger, primary_key=True, autoincrement=True)
    category_name   = Column(String(80), nullable=False, unique=True)
    daily_rate  = Column(Numeric(10, 2), nullable=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    description = Column(String(255), nullable=True)

    __table_args__ = (
        CheckConstraint("daily_rate >= 0", name="car_categories_daily_rate_check"),
    )


# ─────────────────────────────────────────
# 🔵 Car Status
# ─────────────────────────────────────────
class CarStatus(Base):
    __tablename__ = "car_status"

    status_id = Column(SmallInteger, primary_key=True, autoincrement=True)
    status_name      = Column(String(30), nullable=False, unique=True)
    description = Column(String(255), nullable=True)


# ─────────────────────────────────────────
# 👤 Customer
# ─────────────────────────────────────────
class Customer(Base):
    __tablename__ = "customers"

    customer_id = Column(BigInteger, primary_key=True, autoincrement=True)
    full_name   = Column(String(160), nullable=False)
    email       = Column(String(255), nullable=True, unique=True)
    phone       = Column(String(30), nullable=True)
    license_no  = Column(String(60), nullable=True)
    license_exp = Column(Date, nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# ─────────────────────────────────────────
# 👨‍💼 Staff
# ─────────────────────────────────────────
class Staff(Base):
    __tablename__ = "staff"

    staff_id   = Column(BigInteger, primary_key=True, autoincrement=True)
    first_name  = Column(String(160), nullable=False)
    last_name  = Column(String(160), nullable=False)
    email      = Column(String(255), nullable=True, unique=True)
    branch_id  = Column(BigInteger, ForeignKey("branches.branch_id"), nullable=True)
    phone      = Column(String(30), nullable=True)
    role      = Column(String(30), nullable=True)
    hire_date   = Column(Date, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# ─────────────────────────────────────────
# 🚙 Car
# ─────────────────────────────────────────
class Car(Base):
    __tablename__ = "cars"

    car_id        = Column(BigInteger, primary_key=True, autoincrement=True)
    category_id   = Column(BigInteger, ForeignKey("car_categories.category_id"), nullable=False)
    status_id     = Column(SmallInteger, ForeignKey("car_status.status_id"), nullable=False)
    branch_id     = Column(BigInteger, ForeignKey("branches.branch_id"), nullable=True)
    vin           = Column(String(30), nullable=True, unique=True)
    license_plate = Column(String(20), nullable=True, unique=True)
    make          = Column(String(80), nullable=True)
    model         = Column(String(80), nullable=True)
    year          = Column(Integer, nullable=True)
    seat_count    = Column(Integer, nullable=True)
    transmission  = Column(String(30), nullable=True)
    fuel_type     = Column(String(30), nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint("vin IS NOT NULL OR license_plate IS NOT NULL",  name="cars_check"),
        CheckConstraint("seat_count > 0",                                name="cars_seat_count_check"),
        CheckConstraint(
            "year >= 1980 AND year <= (EXTRACT(year FROM now())::integer + 1)",
            name="cars_year_check"
        ),
        Index("idx_cars_branch",  "branch_id"),
        Index("idx_cars_status",  "status_id"),
    )


# ─────────────────────────────────────────
# 🔧 Maintenance
# ─────────────────────────────────────────
class Maintenance(Base):
    __tablename__ = "maintenance"

    maintenance_id = Column(BigInteger, primary_key=True, autoincrement=True)
    car_id         = Column(BigInteger, ForeignKey("cars.car_id", ondelete="CASCADE"), nullable=False)
    description    = Column(Text, nullable=False)
    maintenance_type  = Column(String, nullable=False)
    scheduled_at   = Column(DateTime(timezone=True), nullable=True)
    completed_at   = Column(DateTime(timezone=True), nullable=True)
    cost_amount    = Column(Numeric(10, 2), nullable=False, default=0)
    created_at     = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint("cost_amount >= 0", name="maintenance_cost_amount_check"),
        Index("idx_maintenance_car", "car_id"),
    )


# ─────────────────────────────────────────
# 📅 Reservation
# ─────────────────────────────────────────
class Reservation(Base):
    __tablename__ = "reservations"

    reservation_id = Column(BigInteger, primary_key=True, autoincrement=True)
    customer_id    = Column(BigInteger, ForeignKey("customers.customer_id"), nullable=False)
    branch_id      = Column(BigInteger, ForeignKey("branches.branch_id"), nullable=True)
    car_id         = Column(BigInteger, ForeignKey("cars.car_id"), nullable=False)
    total_amount   = Column(Numeric(10, 2), nullable=True)
    pickup_at      = Column(DateTime(timezone=True), nullable=False)
    dropoff_at     = Column(DateTime(timezone=True), nullable=False)
    status         = Column(String(30), nullable=False, default="pending")
    notes          = Column(Text, nullable=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint("dropoff_at > pickup_at", name="reservations_check"),
        CheckConstraint(
            "status IN ('pending','confirmed','cancelled','completed')",
            name="reservations_status_check"
        ),
        Index("idx_reservations_customer", "customer_id"),
        Index("idx_reservations_branch",   "branch_id"),
    )


# ─────────────────────────────────────────
# 🚀 Rental
# ─────────────────────────────────────────
class Rental(Base):
    __tablename__ = "rentals"

    rental_id         = Column(BigInteger, primary_key=True, autoincrement=True)
    reservation_id    = Column(BigInteger, ForeignKey("reservations.reservation_id", ondelete="SET NULL"), nullable=True)
    customer_id       = Column(BigInteger, ForeignKey("customers.customer_id"), nullable=False)
    car_id            = Column(BigInteger, ForeignKey("cars.car_id"), nullable=False)
    branch_pickup_id  = Column(BigInteger, ForeignKey("branches.branch_id"), nullable=True)
    branch_dropoff_id = Column(BigInteger, ForeignKey("branches.branch_id"), nullable=True)
    rental_date       = Column(DateTime(timezone=True), nullable=False)
    due_date          = Column(DateTime(timezone=True), nullable=False)
    return_date       = Column(DateTime(timezone=True), nullable=True)
    daily_rate        = Column(Numeric(10, 2), nullable=False)
    discount_amount   = Column(Numeric(10, 2), nullable=False, default=0)
    currency          = Column(CHAR(3), nullable=False, default="USD")
    status            = Column(String(30), nullable=False, default="active")
    mileage_start     = Column(Integer, nullable=True)
    mileage_end       = Column(Integer, nullable=True)
    total_amount      = Column(Numeric(12, 2), nullable=True)
    created_at        = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at        = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # ⚠️ rental_time_range is a GENERATED column — do NOT include in INSERT/UPDATE
    # SQLAlchemy reads it but never writes it
    # rental_time_range = Column(...)  ← omitted intentionally

    __table_args__ = (
        CheckConstraint("dropoff_at > pickup_at",       name="rentals_check"),
        CheckConstraint("daily_rate >= 0",              name="rentals_daily_rate_check"),
        CheckConstraint("discount_amount >= 0",         name="rentals_discount_amount_check"),
        CheckConstraint(
            "mileage_start IS NULL OR mileage_start >= 0",
            name="rentals_mileage_start_check"
        ),
        CheckConstraint(
            "mileage_end IS NULL OR mileage_end >= 0",
            name="rentals_mileage_end_check"
        ),
        CheckConstraint(
            "status IN ('active','closed','cancelled')",
            name="rentals_status_check"
        ),
        CheckConstraint(
            "total_amount IS NULL OR total_amount >= 0",
            name="rentals_total_amount_check"
        ),
        Index("idx_rentals_car",      "car_id"),
        Index("idx_rentals_customer", "customer_id"),
    )


# ─────────────────────────────────────────
# 💳 Payment
# ─────────────────────────────────────────
class Payment(Base):
    __tablename__ = "payments"

    payment_id = Column(BigInteger, primary_key=True, autoincrement=True)
    rental_id  = Column(BigInteger, ForeignKey("rentals.rental_id", ondelete="CASCADE"), nullable=False)
    amount     = Column(Numeric(10, 2), nullable=False)
    currency   = Column(CHAR(3), nullable=False, default="USD")
    method     = Column(String(30), nullable=False)
    status     = Column(String(30), nullable=False, default="paid")
    paid_at    = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    reference  = Column(String(120), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint("amount >= 0", name="payments_amount_check"),
        CheckConstraint(
            "method IN ('cash','card','bank_transfer','other')",
            name="payments_method_check"
        ),
        CheckConstraint(
            "status IN ('paid','pending','failed','refunded')",
            name="payments_status_check"
        ),
        Index("idx_payments_rental", "rental_id"),
    )