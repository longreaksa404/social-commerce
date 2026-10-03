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


def phone_search_terms(raw: str) -> list[str]:
    """What to look for inside stored phones when the seller searches with
    part of one, typed any way ("012 345", "+855 12 345", "12-345-678").
    Empty if it isn't a number. A leading 855 is tried both as the country
    code (+855 12 → 012) and as digits from the middle of a number."""
    compact = _SEPARATORS.sub("", raw)
    if not re.fullmatch(r"\+?\d+", compact):
        return []
    digits = compact.removeprefix("+")
    terms = [digits]
    for prefix in ("00855", "855"):
        if digits.startswith(prefix) and len(digits) > len(prefix):
            terms.append("0" + digits[len(prefix) :].lstrip("0"))
            break
    return terms
