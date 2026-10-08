import os
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


class Config:
    PORT: int = int(os.getenv("PORT", os.getenv("AI_WORKER_PORT", "8085")))
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    S3_ENDPOINT: str = os.getenv("S3_ENDPOINT", "http://localhost:9000")
    S3_ACCESS_KEY: str = os.getenv("S3_ACCESS_KEY", "")
    S3_SECRET_KEY: str = os.getenv("S3_SECRET_KEY", "")
    S3_BUCKET_SNAPSHOTS: str = os.getenv("S3_BUCKET_SNAPSHOTS", "trackr-snapshots")
    S3_BUCKET_EMAILS: str = os.getenv("S3_BUCKET_EMAILS", "trackr-emails")
    
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

config = Config()
