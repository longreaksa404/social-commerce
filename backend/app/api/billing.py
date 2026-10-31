"""The daily run, called by cron-job.org (01_PRODUCT.md §33.1): payment
reminders. Hidden from the schema."""

import hmac

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException

from app.core.config import get_settings
from app.services import jobs

router = APIRouter(tags=["billing"], include_in_schema=False)


@router.post("/billing/run", status_code=202)
async def billing_run(
    background: BackgroundTasks,
    x_cron_secret: str = Header(default=""),
) -> dict[str, bool]:
    """With BILLING_CRON_SECRET in X-Cron-Secret, else 404. Answers at
    once; the run goes on after."""
    secret = get_settings().billing_cron_secret
    if not secret or not hmac.compare_digest(x_cron_secret, secret):
        raise HTTPException(status_code=404)
    background.add_task(jobs.run, "billing")
    return {"started": True}
