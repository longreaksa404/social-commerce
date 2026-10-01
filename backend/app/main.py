import sentry_sdk
from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, categories, health, products, store
from app.core.config import get_settings
from app.core.errors import install_error_handlers
from app.core.ratelimit import limiter

settings = get_settings()

if settings.sentry_dsn:
    # Errors only; no performance tracing, to stay inside the free quota.
    sentry_sdk.init(dsn=settings.sentry_dsn, environment=settings.environment)

app = FastAPI(title="Social Commerce API")
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
api_v1.include_router(store.router)
api_v1.include_router(categories.router)
api_v1.include_router(products.router)

app.include_router(health.router)
app.include_router(api_v1)
