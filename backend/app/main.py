"""
FastAPI main application for AIGM backend
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import os
import sys

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.api.api_v1.api import api_router
from app.core.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan events
    """
    # Startup
    logger.info("🚀 Starting AIGM Backend API")
    logger.info(f"📊 Database: {settings.DATABASE_URL}")
    logger.info(f"🔑 Ably configured: {bool(settings.ABLY_API_KEY)}")
    logger.info(f"🌍 Environment: {getattr(settings, 'ENVIRONMENT', 'development')}")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down AIGM Backend API")

# Create FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AIGM Backend API for chat application with AI agent integration",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add API routes
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    """
    Root endpoint with basic API information
    """
    return {
        "message": "AIGM Backend API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running",
        "environment": getattr(settings, 'ENVIRONMENT', 'development')
    }

@app.get("/health")
async def health_check():
    """
    Simple health check endpoint
    """
    return {
        "status": "healthy",
        "message": "AIGM Backend API is running"
    }

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Global exception handler
    """
    logger.error(f"Global exception on {request.url}: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "path": str(request.url)
        }
    )

if __name__ == "__main__":
    import uvicorn
    
    # Run the application
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )