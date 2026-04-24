# services/anthropic/

Claude API client for generating plain-language reasoning about purchase timing.

## Model

`claude-sonnet-4-20250514`, per [../../../../STACK.md](../../../../STACK.md).

## Surface

- `async explain_affordability(ctx: FinancialSnapshot, item_price: float) -> AffordabilityReasoning`

## Inputs

- Current balance
- Recent transactions (last ~60 days)
- Computed safe-to-spend buffer from `services/sweetspot`
- Item price

## Output

1–3 sentences shown in the app detail view. Example: *"Your buffer is €340. After this €89 purchase you keep 74% buffer. Safe."*

Plus a structured `verdict` field (`safe` / `risky` / `no`) so the UI can pick a badge colour without parsing text.
