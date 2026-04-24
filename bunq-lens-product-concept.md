# Project Overview
- **Name:** BUNQ Lens
- **One-liner:** Scan products, track wishes, buy when finances align
- **Core problem:** People want things but don't know if they can afford them or when timing is right
- **Target users:** BUNQ users who shop online and want smarter spending decisions

# Product Vision
- **Why this exists:** Shopping apps show products. Banking apps show money. Nothing connects the two. BUNQ Lens closes that gap — it watches what you want AND what you can afford, then tells you when both align.
- **Long-term goal:** Turn wishlist into intelligent purchase planner that considers your real financial picture, not just balance

# System Architecture

## Three-Layer Model

### Layer 1: Lens (Product Capture)
**What it does:**
- User points camera at product or uploads screenshot
- Visual recognition identifies the item (brand, type, features)
- System searches web and marketplaces for matches
- Returns three tiers: budget version, exact match, premium alternative
- Checks BUNQ balance immediately — shows if affordable right now

**User interaction:**
- Tap camera button
- Point at shoe/jacket/gadget
- Get instant results with prices
- See green/yellow/red affordability indicator

### Layer 2: Smart Wishlist (Background Intelligence)
**What it does:**
- Stores items user wants to buy
- Monitors BUNQ spending patterns continuously
- Tracks item prices over time
- Calculates "sweet spot" when two conditions meet:
  - Financial trigger: user has comfortable buffer to buy
  - Market trigger: price dropped or went on sale
- Sends notification when sweet spot detected

**User interaction:**
- Items auto-save from Lens scan
- User opens app, sees wishlist with live status badges
- Green badge = "affordable now"
- Orange badge = "price dropped"
- Gold badge = "both — buy now!"

### Layer 3: BUNQ AI Agent (Financial Intelligence)
**What it does:**
- Reads real BUNQ sandbox account data (balance, transactions, spending)
- Calculates disposable buffer (not just raw balance — actual safe-to-spend amount)
- Uses AI to assess if purchase timing is smart
- Executes payment if user confirms

**User interaction:**
- User taps "Can I afford this?"
- Agent pulls last 60 days of spending
- Shows reasoning: "Your buffer is €340. After this €89 purchase you keep 74% buffer. Safe."
- User taps "Buy it" → payment initiated through BUNQ

# How Layers Connect

```
LENS → captures product
   ↓
   saves to WISHLIST with price anchor
   ↓
WISHLIST → monitors in background
   ↓
   triggers when timing is good
   ↓
AGENT → fetches BUNQ financial snapshot
   ↓
   confirms affordability
   ↓
   executes payment
```

**Key connection points:**
1. **Lens → Wishlist:** Every scanned item becomes wishlist entry with stored price
2. **Wishlist → Agent:** Trigger evaluation requests fresh BUNQ data on every app open
3. **Agent → BUNQ:** Direct API connection for balance, payments, execution

# BUNQ Integration

**Why BUNQ is central:**
- BUNQ sandbox provides real banking data (balance, transaction history)
- Agent uses payment patterns to calculate safe spending buffer
- Final purchase flows through BUNQ payment API
- Without BUNQ, this is just another price tracker
- With BUNQ, it's financial decision support

**What BUNQ APIs provide:**
- `/monetary-account` → current balance
- `/payment` → spending history for pattern analysis
- `/payment` POST → execute purchase

**Sandbox vs Production:**
- Hackathon: BUNQ sandbox (fake money, real API behavior)
- Production: Real BUNQ accounts with OAuth consent flow

# Core Features

| Feature | Description | Status |
|---------|-------------|--------|
| Visual scan | Camera or screenshot → product identification | Core |
| Three-tier search | Budget/exact/premium matches from marketplaces | Core |
| Smart wishlist | Persistent storage of wanted items with prices | Core |
| Financial snapshot | Real-time BUNQ balance + spending analysis | Core |
| Sweet spot trigger | Notify when affordable AND price drops | Core |
| Affordability check | AI reasoning about purchase timing | Core |
| One-tap purchase | Initiate BUNQ payment from app | Stretch |
| Price tracking | Monitor stored items for drops | Stretch |
| Purchase planner | "Save €X/week to buy in Y weeks" | Future |

# Tech Stack

- **Frontend:** Mobile-first web app (React PWA), camera via getUserMedia, responsive UI
- **Backend:** FastAPI (Python), async HTTP clients, BUNQ REST API wrapper, Google Vision / AWS Rekognition
- **Data:** SQLite (wishlist persistence), BUNQ sandbox (financial source of truth)

# User Journey

1. **Discover:** User sees jacket in store, snaps photo with BUNQ Lens
2. **Explore:** App returns 3 options — €45 lookalike, €89 exact, €150 premium
3. **Decide:** User taps exact match → "Not affordable yet — save €15/week, buy in 6 weeks"
4. **Save:** Item added to wishlist, price anchored at €89
5. **Wait:** App monitors in background (user forgets about it)
6. **Trigger:** 3 weeks later — price drops to €65 AND user's buffer increased
7. **Notify:** Push: "Jacket you wanted: now €65 (was €89), and you can afford it comfortably"
8. **Act:** User opens app, taps "Buy it" → BUNQ payment initiated → done

# Why This Works

**For users:**
- No more guessing if they can afford something
- No more checking balance manually
- No more missing price drops on things they wanted
- Purchases become planned, not impulsive

**For BUNQ:**
- Differentiated feature no other bank offers
- Keeps users in BUNQ ecosystem for shopping decisions
- Demonstrates API platform value
- Encourages mindful spending (brand-aligned)

**For hackathon judges:**
- Uses BUNQ API meaningfully (not just balance display)
- Solves real problem (affordability + timing)
- Novel AI integration (vision + financial reasoning)
- Shippable in 24 hours (proven architecture)
