from datetime import datetime, timedelta
from decimal import Decimal

import pytest
from pydantic import ValidationError

from schemas import RentalCreate, ReservationCreate


def test_rental_create_requires_reservation_id():
    with pytest.raises(ValidationError):
        RentalCreate(
            reservation_id=None,
            customer_id=1,
            car_id=1,
            rental_date=datetime.utcnow(),
            due_date=datetime.utcnow() + timedelta(days=1),
            daily_rate=Decimal("10.00"),
        )


def test_reservation_create_accepts_agreement_signature():
    reservation = ReservationCreate(
        customer_id=1,
        car_id=1,
        pickup_at=datetime.utcnow(),
        dropoff_at=datetime.utcnow() + timedelta(days=1),
        agreement_signature="data:image/png;base64,abc123",
        agreement_signed=True,
    )

    assert reservation.agreement_signature == "data:image/png;base64,abc123"
    assert reservation.agreement_signed is True
