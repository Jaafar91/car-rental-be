from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import text
from database import engine, Base
from config import settings

# Import all routers
from routers import (
    branches, car_categories, car_status,
    customers, staff, cars, maintenance,
    reservations, rentals, payments, role_permissions
)

def ensure_staff_password_hash_column():
    with engine.begin() as conn:
        exists = conn.execute(text("""
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'staff'
              AND column_name = 'password_hash'
        """)).scalar()
        if not exists:
            conn.execute(text("ALTER TABLE staff ADD COLUMN password_hash VARCHAR(255)"))


def ensure_rental_staff_id_column():
    with engine.begin() as conn:
        exists = conn.execute(text("""
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'rentals'
              AND column_name = 'staff_id'
        """)).scalar()
        if not exists:
            conn.execute(text("ALTER TABLE rentals ADD COLUMN staff_id BIGINT"))


ensure_staff_password_hash_column()
ensure_rental_staff_id_column()
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Car Rental API", version="1.0.0")
app.state.settings = settings

# ✅ Serve static files (locales/ is inside static/)
app.mount("/static", StaticFiles(directory="static"), name="static")

# ✅ Serve dashboard at root
@app.api_route("/", methods=["GET", "HEAD"])
def serve_dashboard():
    return FileResponse("static/index.html")

@app.get('/api/config')
def get_config():
    settings.reload()
    return {
        'default_currency': settings.default_currency,
        'default_locale': settings.default_locale,
    }

# Include all routers
app.include_router(branches.router)
app.include_router(car_categories.router)
app.include_router(car_status.router)
app.include_router(customers.router)
app.include_router(staff.router)
app.include_router(cars.router)
app.include_router(maintenance.router)
app.include_router(reservations.router)
app.include_router(rentals.router)
app.include_router(payments.router)
app.include_router(role_permissions.router)