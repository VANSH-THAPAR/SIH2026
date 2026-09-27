import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

# Application settings
APP_NAME = "SIF Precursor Intelligence"
APP_VERSION = "1.0.0"
DEBUG = os.getenv("DEBUG", "false").lower() == "true"

# CORS settings
ALLOWED_ORIGINS_ENV = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS_ENV.split(",") if origin.strip()]

if DEBUG:
    ALLOWED_ORIGINS.extend([
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ])

# Pagination defaults
DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 200

# SIF Score thresholds
SIF_CRITICAL_THRESHOLD = 85
SIF_HIGH_THRESHOLD = 70
SIF_MEDIUM_THRESHOLD = 50

# Priority mapping from SIF scores
def sif_score_to_priority(score: float) -> str:
    if score >= SIF_CRITICAL_THRESHOLD:
        return "CRITICAL"
    elif score >= SIF_HIGH_THRESHOLD:
        return "HIGH"
    elif score >= SIF_MEDIUM_THRESHOLD:
        return "MEDIUM"
    else:
        return "LOW"
