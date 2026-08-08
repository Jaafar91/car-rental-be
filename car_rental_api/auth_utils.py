import base64
import hashlib
import hmac
import json
import os
import time
from typing import Any, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from database import get_db
from models import Staff

security = HTTPBearer(auto_error=False)

SECRET_KEY = os.getenv("AUTH_SECRET_KEY", "car-rental-dev-secret")
TOKEN_TTL_SECONDS = int(os.getenv("AUTH_TOKEN_TTL_SECONDS", "28800"))


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def verify_password(password: str, password_hash: Optional[str]) -> bool:
    if not password_hash:
        return False
    return hash_password(password) == password_hash


def create_access_token(staff: Staff) -> str:
    payload = {
        "sub": str(staff.staff_id),
        "email": (staff.email or "").strip().lower(),
        "role": (staff.role or "agent").strip().lower(),
        "exp": int(time.time()) + TOKEN_TTL_SECONDS,
    }
    payload_json = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    signature = hmac.new(SECRET_KEY.encode("utf-8"), payload_json.encode("utf-8"), hashlib.sha256).hexdigest()
    encoded = base64.urlsafe_b64encode(payload_json.encode("utf-8")).decode("utf-8").rstrip("=")
    return f"{encoded}.{signature}"


def decode_access_token(token: str) -> Optional[dict[str, Any]]:
    if not token:
        return None
    try:
        encoded_payload, signature = token.split(".", 1)
    except ValueError:
        return None

    payload_json = base64.urlsafe_b64decode(encoded_payload + "=" * (-len(encoded_payload) % 4)).decode("utf-8")
    expected_signature = hmac.new(SECRET_KEY.encode("utf-8"), payload_json.encode("utf-8"), hashlib.sha256).hexdigest()
    if hmac.compare_digest(signature, expected_signature):
        payload = json.loads(payload_json)
        if int(payload.get("exp", 0)) < int(time.time()):
            return None
        return payload
    return None


def get_current_staff(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> Staff:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    staff = db.query(Staff).filter(Staff.staff_id == int(payload.get("sub", 0))).first()
    if not staff or not staff.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid staff account")
    return staff


def require_roles(*allowed_roles):
    allowed = {role.lower() for role in allowed_roles}

    def dependency(staff: Staff = Depends(get_current_staff)) -> Staff:
        role = (staff.role or "").strip().lower()
        if role not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return staff

    return dependency
