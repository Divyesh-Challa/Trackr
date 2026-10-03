import asyncio
import logging
from datetime import datetime, timezone
import asyncpg

logger = logging.getLogger(__name__)

class DeadlineWatchdog:
    async def run(self, pool: asyncpg.Pool):
        logger.info("Started OA Deadline Watchdog service.")
        while True:
            try:
                await self.check_deadlines(pool)
            except Exception as e:
                logger.error(f"Watchdog run error: {e}")
            await asyncio.sleep(60) # check every minute

    async def check_deadlines(self, pool: asyncpg.Pool):
        query = """
            SELECT m.id, m.application_id, m.milestone_type, m.deadline_at, a.company_name, a.role_title
            FROM application_milestones m
            JOIN applications a ON m.application_id = a.id
            WHERE m.is_completed = FALSE AND m.deadline_at IS NOT NULL
              AND m.deadline_at <= NOW() + INTERVAL '24 hours'
            ORDER BY m.deadline_at ASC
        """
        async with pool.acquire() as conn:
            rows = await conn.fetch(query)
            if rows:
                for row in rows:
                    logger.info(
                        f"[WATCHDOG ALERT] Approaching deadline for {row['company_name']} - "
                        f"{row['milestone_type']} due at {row['deadline_at']}"
                    )

watchdog = DeadlineWatchdog()
