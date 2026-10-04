FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN useradd --create-home app
USER app

# Render's free plan has no pre-deploy command, so migrations run on start.
# Move `alembic upgrade head` to preDeployCommand in render.yaml once the
# service is on a paid instance.
# --proxy-headers: https/client from Render's proxy. Rate limits use
# CF-Connecting-IP instead (app/core/ratelimit.py).
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips=*"]
