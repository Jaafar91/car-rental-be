from sqlalchemy import text

from database import SessionLocal, engine
from models import Staff
from auth_utils import hash_password


def ensure_password_hash_column():
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


def main():
    ensure_password_hash_column()
    db = SessionLocal()
    try:
        staffs = db.query(Staff).all()
        updated = 0
        target_hash = hash_password('123456')
        for staff in staffs:
            if staff.password_hash != target_hash:
                staff.password_hash = target_hash
                updated += 1
        db.commit()
        print(f'Updated {updated} staff records with password 123456')
    finally:
        db.close()


if __name__ == '__main__':
    main()
