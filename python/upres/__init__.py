"""upres-ai — Official Python SDK for upres.ai"""

from .client import UpresClient, UpresError, QuotaExceededError, AuthError

__version__ = "0.1.0"
__all__ = ["UpresClient", "UpresError", "QuotaExceededError", "AuthError"]
