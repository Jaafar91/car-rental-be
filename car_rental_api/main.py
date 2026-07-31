from fastapi import FastAPI
from database import engine, Base
from routers import (
    branches, car_categories, car_status,
    customers, staff, cars, maintenance,
    reservations, rentals, payments
)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="🚗 Car Rental API",
    description="Complete Car Rental Management System",
    version="1.0.0"
)

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

@app.get("/")
def root():
    return {"message": "Welcome to Car Rental API 🚗"}