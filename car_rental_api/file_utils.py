import re
from pathlib import Path
from io import BytesIO
from PIL import Image
from pypdf import PdfReader, PdfWriter


def _sanitize_name(value):
    clean = re.sub(r"[^A-Za-z0-9._-]+", "_", value or "").strip("._-")
    return clean or "document"


def _build_output_filename(customer_id, customer_name, upload_files):
    base_name = _sanitize_name(customer_name) if customer_name else "customer"
    customer_prefix = f"{customer_id}_{base_name}"
    return f"{customer_prefix}.pdf"


def save_identity_document(upload_files, customer_id, upload_root="uploads/customers", customer_name=None):
    if not upload_files:
        return None

    upload_dir = Path(upload_root)
    upload_dir.mkdir(parents=True, exist_ok=True)

    saved_name = _build_output_filename(customer_id, customer_name, upload_files)
    destination = upload_dir / saved_name

    writer = PdfWriter()
    pages_added = 0

    for upload_file in upload_files:
        if upload_file is None:
            continue

        filename = getattr(upload_file, "filename", "") or ""
        if not filename:
            continue

        lower_name = filename.lower()
        data = upload_file.file.read()

        if lower_name.endswith(".pdf"):
            reader = PdfReader(BytesIO(data))
            for page in reader.pages:
                writer.add_page(page)
            pages_added += len(reader.pages)
        elif lower_name.endswith((".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff")):
            with Image.open(BytesIO(data)) as image:
                converted = image.convert("RGB")
                image_bytes = BytesIO()
                converted.save(image_bytes, format="PDF")
                image_bytes.seek(0)
                reader = PdfReader(image_bytes)
                for page in reader.pages:
                    writer.add_page(page)
                pages_added += len(reader.pages)
        else:
            raise ValueError("Only PDF files and images are allowed")

    if pages_added == 0:
        raise ValueError("No valid files were provided")

    with destination.open("wb") as buffer:
        writer.write(buffer)

    return f"/uploads/customers/{saved_name}"
