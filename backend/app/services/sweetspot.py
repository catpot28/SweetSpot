"""SweetSpot scoring engine — pure business logic, no I/O."""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

_FIXED_TAG = "#fixed"
_VARIABLE_TAG = "#variable"


@dataclass(slots=True)
class TransactionSummary:
    balance: Decimal
    fixed_monthly: Decimal
    variable_monthly: Decimal
    disposable: Decimal
    transaction_count: int
    days_analyzed: int


@dataclass(slots=True)
class SweetSpotResult:
    tier: str           # "Sweet Spot" | "Affordable" | "Not Yet"
    emoji: str
    score: int          # 0–100; 0 when gate fails
    message: str
    item_price: Decimal
    disposable: Decimal
    deficit: Decimal    # > 0 only when tier == "Not Yet"
    has_promotion: bool
    score_breakdown: dict[str, int]
    summary: TransactionSummary


def build_transaction_summary(
    balance: Decimal,
    transactions: list[dict],
) -> TransactionSummary:
    """
    Derive monthly fixed + variable costs from BUNQ payment history.

    Uses the date span of the transactions to normalise totals to a monthly rate.
    Each transaction dict must have: amount.value (str), description (str), created (str).
    """
    from datetime import datetime

    fixed_total = Decimal(0)
    variable_total = Decimal(0)
    timestamps: list[datetime] = []

    for tx in transactions:
        raw_value = tx.get("amount", {}).get("value", "0")
        amount = abs(Decimal(str(raw_value)))
        description = tx.get("description", "")

        created_str = tx.get("created", "")
        if created_str:
            try:
                # BUNQ format: "2024-01-15 12:34:56.000000"
                ts = datetime.fromisoformat(created_str.replace(" ", "T").split(".")[0])
                timestamps.append(ts)
            except ValueError:
                pass

        if _FIXED_TAG in description:
            fixed_total += amount
        elif _VARIABLE_TAG in description:
            variable_total += amount

    if len(timestamps) >= 2:
        days_span = max(1, (max(timestamps) - min(timestamps)).days)
    else:
        days_span = 30

    months = max(1.0, days_span / 30.44)
    fixed_monthly = (fixed_total / Decimal(str(months))).quantize(Decimal("0.01"))
    variable_monthly = (variable_total / Decimal(str(months))).quantize(Decimal("0.01"))
    disposable = balance - fixed_monthly - variable_monthly

    return TransactionSummary(
        balance=balance,
        fixed_monthly=fixed_monthly,
        variable_monthly=variable_monthly,
        disposable=disposable,
        transaction_count=len(transactions),
        days_analyzed=days_span,
    )


def analyze(
    summary: TransactionSummary,
    merchant_prices: list[Decimal],
    *,
    has_promotion: bool = False,
) -> SweetSpotResult:
    """
    Score a potential purchase given the user's financial position and market prices.

    merchant_prices: list of prices for the same/similar item across merchants (from SerpApi).
    item_price is the cheapest option (best deal the user can get right now).

    Score components:
      price_position (50%) — how cheap item_price is vs the spread of merchant prices
      headroom       (30%) — how much disposable income remains after the purchase
      promotion      (20%) — whether any promotional pricing was detected
    """
    if not merchant_prices:
        raise ValueError("merchant_prices must not be empty")

    item_price = min(merchant_prices)
    disposable = summary.disposable

    # Gate — can the user actually afford this right now?
    if disposable < item_price:
        deficit = (item_price - disposable).quantize(Decimal("0.01"))
        return SweetSpotResult(
            tier="Not Yet",
            emoji="⏳",
            score=0,
            message=f"Save €{deficit:.2f} more to afford this",
            item_price=item_price,
            disposable=disposable,
            deficit=deficit,
            has_promotion=has_promotion,
            score_breakdown={"price_position": 0, "headroom": 0, "promotion": 0},
            summary=summary,
        )

    # Price position: how good is the cheapest price vs others?
    min_price = min(merchant_prices)
    max_price = max(merchant_prices)
    if max_price > min_price:
        pp = int(((max_price - item_price) / (max_price - min_price)) * 100)
    else:
        pp = 50  # single price point — neutral

    # Headroom: how comfortably can the user absorb this purchase?
    # Caps at 3× the item price for full score.
    hr = min(100, max(0, int(float((disposable - item_price) / item_price) / 3 * 100)))

    # Promotion bonus
    promo = 100 if has_promotion else 0

    score = int(pp * 0.50 + hr * 0.30 + promo * 0.20)

    if score >= 60:
        tier, emoji = "Sweet Spot", "🎯"
        message = "Great price and comfortable budget"
    else:
        tier, emoji = "Affordable", "👍"
        message = "Within budget, but not the best deal right now"

    return SweetSpotResult(
        tier=tier,
        emoji=emoji,
        score=score,
        message=message,
        item_price=item_price,
        disposable=disposable,
        deficit=Decimal(0),
        has_promotion=has_promotion,
        score_breakdown={"price_position": pp, "headroom": hr, "promotion": promo},
        summary=summary,
    )
