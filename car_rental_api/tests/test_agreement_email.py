from agreement_utils import build_agreement_html


def test_build_agreement_html_includes_signature_and_customer_details():
    html = build_agreement_html(
        reservation={
            "reservation_id": 12,
            "customer_id": 7,
            "car_id": 3,
            "pickup_at": "2026-08-10T10:00:00",
            "dropoff_at": "2026-08-12T10:00:00",
            "total_amount": "250.00",
            "status": "confirmed",
            "notes": "Airport pickup",
        },
        customer={"full_name": "John Doe", "email": "john@example.com"},
        car={"make": "Toyota", "model": "Corolla", "license_plate": "ABC-123"},
        signature_data="data:image/png;base64,abc123",
    )

    assert "Signed Agreement" in html
    assert "John Doe" in html
    assert "Toyota Corolla" in html
    assert "ABC-123" in html
    assert "data:image/png;base64,abc123" in html
