import os
from typing import Optional
from fastapi import Header
import jwt

CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY", "")


async def get_current_user_id(
    authorization: Optional[str] = Header(default=None),
) -> str:
    """Extract authenticated user ID from Clerk Authorization Bearer token.

    Falls back to 'local-user' for guest mode, test suites, or when auth is unconfigured.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return "local-user"

    token = authorization.split("Bearer ", 1)[1].strip()
    if not token:
        return "local-user"

    try:
        # Decode token payload to extract Clerk user ID (sub)
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        if user_id:
            return str(user_id)
    except Exception:
        pass

    return "local-user"
