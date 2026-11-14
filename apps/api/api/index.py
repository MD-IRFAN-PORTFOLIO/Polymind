import os
import sys
from pathlib import Path

# Ensure app package is in Python path for Vercel Serverless
current_dir = Path(__file__).resolve().parent.parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

from app.main import app

# Export app for Vercel ASGI runtime
__all__ = ["app"]
