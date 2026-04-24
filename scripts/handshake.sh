#!/usr/bin/env bash
# One-shot BUNQ sandbox handshake for a single hardcoded user — prints the balance on success.
# Build step 1 per BUNQ_INTEGRATION.md: de-risk the handshake before wiring anything else in.
# IP note: device-server is IP-bound; run this from the Railway deploy target, not a laptop,
# if you need the resulting creds to survive for the deployed backend.
# TODO: implement as a Python one-off (e.g. `python -m app.services.bunq.handshake`).

set -euo pipefail
echo "handshake.sh — not yet implemented"
