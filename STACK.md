# BUNQ Smart Wishlist — Full Tech Stack

## Frontend
| What | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS |
| Hosting | Railway |

## Backend
| What | Technology |
|---|---|
| Framework | FastAPI (Python) |
| Deployment | Railway |

## User Input & Notifications
| What | Technology |
|---|---|
| Entry point | Telegram Bot API |
| Webhook | FastAPI endpoint |

## Image Pipeline
| What | Technology |
|---|---|
| Image hosting | ImgBB API |
| Product search | SerpApi Google Lens (country=nl, search_type=products) |

## Database
| What | Technology |
|---|---|
| Database | Supabase (PostgreSQL) |

## Financial Data
| What | Technology |
|---|---|
| Transactions + balance | BUNQ API |

## Sweet Spot Algorithm
| What | Technology |
|---|---|
| Language | Python (inside backend) |
| Logic | price_score × affordability_score |
| Price data | Daily price polling → stored in Supabase |
| Financial data | Derived from BUNQ transactions |

## AI Layer
| What | Technology |
|---|---|
| Model | Anthropic Claude API (claude-sonnet-4-20250514) |
| Purpose | Plain-language explanation of why now is a sweet spot |

## DevOps & Tooling
| What | Technology |
|---|---|
| Version control | GitHub (private repo) |
| IDE | VS Code |
| AI coding assistant | Claude Code |
