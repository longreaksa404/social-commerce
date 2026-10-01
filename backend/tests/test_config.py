from app.core.config import Settings

SECRET = "x" * 32


def test_neon_url_is_converted_for_asyncpg():
    settings = Settings(
        database_url="postgresql://u:p@ep-x.ap-southeast-1.aws.neon.tech/db"
        "?sslmode=require&channel_binding=require",
        jwt_secret=SECRET,
    )

    assert settings.database_url == (
        "postgresql+asyncpg://u:p@ep-x.ap-southeast-1.aws.neon.tech/db?ssl=require"
    )


def test_local_asyncpg_url_is_unchanged():
    url = "postgresql+asyncpg://app:change-me@localhost:5432/social_commerce"

    assert Settings(database_url=url, jwt_secret=SECRET).database_url == url
