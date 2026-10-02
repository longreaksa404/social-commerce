"""KHQR codes for the order page (02_TECHNICAL.md section 10.3).

A KHQR is an EMVCo QR payment payload pointing at the seller's Bakong ID,
so it is built here without calling Bakong and needs no API token. Only
checking whether it was paid would need the Bakong Open API (post-MVP);
the seller checks their bank app and records the payment by hand.

Follows the NBC KHQR SDK v2.9 (JavaScript `bakong-khqr` 1.0.20) for an
individual's code with an amount; the tests compare against strings that
SDK generated.
"""

from datetime import datetime, timedelta
from decimal import Decimal

from app.models import Currency

# A code with an amount must say when it expires, and bank apps refuse it
# after that. The customer may save it and pay from their bank app later;
# the order page makes a fresh one each time it's opened.
VALID_FOR = timedelta(hours=24)
MERCHANT_CITY = "Phnom Penh"  # the SDK's default
MERCHANT_CATEGORY = "5999"  # the SDK's default: miscellaneous retail
CURRENCY_CODES = {Currency.USD: "840", Currency.KHR: "116"}


def individual_khqr(
    *,
    bakong_account_id: str,
    merchant_name: str,
    currency: Currency,
    amount: Decimal,
    bill_number: str,
    now: datetime,
) -> str | None:
    """The code for paying `amount` to this Bakong account, or None if the
    amount can't be paid by KHQR (nothing to pay, or riel with cents)."""
    amount_text = _amount(amount, currency)
    if amount_text is None:
        return None
    payload = "".join(
        [
            _tlv("00", "01"),  # payload format
            _tlv("01", "12"),  # dynamic: carries an amount
            _tlv("29", _tlv("00", bakong_account_id)),  # an individual's account
            _tlv("52", MERCHANT_CATEGORY),
            _tlv("53", CURRENCY_CODES[currency]),
            _tlv("54", amount_text),
            _tlv("58", "KH"),
            _tlv("59", merchant_name),
            _tlv("60", MERCHANT_CITY),
            _tlv("62", _tlv("01", bill_number)),  # the order number, for the seller's records
            _tlv("99", _tlv("00", _ms(now)) + _tlv("01", _ms(now + VALID_FOR))),
            "6304",  # the CRC's own tag and length are part of what it covers
        ]
    )
    return payload + crc16(payload)


def _tlv(tag: str, value: str) -> str:
    if len(value) > 99:
        raise ValueError(f"KHQR field {tag} is too long")
    return f"{tag}{len(value):02d}{value}"


def _ms(moment: datetime) -> str:
    return str(int(moment.timestamp() * 1000))


def _amount(amount: Decimal, currency: Currency) -> str | None:
    """As the SDK writes it: "12" or "12.50" for dollars, whole riel only."""
    if amount <= 0:
        return None
    whole = amount == amount.to_integral_value()
    if currency is Currency.KHR:
        return str(int(amount)) if whole else None
    return str(int(amount)) if whole else f"{amount:.2f}"


def crc16(data: str) -> str:
    """CRC-16/CCITT-FALSE (polynomial 0x1021, start 0xFFFF), as 4 hex digits."""
    crc = 0xFFFF
    for byte in data.encode():
        crc ^= byte << 8
        for _ in range(8):
            crc = (crc << 1) ^ 0x1021 if crc & 0x8000 else crc << 1
            crc &= 0xFFFF
    return f"{crc:04X}"
