import time
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import APIRouter, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    account,
    admin,
    admin_auth,
    auth,
    billing,
    categories,
    customers,
    health,
    links,
    notifications,
    orders,
    plan,
    products,
    reminders,
    sales,
    shop,
    staff,
    stats,
    store,
    telegram,
)
from app.core.config import get_settings
from app.core.errors import install_error_handlers
from app.core.ratelimit import limiter
from app.services import as_seller, monitor
from app.services.telegram import register_webhook

settings = get_settings()

if settings.sentry_dsn:
    # Errors, and the speed of a small share of requests
    # (SENTRY_TRACES_SAMPLE_RATE, 0 by default: the free quota).
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.environment,
        traces_sample_rate=settings.sentry_traces_sample_rate,
    )


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Only where PUBLIC_API_URL is set (production): a local server must
    # not point the bot at itself.
    if settings.telegram_configured and settings.public_api_url:
        await register_webhook()
    yield


app = FastAPI(title="Oak Order API", lifespan=lifespan)
app.state.limiter = limiter
install_error_handlers(app)


@app.middleware("http")
async def count_requests(request: Request, call_next):
    """Each request's route, time and status, for the admin's System page
    (services/monitor.py); in memory, the last hour."""
    started = time.perf_counter()
    status = 500
    try:
        response = await call_next(request)
        status = response.status_code
        return response
    finally:
        route = request.scope.get("route")
        monitor.record(
            getattr(route, "path", "other"), (time.perf_counter() - started) * 1000, status
        )


@app.middleware("http")
async def log_saves_as_seller(request: Request, call_next):
    """Open as seller (D1A): each save the admin makes in a shop's app is
    logged once it has worked (services/as_seller.py)."""
    response = await call_next(request)
    if request.method in as_seller.WRITES and 200 <= response.status_code < 300:
        acting = as_seller.acting(request.headers.get("authorization"))
        if acting is not None:
            await as_seller.record_save(*acting, request.method, request.url.path)
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_v1 = APIRouter(prefix="/api/v1")
api_v1.include_router(auth.router)
api_v1.include_router(account.router)
api_v1.include_router(store.router)
api_v1.include_router(staff.router)
api_v1.include_router(categories.router)
api_v1.include_router(products.router)
api_v1.include_router(sales.router)
api_v1.include_router(orders.router)
api_v1.include_router(stats.router)
api_v1.include_router(plan.router)
api_v1.include_router(plan.public_router)
api_v1.include_router(admin_auth.router)
api_v1.include_router(admin.router)
api_v1.include_router(billing.router)
api_v1.include_router(reminders.router)
api_v1.include_router(customers.router)
api_v1.include_router(notifications.router)
api_v1.include_router(links.router)
api_v1.include_router(shop.router)
api_v1.include_router(telegram.router)

app.include_router(health.router)
app.include_router(api_v1)
