"""
API Module - Contient les routers FastAPI.
"""
from .v2_endpoints import router as v2_router

__all__ = ["v2_router"]
