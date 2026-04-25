"""Parse raw price strings from SerpApi into Decimal amounts."""
from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation


_STRIP = re.compile(r"[€$£¥₹]|[A-Z]{3}\s*", re.UNICODE)
_CLEAN = re.compile(r"[^\d,.]")


def parse_price(raw: str | None) -> Decimal | None:
    """Return the numeric amount from a price string, or None if unparseable.

    Handles: €29.99, $120, £45.00, EUR 19,99, 1.299,00 (European thousands).
    """
    if not raw:
        return None

    s = _STRIP.sub("", raw).strip()
    s = _CLEAN.sub("", s)

    if not s:
        return None

    # European format: "1.299,00" → comma is decimal, dots are thousands
    if "," in s and "." in s:
        if s.rfind(",") > s.rfind("."):
            s = s.replace(".", "").replace(",", ".")
        else:
            s = s.replace(",", "")
    elif "," in s:
        # Could be "19,99" (European decimal) or "1,299" (thousands separator)
        parts = s.split(",")
        if len(parts) == 2 and len(parts[1]) == 2:
            s = s.replace(",", ".")
        else:
            s = s.replace(",", "")

    try:
        return Decimal(s)
    except InvalidOperation:
        return None
