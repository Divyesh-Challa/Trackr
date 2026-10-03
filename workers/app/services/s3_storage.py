import logging
import boto3
from botocore.client import Config as BotoConfig
from app.config import config

logger = logging.getLogger(__name__)

class S3StorageService:
    def __init__(self):
        self.client = None
        try:
            self.client = boto3.client(
                "s3",
                endpoint_url=config.S3_ENDPOINT,
                aws_access_key_id=config.S3_ACCESS_KEY,
                aws_secret_access_key=config.S3_SECRET_KEY,
                config=BotoConfig(signature_version="s3v4", connect_timeout=1, read_timeout=1, retries={'max_attempts': 1}),
                region_name="us-east-1"
            )
        except Exception as e:
            logger.warning(f"Could not connect to S3/MinIO: {e}")

    def _ensure_buckets(self):
        if not self.client:
            return
        for bucket in [config.S3_BUCKET_SNAPSHOTS, config.S3_BUCKET_EMAILS]:
            try:
                self.client.head_bucket(Bucket=bucket)
            except Exception:
                try:
                    self.client.create_bucket(Bucket=bucket)
                    logger.info(f"Created S3 bucket: {bucket}")
                except Exception as ce:
                    logger.warning(f"Failed to create bucket {bucket}: {ce}")

    def upload_snapshot(self, key: str, content: str, content_type: str = "text/html") -> str:
        if not self.client:
            return f"local-mock://{key}"
        try:
            self.client.put_object(
                Bucket=config.S3_BUCKET_SNAPSHOTS,
                Key=key,
                Body=content.encode("utf-8"),
                ContentType=content_type
            )
            return f"{config.S3_ENDPOINT}/{config.S3_BUCKET_SNAPSHOTS}/{key}"
        except Exception as e:
            logger.error(f"S3 upload error for {key}: {e}")
            return f"fallback://{key}"

    def upload_email_payload(self, key: str, content: str) -> str:
        if not self.client:
            return f"local-mock://{key}"
        try:
            self.client.put_object(
                Bucket=config.S3_BUCKET_EMAILS,
                Key=key,
                Body=content.encode("utf-8"),
                ContentType="application/json"
            )
            return f"{config.S3_ENDPOINT}/{config.S3_BUCKET_EMAILS}/{key}"
        except Exception as e:
            logger.error(f"S3 upload error for email {key}: {e}")
            return f"fallback://{key}"

s3_service = S3StorageService()
