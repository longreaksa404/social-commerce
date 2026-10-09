from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    account,
    auth,
    categories,
    customers,
    health,
    links,
    notifications,
    orders,
    products,
    shop,
    staff,
    stats,
    store,
    telegram,
)
from app.core.config import get_settings
from app.core.errors import install_error_handlers
from app.core.ratelimit import limiter
from app.services.telegram import register_webhook

settings = get_settings()

if settings.sentry_dsn:
    # Errors only; no performance tracing, to stay inside the free quota.
    sentry_sdk.init(dsn=settings.sentry_dsn, environment=settings.environment)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Only where PUBLIC_API_URL is set (production): a local server must
    # not point the bot at itself.
    if settings.telegram_configured and settings.public_api_url:
        await register_webhook()
    yield


app = FastAPI(title="Social Commerce API", lifespan=lifespan)
app.state.limiter = limiter
install_error_handlers(app)

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
api_v1.include_router(orders.router)
api_v1.include_router(stats.router)
api_v1.include_router(customers.router)
api_v1.include_router(notifications.router)
api_v1.include_router(links.router)
api_v1.include_router(shop.router)
api_v1.include_router(telegram.router)

app.include_router(health.router)
app.include_router(api_v1)
