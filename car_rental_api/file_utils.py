from pathlib import Path
from uuid import uuid4
import shutil


def save_identity_document(upload_file, customer_id, upload_root="uploads/customers"):
    if upload_file is None:
        return None

    filename = getattr(upload_file, "filename", "") or ""
    if not filename.lower().endswith(".pdf"):
        raise ValueError("Only PDF files are allowed")

    upload_dir = Path(upload_root)
    upload_dir.mkdir(parents=True, exist_ok=True)

    saved_name = f"customer_{customer_id}_{uuid4().hex}.pdf"
    destination = upload_dir / saved_name

    with destination.open("wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)

    return f"/uploads/customers/{saved_name}"
