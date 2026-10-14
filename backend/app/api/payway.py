"""What calls in from outside for billing (01_PRODUCT.md §33.1): PayWay's
callbacks and the daily run. None of it trusts the request's body for
money: a callback only makes us ask PayWay (app/services/billing.py)."""

import hmac
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Request

from app.core.config import get_settings
from app.core.ratelimit import check_limit
from app.services import billing

router = APIRouter(tags=["billing"], include_in_schema=False)


async def _body(request: Request) -> dict[str, Any]:
    try:
        body = await request.json()
    except ValueError:
        return {}
    return body if isinstance(body, dict) else {}


@router.post("/payway/callback")
async def payway_callback(request: Request) -> dict[str, Any]:
    """A payment finished at PayWay (Pay now or an auto-charge)."""
    check_limit("120/minute", "payway", request)
    tran_id = str((await _body(request)).get("tran_id") or "")[:40]
    if tran_id:
        await billing.settle(tran_id)
    return {}


@router.post("/payway/token-callback")
async def payway_token_callback(request: Request) -> dict[str, Any]:
    """A subscription saved the seller's ABA account or card. Set in
    PayWay's Outlet Profile → Services → Credential on File."""
    check_limit("120/minute", "payway", request)
    request_id = str((await _body(request)).get("request_id") or "")[:40]
    if request_id:
        await billing.save_token(request_id)
    return {}


@router.post("/billing/run", status_code=202)
async def billing_run(
    background: BackgroundTasks,
    x_cron_secret: str = Header(default=""),
) -> dict[str, bool]:
    """The daily run, called by cron-job.org with BILLING_CRON_SECRET in
    X-Cron-Secret. Answers at once; the run goes on after."""
    secret = get_settings().billing_cron_secret
    if not secret or not hmac.compare_digest(x_cron_secret, secret):
        raise HTTPException(status_code=404)
    background.add_task(billing.run_daily)
    return {"started": True}
