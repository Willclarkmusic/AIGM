"""
Mock authentication system for testing without Auth0
"""
from fastapi import HTTPException, Header, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.user import User
from typing import Optional
import logging

logger = logging.getLogger(__name__)

async def get_current_user_mock(
    x_user_id: Optional[str] = Header(None, alias="X-User-ID"),
    db: Session = Depends(get_db)
) -> User:
    """
    Mock authentication - expects X-User-ID header
    
    For testing purposes only. In production, this will be replaced
    with proper Auth0 JWT token validation.
    
    Usage:
    - Send X-User-ID header with requests
    - User ID should be a valid UUID from the users table
    """
    if not x_user_id:
        raise HTTPException(
            status_code=401,
            detail="Missing X-User-ID header. For testing, include X-User-ID header with a valid user ID."
        )
    
    try:
        # Query user by ID
        user = db.query(User).filter(User.id == x_user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=404,
                detail=f"User not found with ID: {x_user_id}. Make sure the user exists in the database."
            )
        
        logger.info(f"Mock auth successful for user: {user.username} ({user.id})")
        return user
        
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid user ID format. X-User-ID must be a valid UUID."
        )
    except Exception as e:
        logger.error(f"Mock auth error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Authentication error"
        )

class MockAuth:
    """
    Mock authentication class for testing
    """
    
    @staticmethod
    def create_test_headers(user_id: str) -> dict:
        """
        Create headers for testing API endpoints
        
        Args:
            user_id: The UUID of the user to authenticate as
            
        Returns:
            Dict with headers for API requests
        """
        return {
            "X-User-ID": user_id,
            "Content-Type": "application/json"
        }
    
    @staticmethod
    def get_test_user_id_alice() -> str:
        """Get the test user ID for Alice (will be created in seed data)"""
        return "550e8400-e29b-41d4-a716-446655440001"
    
    @staticmethod
    def get_test_user_id_bob() -> str:
        """Get the test user ID for Bob (will be created in seed data)"""
        return "550e8400-e29b-41d4-a716-446655440002"

# Alias for backward compatibility
get_current_user = get_current_user_mock