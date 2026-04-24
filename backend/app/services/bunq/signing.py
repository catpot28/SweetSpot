"""RSA PKCS#1 v1.5 + SHA-256 body signing for BUNQ requests."""
from __future__ import annotations

import base64

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa


def sign_body(private_key: rsa.RSAPrivateKey, body: bytes) -> str:
    sig = private_key.sign(body, padding.PKCS1v15(), hashes.SHA256())
    return base64.b64encode(sig).decode()
