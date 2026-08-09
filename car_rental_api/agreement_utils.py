from html import escape
from typing import Any, Dict, Optional


def build_agreement_html(reservation: Dict[str, Any], customer: Optional[Dict[str, Any]] = None,
                         car: Optional[Dict[str, Any]] = None, signature_data: Optional[str] = None) -> str:
    customer_name = customer.get("full_name") if customer else "Customer"
    customer_email = customer.get("email") if customer else ""
    car_name = ""
    if car:
        car_name = f"{car.get('make') or ''} {car.get('model') or ''}".strip()
        if car.get("license_plate"):
            car_name = f"{car_name} ({car.get('license_plate')})".strip()

    reservation_id = reservation.get("reservation_id", "")
    pickup = reservation.get("pickup_at") or ""
    dropoff = reservation.get("dropoff_at") or ""
    total_amount = reservation.get("total_amount") or ""
    notes = reservation.get("notes") or ""

    signature_block = ""
    if signature_data:
        signature_block = (
            f'<div style="margin-top:20px;">'
            f'<h3>Customer Signature</h3>'
            f'<img src="{escape(signature_data)}" alt="Signed agreement" style="max-width:100%;max-height:220px;border:1px solid #d1d5db;padding:8px;background:#fff;" />'
            f'</div>'
        )

    return f"""
    <html>
      <body style="font-family:Arial,sans-serif;color:#111827;line-height:1.5;padding:24px;">
        <h2>Signed Agreement</h2>
        <p>Reservation #{reservation_id}</p>
        <p><strong>Customer:</strong> {escape(str(customer_name))}</p>
        <p><strong>Email:</strong> {escape(str(customer_email))}</p>
        <p><strong>Vehicle:</strong> {escape(str(car_name))}</p>
        <p><strong>Pickup:</strong> {escape(str(pickup))}</p>
        <p><strong>Dropoff:</strong> {escape(str(dropoff))}</p>
        <p><strong>Total Amount:</strong> {escape(str(total_amount))}</p>
        <p><strong>Notes:</strong> {escape(str(notes))}</p>
        {signature_block}
      </body>
    </html>
    """
