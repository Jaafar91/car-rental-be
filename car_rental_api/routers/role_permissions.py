from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth_utils import get_current_staff, require_roles
from database import get_db
from models import RoleModuleAccess, Staff

router = APIRouter(prefix="/role-permissions", tags=["Role Permissions"])

MODULE_DEFINITIONS = [
    {"key": "dashboard", "label": "Dashboard", "page": "dashboard"},
    {"key": "branches", "label": "Branches", "page": "branches"},
    {"key": "car_categories", "label": "Car Categories", "page": "car_categories"},
    {"key": "car_status", "label": "Car Status", "page": "car_status"},
    {"key": "cars", "label": "Cars", "page": "cars"},
    {"key": "customers", "label": "Customers", "page": "customers"},
    {"key": "profile", "label": "Profile", "page": "profile"},
    {"key": "reservations", "label": "Reservations", "page": "reservations"},
    {"key": "rentals", "label": "Rentals", "page": "rentals"},
    {"key": "payments", "label": "Payments", "page": "payments"},
    {"key": "maintenance", "label": "Maintenance", "page": "maintenance"},
    {"key": "staff", "label": "Staff Management", "page": "staff"},
    {"key": "role_access", "label": "Role Access", "page": "role_access"},
]

ROLE_ORDER = ["admin", "manager", "agent"]
DEFAULT_ROLE_MODULES = {
    "admin": [module["key"] for module in MODULE_DEFINITIONS],
    "manager": [
        "dashboard",
        "branches",
        "car_categories",
        "car_status",
        "cars",
        "customers",
        "profile",
        "reservations",
        "rentals",
        "payments",
        "maintenance",
    ],
    "agent": [
        "dashboard",
        "customers",
        "profile",
        "reservations",
        "rentals",
    ],
}


class RolePermissionPayload(BaseModel):
    role: str
    modules: List[str]


class RolePermissionResponse(BaseModel):
    roles: List[str]
    modules: List[dict]
    permissions: dict


def normalize_role(role: Optional[str]) -> str:
    return (role or "agent").strip().lower() or "agent"


def get_default_modules_for_role(role: str) -> List[str]:
    return list(DEFAULT_ROLE_MODULES.get(normalize_role(role), DEFAULT_ROLE_MODULES["agent"]))


def resolve_role_permissions(default_modules: List[str], rows: List[RoleModuleAccess]) -> List[str]:
    if not rows:
        return sorted(default_modules)

    allowed_modules = set()
    for row in rows:
        if row.can_access:
            allowed_modules.add(row.module_key)
        else:
            allowed_modules.discard(row.module_key)

    return sorted(allowed_modules)


def get_role_permissions(db: Session, role: str) -> List[str]:
    role_key = normalize_role(role)
    defaults = get_default_modules_for_role(role_key)
    rows = db.query(RoleModuleAccess).filter(RoleModuleAccess.role_name == role_key).all()
    return resolve_role_permissions(defaults, rows)


@router.get("/me")
def get_my_permissions(
    staff: Staff = Depends(get_current_staff),
    db: Session = Depends(get_db),
):
    role_name = normalize_role(staff.role)
    return {
        "role": role_name,
        "modules": get_role_permissions(db, role_name),
    }


@router.get("/", response_model=RolePermissionResponse, dependencies=[Depends(require_roles("admin"))])
def list_permissions(db: Session = Depends(get_db)):
    permissions = {
        role: get_role_permissions(db, role)
        for role in ROLE_ORDER
    }
    return {
        "roles": ROLE_ORDER,
        "modules": MODULE_DEFINITIONS,
        "permissions": permissions,
    }


@router.post("/", dependencies=[Depends(require_roles("admin"))])
def save_permissions(payload: RolePermissionPayload, db: Session = Depends(get_db)):
    role_key = normalize_role(payload.role)
    if role_key not in ROLE_ORDER:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported role")

    db.query(RoleModuleAccess).filter(RoleModuleAccess.role_name == role_key).delete(synchronize_session=False)

    selected_modules = set(payload.modules or [])
    for module in MODULE_DEFINITIONS:
        module_key = module["key"]
        db.add(RoleModuleAccess(
            role_name=role_key,
            module_key=module_key,
            can_access=module_key in selected_modules,
        ))

    db.commit()
    return {"role": role_key, "modules": sorted(selected_modules)}
