"""ABA PayWay, how sellers pay Oak Order (01_PRODUCT.md §33.1). Only what
billing needs, from PayWay's developer docs (developer.payway.com.kh):

- the checkout form, for Pay now; with `ctid`, `token_flag=CITR_FIX` and
  `frequency=1M` the same form is a subscription, which also saves the
  seller's ABA account or card for auto-charge (scheduled payment);
- checking a transaction (the truth about a payment: callbacks only make
  us check);
- charging a saved token (`MITR_FIX`), a token's details, removing one.

Every request is signed: base64 of HMAC-SHA512 over the request's values
joined in PayWay's order, keyed with our API key (PAYWAY_API_KEY). PayWay
only takes requests from addresses it has whitelisted.
"""

import base64
import hashlib
import hmac
import json
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

import httpx

from app.core.config import get_settings

PURCHASE = "/api/payment-gateway/v1/payments/purchase"
CHECK_TRANSACTION = "/api/payment-gateway/v1/payments/check-transaction-2"
TOKEN_PAYMENT = "/api/payment-gateway/v3/purchase/payment-credential"
TOKEN_DETAILS = "/api/payment-credential/v3/token-management/get-token-details"
REMOVE_TOKEN = "/api/payment-credential/v3/token-management/remove-token"

# How long a checkout can be paid, in minutes (PayWay: 3 to 43200). A KHQR
# paid later is sent back to the payer.
CHECKOUT_MINUTES = 60
# Codes from charging a token that mean the token can't be used again
# (disabled, expired, removed): auto-charge is turned off.
DEAD_TOKEN_CODES = {"83", "84", "87"}


class PaywayError(Exception):
    """PayWay couldn't be reached, or answered with something unusable."""


def _http() -> httpx.AsyncClient:
    """Separate so tests can answer for PayWay."""
    return httpx.AsyncClient(timeout=20)


def _sign(*values: str) -> str:
    key = get_settings().payway_api_key.encode()
    digest = hmac.new(key, "".join(values).encode(), hashlib.sha512).digest()
    return base64.b64encode(digest).decode()


def _now() -> str:
    """PayWay's request time: UTC, YYYYMMDDHHmmss."""
    return datetime.now(UTC).strftime("%Y%m%d%H%M%S")


def _b64(value: str) -> str:
    return base64.b64encode(value.encode()).decode()


def new_tran_id() -> str:
    """Ours, unique: 20 characters, PayWay's longest."""
    return secrets.token_hex(10)


def new_ctid() -> str:
    """The seller's id at PayWay for saved tokens: 24 characters, its longest."""
    return secrets.token_hex(12)


def money(amount: Decimal) -> str:
    return f"{amount:.2f}"


@dataclass(frozen=True)
class CheckoutForm:
    """Posted by the seller's browser to PayWay, which answers with its
    checkout page."""

    action: str
    fields: dict[str, str]


def checkout_form(
    *,
    tran_id: str,
    amount: Decimal,
    item: str,
    callback_url: str | None,
    continue_url: str,
    cancel_url: str,
    subscribe: tuple[str, str] | None = None,
) -> CheckoutForm:
    """Pay now. `subscribe` = (ctid, payment option `abapay` or `cards`):
    a monthly subscription for auto-charge, paying the first month now."""
    settings = get_settings()
    values: dict[str, str] = {
        "req_time": _now(),
        "merchant_id": settings.payway_merchant_id,
        "tran_id": tran_id,
        "amount": money(amount),
        "items": _b64(json.dumps([{"name": item, "quantity": 1, "price": float(amount)}])),
        "shipping": "",
        "firstname": "",
        "lastname": "",
        "email": "",
        "phone": "",
        "type": "purchase",
        # Empty: PayWay shows every way to pay the profile has.
        "payment_option": subscribe[1] if subscribe else "",
        "return_url": _b64(callback_url) if callback_url else "",
        "cancel_url": cancel_url,
        "continue_success_url": continue_url,
        "return_deeplink": "",
        "currency": "USD",
        "custom_fields": "",
        "return_params": "",
        "payout": "",
        "lifetime": str(CHECKOUT_MINUTES),
        "additional_params": "",
        "google_pay_token": "",
        "skip_success_page": "1",
        "token_flag": "CITR_FIX" if subscribe else "",
        "frequency": "1M" if subscribe else "",
    }
    # The hash covers these, in this order (empty ones count as "").
    fields = {**values, "hash": _sign(*values.values())}
    if subscribe:
        fields["ctid"] = subscribe[0]
    fields["view_type"] = "hosted_view"
    # Only what's set: PayWay reads a missing field as empty.
    return CheckoutForm(
        action=f"{settings.payway_base_url}{PURCHASE}",
        fields={k: v for k, v in fields.items() if v != ""},
    )


@dataclass(frozen=True)
class Transaction:
    """A transaction as PayWay's check sees it."""

    state: str  # "approved", "pending", "declined" or "not_found"
    amount: Decimal | None = None
    currency: str | None = None


async def _post(path: str, body: dict[str, Any]) -> dict[str, Any]:
    url = f"{get_settings().payway_base_url}{path}"
    try:
        async with _http() as client:
            response = await client.post(url, json=body)
        answer = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise PaywayError(f"PayWay {path}: {exc!r}") from exc
    if not isinstance(answer, dict):
        raise PaywayError(f"PayWay {path}: unexpected answer")
    return answer


def _code(answer: dict[str, Any]) -> str:
    status = answer.get("status") or (answer.get("data") or {}).get("status") or {}
    return str(status.get("code", "")) if isinstance(status, dict) else ""


async def check_transaction(tran_id: str) -> Transaction:
    settings = get_settings()
    req_time = _now()
    answer = await _post(
        CHECK_TRANSACTION,
        {
            "req_time": req_time,
            "merchant_id": settings.payway_merchant_id,
            "tran_id": tran_id,
            "hash": _sign(req_time, settings.payway_merchant_id, tran_id),
        },
    )
    code = _code(answer)
    if code == "6":
        return Transaction("not_found")
    if code != "00":
        raise PaywayError(f"PayWay check {tran_id}: code {code}")
    data = answer.get("data") or {}
    state = {
        "APPROVED": "approved",
        "PENDING": "pending",
        "DECLINED": "declined",
        "CANCELLED": "declined",
    }.get(str(data.get("payment_status", "")).upper())
    if state is None:  # REFUNDED, PRE-AUTH or unknown: never "paid"
        raise PaywayError(f"PayWay check {tran_id}: {data.get('payment_status')}")
    paid = data.get("payment_amount", data.get("total_amount"))
    return Transaction(
        state,
        Decimal(str(paid)) if paid is not None else None,
        data.get("payment_currency"),
    )


@dataclass(frozen=True)
class Charge:
    """What PayWay said to charging a token: accepted (then check the
    transaction), or refused with its code and message."""

    accepted: bool
    code: str
    message: str

    @property
    def token_dead(self) -> bool:
        return self.code in DEAD_TOKEN_CODES


async def charge_token(
    *, tran_id: str, ctid: str, pwt: str, amount: Decimal, callback_url: str | None
) -> Charge:
    """Auto-charge: the saved token, the amount the seller subscribed to."""
    settings = get_settings()
    request_time = _now()
    values = {
        "request_time": request_time,
        "merchant_id": settings.payway_merchant_id,
        "tran_id": tran_id,
        "amount": money(amount),
        "currency": "USD",
        "items": "",
        "ctid": ctid,
        "pwt": pwt,
        "first_name": "",
        "last_name": "",
        "email": "",
        "phone": "",
        "purchase_type": "purchase",
        "callback_url": _b64(callback_url) if callback_url else "",
        "custom_fields": "",
        "return_params": "",
        "payout": "",
        "token_flag": "MITR_FIX",
        "shipping_fee": "",
    }
    body: dict[str, Any] = {k: v for k, v in values.items() if v != ""}
    body["amount"] = float(amount)
    body["hash"] = _sign(*values.values())
    answer = await _post(TOKEN_PAYMENT, body)
    status = answer.get("status") or {}
    code = str(status.get("code", ""))
    return Charge(code == "00", code, str(status.get("message", "")))


@dataclass(frozen=True)
class Token:
    ctid: str
    pwt: str
    label: str  # what the seller sees: "ABA ···5312", "Visa ···4242"
    active: bool


def _label(kind: str, source: str) -> str:
    last = "".join(ch for ch in source if ch.isdigit())[-4:]
    name = {"ABA ACCOUNT": "ABA", "MC": "Mastercard", "CUP": "UnionPay"}.get(kind, kind)
    return f"{name} ···{last}" if last else name


def token_from(credential: dict[str, Any]) -> Token | None:
    if not credential.get("ctid") or not credential.get("pwt"):
        return None
    return Token(
        ctid=str(credential["ctid"]),
        pwt=str(credential["pwt"]),
        label=_label(str(credential.get("type", "")), str(credential.get("source_of_fund", ""))),
        active=str(credential.get("status")) == "1",
    )


async def token_details(request_id: str) -> Token | None:
    """The token a subscription (our `tran_id`) saved, from PayWay itself."""
    settings = get_settings()
    request_time = _now()
    answer = await _post(
        TOKEN_DETAILS,
        {
            "request_time": request_time,
            "merchant_id": settings.payway_merchant_id,
            "request_id": request_id,
            "hash": _sign(settings.payway_merchant_id, request_time, request_id),
        },
    )
    if _code(answer) != "00":
        return None
    data = answer.get("data")
    return token_from(data) if isinstance(data, dict) else None


async def remove_token(ctid: str, pwt: str) -> bool:
    settings = get_settings()
    request_time = _now()
    answer = await _post(
        REMOVE_TOKEN,
        {
            "request_time": request_time,
            "merchant_id": settings.payway_merchant_id,
            "ctid": ctid,
            "pwt": pwt,
            "hash": _sign(settings.payway_merchant_id, ctid, request_time, pwt),
        },
    )
    return _code(answer) == "00"
