import re
from datetime import datetime, timezone, timedelta


def parse_time(value: str | None, default_offset_hours: int = -1) -> datetime:
    """Parse an ISO 8601 timestamp or a relative time like -1h / -30m."""
    if value is None:
        return datetime.now(timezone.utc) + timedelta(hours=default_offset_hours)

    # Relative: -1h, -30m, -2d
    match = re.fullmatch(r"-(\d+)([smhd])", value.strip())
    if match:
        amount, unit = int(match.group(1)), match.group(2)
        delta = {
            "s": timedelta(seconds=amount),
            "m": timedelta(minutes=amount),
            "h": timedelta(hours=amount),
            "d": timedelta(days=amount),
        }[unit]
        return datetime.now(timezone.utc) - delta

    return datetime.fromisoformat(value)
