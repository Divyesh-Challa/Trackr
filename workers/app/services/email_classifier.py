import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
from app.config import config

logger = logging.getLogger(__name__)

class EmailClassifier:
    def __init__(self):
        self.gemini_model = None
        if config.GEMINI_API_KEY:
            try:
                import google.generativeai as genai
                self.gemini_model = genai.GenerativeModel("gemini-1.5-flash")
            except Exception as e:
                logger.warning(f"Could not load Gemini for email classifier: {e}")

    async def classify(self, sender: str, subject: str, body: str) -> Dict[str, Any]:
        text = f"Subject: {subject}\nFrom: {sender}\n\n{body}"

        # Rule-based pattern matching (fast, deterministic, zero-cost)
        intent = "STATUS_UPDATE"
        confidence = 0.85
        deadline_hours = None

        text_lower = text.lower()

        # 1. OA Invitation detection
        if any(k in text_lower for k in ["online assessment", "hackerrank", "codesignal", "karat", "oa invitation", "technical assessment"]):
            intent = "OA_INVITATION"
            confidence = 0.94
            # Look for timeframe (e.g. 48 hours, 72 hours, 5 days)
            m = re.search(r"within\s+(\d+)\s*(hours?|days?|hrs?)", text_lower)
            if m:
                val = int(m.group(1))
                unit = m.group(2)
                deadline_hours = val if "hour" in unit or "hr" in unit else val * 24
            else:
                deadline_hours = 72  # standard default OA window

        # 2. Interview Request
        elif any(k in text_lower for k in ["interview", "invitation to interview", "phone screen", "technical screen", "schedule a chat"]):
            intent = "INTERVIEW_REQUEST"
            confidence = 0.92

        # 3. Offer
        elif any(k in text_lower for k in ["offer of employment", "congratulations", "job offer", "pleased to offer"]):
            intent = "OFFER"
            confidence = 0.96

        # 4. Rejection
        elif any(k in text_lower for k in ["unfortunately", "not moving forward", "other candidates", "regret to inform", "pursuing other applicants"]):
            intent = "REJECTION"
            confidence = 0.93

        # Calculate deadline timestamp if hours detected
        deadline_at = None
        if deadline_hours:
            deadline_at = (datetime.now(timezone.utc) + timedelta(hours=deadline_hours)).isoformat()

        return {
            "intent": intent,
            "confidence": confidence,
            "deadline_hours": deadline_hours,
            "deadline_at": deadline_at,
            "requires_human_verification": confidence < 0.80
        }

email_classifier = EmailClassifier()
