"""The hourly run, called by cron-job.org: payment reminders to customers
(app/services/order_reminders.py). Hidden from the schema."""

import hmac

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException

from app.core.config import get_settings
from app.services import order_reminders

router = APIRouter(tags=["reminders"], include_in_schema=False)


@router.post("/reminders/run", status_code=202)
async def reminders_run(
    background: BackgroundTasks,
    x_cron_secret: str = Header(default=""),
) -> dict[str, bool]:
    """With BILLING_CRON_SECRET in X-Cron-Secret (the daily billing run's),
    else 404. Answers at once; the run goes on after."""
    secret = get_settings().billing_cron_secret
    if not secret or not hmac.compare_digest(x_cron_secret, secret):
        raise HTTPException(status_code=404)
    background.add_task(order_reminders.run)
    return {"started": True}
