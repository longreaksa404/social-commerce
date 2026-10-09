from starlette.requests import Request

from app.core.ratelimit import client_ip, limiter


def _request(headers: dict[str, str], client: str = "10.0.0.1") -> Request:
    return Request(
        {
            "type": "http",
            "headers": [(k.lower().encode(), v.encode()) for k, v in headers.items()],
            "client": (client, 1234),
        }
    )


def test_client_ip_is_cloudflare_s_and_ignores_x_forwarded_for():
    request = _request({"CF-Connecting-IP": "198.51.100.7", "X-Forwarded-For": "1.2.3.4"})
    assert client_ip(request) == "198.51.100.7"


def test_client_ip_without_a_valid_cloudflare_header_is_the_connection_s():
    assert client_ip(_request({})) == "10.0.0.1"
    assert client_ip(_request({"CF-Connecting-IP": "not-an-ip"})) == "10.0.0.1"


async def test_a_fake_x_forwarded_for_does_not_reset_the_login_limit(client):
    """Before the fix, each made-up X-Forwarded-For got its own 10/minute."""
    body = {"login": "012 000 000", "password": "wrong-password"}
    limiter.enabled = True
    try:
        for i in range(10):
            headers = {"CF-Connecting-IP": "198.51.100.7", "X-Forwarded-For": f"203.0.113.{i}"}
            response = await client.post("/api/v1/auth/login", json=body, headers=headers)
            assert response.status_code == 401
        headers = {"CF-Connecting-IP": "198.51.100.7", "X-Forwarded-For": "203.0.113.99"}
        response = await client.post("/api/v1/auth/login", json=body, headers=headers)
        assert response.status_code == 429

        other = {"CF-Connecting-IP": "198.51.100.8"}
        response = await client.post("/api/v1/auth/login", json=body, headers=other)
        assert response.status_code == 401
    finally:
        limiter.enabled = False
        limiter.reset()
