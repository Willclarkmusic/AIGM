from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.services.realtime_service import realtime_service

router = APIRouter()

@router.get("/ably-token")
async def get_ably_token(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate Ably token for authenticated user"""
    token_request = realtime_service.generate_token_request(current_user)
    
    if not token_request:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate Ably token"
        )
    
    return token_request