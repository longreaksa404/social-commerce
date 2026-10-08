"""Cambodia's calendar. Phnom Penh is UTC+7 all year (no daylight saving),
so a fixed offset is exact and needs no time zone database."""

from datetime import date, datetime, timedelta, timezone

PHNOM_PENH = timezone(timedelta(hours=7), "Asia/Phnom_Penh")


def today() -> date:
    """Today's date in Phnom Penh: what "today" means to sellers and customers."""
    return datetime.now(PHNOM_PENH).date()
