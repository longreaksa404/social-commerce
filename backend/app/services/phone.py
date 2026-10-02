"""Phone numbers as customers type them: "012 345 678", "+855 12 345 678",
"(012) 345-678". Stored in one form, so a customer's next order finds the
same customer record and the tracking page accepts any spelling."""

import re

_SEPARATORS = re.compile(r"[\s\-().]")
_CAMBODIAN = re.compile(r"0[1-9]\d{7,8}")  # 0 + 8 or 9 digits
_INTERNATIONAL = re.compile(r"\+[1-9]\d{7,14}")


def normalize_phone(raw: str) -> str:
    """Cambodian numbers as 0XXXXXXXX(X), others as +<digits>.

    Raises ValueError if it isn't a phone number.
    """
    phone = _SEPARATORS.sub("", raw)
    if phone.startswith("00"):
        phone = "+" + phone[2:]
    for prefix in ("+855", "855"):
        if phone.startswith(prefix):
            # "+855 012..." (keeping the local 0) is a common way to write it.
            phone = "0" + phone[len(prefix) :].lstrip("0")
            break
    if _CAMBODIAN.fullmatch(phone) or _INTERNATIONAL.fullmatch(phone):
        return phone
    raise ValueError("Enter a valid phone number.")
