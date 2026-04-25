"""SweetSpot scoring engine — pure business logic, no I/O."""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

_FIXED_TAG = "#fixed"
_VARIABLE_TAG = "#variable"


@dataclass(slots=True)
class SpendingSummary:
    balance: Decimal
    fixed_monthly: Decimal
    variable_monthly: Decimal
    disposable: Decimal
    transaction_count: int
    days_analyzed: int


@dataclass(slots=True)
class SweetSpotResult:
    sweetspot: bool         # True only when score >= 60 and gate passes
    score: int              # 0–100
    tier: str               # "Sweet Spot" | "Affordable" | "Not Yet"
    reasoning: str          # human-readable explanation
    item_price: Decimal
    disposable: Decimal
    deficit: Decimal        # > 0 only when gate fails
    score_breakdown: dict[str, int]
    summary: SpendingSummary


def build_spending_summary(balance: Decimal, transactions: list[dict]) -> SpendingSummary:
    """
    Parse BUNQ payment history into monthly fixed + variable cost estimates.

    Fixed costs: grouped by description and averaged — each unique recurring
    expense contributes its average amount regardless of how many months of
    history exist. This handles seed data where all transactions share the
    same timestamp.

    Variable costs: summed and divided by the number of months in the
    transaction history (minimum 1).
    """
    from datetime import datetime

    # description (without tag) -> list of amounts seen
    fixed_by_desc: dict[str, list[Decimal]] = {}
    variable_total = Decimal(0)
    timestamps: list[datetime] = []

    for tx in transactions:
        raw = tx.get("amount", {}).get("value", "0")
        amount = abs(Decimal(str(raw)))
        description = tx.get("description", "")

        created_str = tx.get("created", "")
        if created_str:
            try:
                ts = datetime.fromisoformat(created_str.replace(" ", "T").split(".")[0])
                timestamps.append(ts)
            except ValueError:
                pass

        if _FIXED_TAG in description:
            key = description.replace(_FIXED_TAG, "").strip().lower()
            fixed_by_desc.setdefault(key, []).append(amount)
        elif _VARIABLE_TAG in description:
            variable_total += amount

    days_span = max(1, (max(timestamps) - min(timestamps)).days) if len(timestamps) >= 2 else 30
    months = max(1.0, days_span / 30.44)

    # Average per unique fixed cost — correct even when the same expense repeats across months
    fixed_monthly = sum(
        sum(amounts) / len(amounts) for amounts in fixed_by_desc.values()
    ).quantize(Decimal("0.01"))

    variable_monthly = (variable_total / Decimal(str(months))).quantize(Decimal("0.01"))

    return SpendingSummary(
        balance=balance,
        fixed_monthly=fixed_monthly,
        variable_monthly=variable_monthly,
        disposable=balance - fixed_monthly - variable_monthly,
        transaction_count=len(transactions),
        days_analyzed=days_span,
    )


def score(
    summary: SpendingSummary,
    merchant_prices: list[Decimal],
    *,
    has_promotion: bool = False,
) -> SweetSpotResult:
    """
    Score a potential purchase.

    merchant_prices: prices for the same item across merchants (from SerpApi).
    item_price is the cheapest — the best deal available right now.

    Components:
      price_position (50%) — how cheap item_price is relative to the spread
      headroom       (30%) — disposable income remaining after purchase vs item price
      promotion      (20%) — whether a promotional price was detected
    """
    if not merchant_prices:
        raise ValueError("merchant_prices must not be empty")

    item_price = min(merchant_prices)
    disposable = summary.disposable

    # Gate — not affordable at all
    if disposable < item_price:
        deficit = (item_price - disposable).quantize(Decimal("0.01"))
        return SweetSpotResult(
            sweetspot=False,
            score=0,
            tier="Not Yet",
            reasoning=f"Your disposable budget is €{disposable:.2f} but the item costs €{item_price:.2f}. Save €{deficit:.2f} more.",
            item_price=item_price,
            disposable=disposable,
            deficit=deficit,
            score_breakdown={"price_position": 0, "headroom": 0, "promotion": 0},
            summary=summary,
        )

    # Price position — how good is cheapest vs the spread?
    min_price = min(merchant_prices)
    max_price = max(merchant_prices)
    pp = int(((max_price - item_price) / (max_price - min_price)) * 100) if max_price > min_price else 50

    # Headroom — how comfortably can the user absorb this?
    hr = min(100, max(0, int(float((disposable - item_price) / item_price) / 3 * 100)))

    # Promotion bonus
    promo = 100 if has_promotion else 0

    total_score = int(pp * 0.50 + hr * 0.30 + promo * 0.20)

    if total_score >= 60:
        tier = "Sweet Spot"
        is_sweetspot = True
        reasoning = _reasoning_sweet(item_price, disposable, pp, hr, len(merchant_prices))
    else:
        tier = "Affordable"
        is_sweetspot = False
        reasoning = _reasoning_affordable(item_price, disposable, pp, hr)

    return SweetSpotResult(
        sweetspot=is_sweetspot,
        score=total_score,
        tier=tier,
        reasoning=reasoning,
        item_price=item_price,
        disposable=disposable,
        deficit=Decimal(0),
        score_breakdown={"price_position": pp, "headroom": hr, "promotion": promo},
        summary=summary,
    )


def _reasoning_sweet(item_price: Decimal, disposable: Decimal, pp: int, hr: int, num_merchants: int) -> str:
    parts = []
    if pp >= 70:
        parts.append(f"€{item_price:.2f} is one of the cheapest options across {num_merchants} merchants")
    else:
        parts.append(f"reasonably priced at €{item_price:.2f}")
    if hr >= 70:
        parts.append(f"you have comfortable headroom with €{disposable:.2f} disposable")
    else:
        parts.append(f"budget is sufficient (€{disposable:.2f} disposable)")
    return "Sweet Spot — " + " and ".join(parts) + "."


def _reasoning_affordable(item_price: Decimal, disposable: Decimal, pp: int, hr: int) -> str:
    parts = []
    if pp < 50:
        parts.append(f"cheaper options may exist (€{item_price:.2f} is not the lowest on the market)")
    if hr < 40:
        parts.append(f"it would stretch your budget (€{disposable:.2f} disposable left)")
    if not parts:
        parts.append(f"within budget at €{item_price:.2f} but score didn't reach Sweet Spot threshold")
    return "Affordable — " + "; ".join(parts) + "."
