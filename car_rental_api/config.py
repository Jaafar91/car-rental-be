import os
from pathlib import Path


def load_env_file():
    env_path = Path(__file__).resolve().parent / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ[key.strip()] = value.strip().strip('"').strip("'")


class Settings:
    def __init__(self):
        self.reload()

    def reload(self):
        load_env_file()
        self.default_currency = os.getenv("DEFAULT_CURRENCY", "").strip().upper() or "USD"
        self.default_locale = os.getenv("DEFAULT_LOCALE", "").strip() or "en-US"
        self.smtp_host = os.getenv("SMTP_HOST", "").strip()
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME", "").strip()
        self.smtp_password = os.getenv("SMTP_PASSWORD", "").strip()
        self.smtp_from_email = os.getenv("SMTP_FROM_EMAIL", "").strip()
        self.smtp_use_tls = os.getenv("SMTP_USE_TLS", "true").strip().lower() == "true"
        self.smtp_use_ssl = os.getenv("SMTP_USE_SSL", "false").strip().lower() == "true"


settings = Settings()
