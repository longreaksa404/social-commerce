"""Payments: the seller's payment settings (stored in store.payment_config)
and an order's payment, as the seller and as the customer see it."""

from datetime import datetime
from decimal import Decimal
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, StringConstraints
from pydantic_core import PydanticCustomError

from app.models import PaymentMethod, PaymentStatus


def _bakong_account_id(value: str) -> str:
    if value and (value.count("@") != 1 or value.startswith("@") or value.endswith("@")):
        raise PydanticCustomError("bakong_id", "A Bakong ID looks like name@bank.")
    if any(c.isspace() for c in value):
        raise PydanticCustomError("bakong_id", "A Bakong ID has no spaces.")
    return value


def _latin(value: str) -> str:
    # KHQR's merchant name is plain ASCII; bank apps show it when scanning.
    if not value.isascii():
        raise PydanticCustomError("latin", "Use English letters, as on your bank account.")
    return value


BankName = Annotated[str, StringConstraints(strip_whitespace=True, max_length=50)]
AccountName = Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)]
AccountNumber = Annotated[str, StringConstraints(strip_whitespace=True, max_length=50)]
# KHQR limits (NBC KHQR SDK v2.9): account ID 32, merchant name 25.
BakongAccountId = Annotated[
    str,
    StringConstraints(strip_whitespace=True, max_length=32),
    AfterValidator(_bakong_account_id),
]
KhqrAccount = Annotated[str, StringConstraints(strip_whitespace=True, max_length=32)]
KhqrName = Annotated[
    str, StringConstraints(strip_whitespace=True, max_length=25), AfterValidator(_latin)
]
Reference = Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)]


class CodSettings(BaseModel):
    enabled: bool = True  # needs no details, so a new shop can take orders at once


class BankTransferSettings(BaseModel):
    """No longer offered (founder's test list #19, 2026-10-24: KHQR does
    the same, with nothing to type wrong): never on, whatever is sent. The
    details stay, for bank-transfer orders placed before, whose customer
    still sees where to pay (payment.shop_payment_out)."""

    enabled: bool = False
    bank_name: BankName = ""  # e.g. "ABA"
    account_name: AccountName = ""
    account_number: AccountNumber = ""


class KhqrSettings(BaseModel):
    """The customer gets a KHQR code for the exact amount (section 10.3)."""

    enabled: bool = False
    # e.g. "dara@aclb", in the seller's bank app (Bakong / KHQR section).
    bakong_account_id: BakongAccountId = ""
    # What the customer's bank app shows as who they are paying.
    merchant_name: KhqrName = ""
    # For banks whose customers share the bank's Bakong ID (ABA's
    # abaakhppxxx@abaa): the seller's account number and the bank's name.
    # Read from the QR the seller uploads from their bank app (2026-10-14).
    account_information: KhqrAccount = ""
    acquiring_bank: KhqrAccount = ""


class PaymentSettings(BaseModel):
    """Which ways to pay a shop takes. Missing parts mean the defaults, so
    a store saved before payments existed reads as cash on delivery only."""

    cod: CodSettings = CodSettings()
    bank_transfer: BankTransferSettings = BankTransferSettings()
    khqr: KhqrSettings = KhqrSettings()

    def enabled_methods(self) -> list[PaymentMethod]:
        on = {
            PaymentMethod.COD: self.cod.enabled,
            PaymentMethod.BANK_TRANSFER: False,  # no longer offered (test list #19)
            PaymentMethod.KHQR: self.khqr.enabled,
        }
        return [method for method in PaymentMethod if on[method]]


class PaymentOut(BaseModel):
    """An order's payment, for the seller."""

    model_config = ConfigDict(from_attributes=True)

    method: PaymentMethod
    status: PaymentStatus
    amount: Decimal
    reference: str | None
    paid_at: datetime | None
    # What the seller can record now (02 section 7.2), so the app doesn't
    # keep its own copy of the rules.
    next_statuses: list[PaymentStatus] = []
    # When the customer last tapped "I've paid" (founder's pick 6B), if
    # ever; the seller still checks and records it.
    claimed_at: datetime | None = None


class PaymentUpdate(BaseModel):
    status: PaymentStatus
    # e.g. "ABA, 14:05, last digits 123", to find the transfer again later.
    reference: Reference | None = None


class ShopBankAccount(BaseModel):
    bank_name: str
    account_name: str
    account_number: str


class ShopKhqr(BaseModel):
    code: str  # the KHQR payload; the app draws it as a QR code
    merchant_name: str  # who the customer's bank app says they're paying


class ShopPaymentOut(BaseModel):
    """An order's payment, for the customer who placed it."""

    model_config = ConfigDict(from_attributes=True)

    method: PaymentMethod
    status: PaymentStatus
    amount: Decimal
    # How to pay, for the chosen method. Only while there is something to
    # pay: the payment is pending and the order hasn't been rejected or
    # cancelled. Null too if the seller has since turned this way to pay off.
    bank_account: ShopBankAccount | None = None
    khqr: ShopKhqr | None = None  # also null for riel amounts with cents
    # When they last tapped "I've paid", if ever.
    claimed_at: datetime | None = None
