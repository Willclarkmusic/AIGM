from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List
from app.db.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.services.user_service import UserService

router = APIRouter()

class UserUpdateRequest(BaseModel):
    """Request body for updating user information"""
    username: Optional[str] = None
    picture_url: Optional[str] = None
    external_link: Optional[str] = None
    
    @validator('username')
    def validate_username(cls, v):
        if v is not None:
            if len(v) < 3 or len(v) > 50:
                raise ValueError('Username must be between 3 and 50 characters')
            if not v.replace('_', '').replace('-', '').isalnum():
                raise ValueError('Username can only contain letters, numbers, hyphens, and underscores')
        return v
    
    @validator('picture_url')
    def validate_picture_url(cls, v):
        if v is not None and v.strip():
            if not v.startswith(('http://', 'https://')):
                raise ValueError('Picture URL must be a valid URL')
        return v
    
    @validator('external_link')
    def validate_external_link(cls, v):
        if v is not None and v.strip():
            if not v.startswith(('http://', 'https://')):
                raise ValueError('External link must be a valid URL')
        return v

class UserResponse(BaseModel):
    """Full user information response (for current user)"""
    id: str
    username: str
    email: str
    email_verified: Optional[bool] = None
    picture_url: Optional[str]
    external_link: Optional[str]
    user_type: str
    created_at: str
    updated_at: str

class PublicUserResponse(BaseModel):
    """Public user information response (for other users)"""
    id: str
    username: str
    picture_url: Optional[str]
    external_link: Optional[str]
    user_type: str
    created_at: str

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current authenticated user information with full details including email verification status"""
    return UserResponse(
        id=str(current_user.id),
        username=current_user.username,
        email=current_user.email,
        email_verified=True,  # If user got here, email is verified (Auth0 requirement)
        picture_url=current_user.picture_url,
        external_link=current_user.external_link,
        user_type=current_user.user_type,
        created_at=current_user.created_at.isoformat(),
        updated_at=current_user.updated_at.isoformat()
    )

@router.patch("/me", response_model=UserResponse)
async def update_current_user(
    update_data: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user information"""
    try:
        user_service = UserService(db)
        
        # Prepare update data
        update_dict = {}
        if update_data.username is not None:
            # Check if username is available
            existing_user = await user_service.get_user_by_username(update_data.username)
            if existing_user and existing_user.id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already taken"
                )
            update_dict["username"] = update_data.username
        
        if update_data.external_link is not None:
            update_dict["external_link"] = update_data.external_link
        
        if update_data.picture_url is not None:
            update_dict["picture_url"] = update_data.picture_url
        
        if not update_dict:
            # No updates provided, return current user
            return UserResponse(
                id=str(current_user.id),
                username=current_user.username,
                email=current_user.email,
                email_verified=True,
                picture_url=current_user.picture_url,
                external_link=current_user.external_link,
                user_type=current_user.user_type,
                created_at=current_user.created_at.isoformat(),
                updated_at=current_user.updated_at.isoformat()
            )
        
        # Update user
        updated_user = await user_service.update_user(current_user.id, update_dict)
        
        return UserResponse(
            id=str(updated_user.id),
            username=updated_user.username,
            email=updated_user.email,
            email_verified=True,
            picture_url=updated_user.picture_url,
            external_link=updated_user.external_link,
            user_type=updated_user.user_type,
            created_at=updated_user.created_at.isoformat(),
            updated_at=updated_user.updated_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user"
        )

@router.get("/{user_id}", response_model=PublicUserResponse)
async def get_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user by ID - returns only basic public information"""
    try:
        user_service = UserService(db)
        user = await user_service.get_user_by_id(user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Return only public information (no email or sensitive data)
        return PublicUserResponse(
            id=str(user.id),
            username=user.username,
            picture_url=user.picture_url,
            external_link=user.external_link,
            user_type=user.user_type,
            created_at=user.created_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user"
        )

@router.get("/search", response_model=List[PublicUserResponse])
async def search_users(
    q: str = Query(..., min_length=1, max_length=100, description="Search query (exact username or email match)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search users by exact username or email match
    
    This endpoint only returns exact matches for security/privacy reasons.
    Partial matching would allow enumeration of users.
    Returns only public user information.
    """
    try:
        user_service = UserService(db)
        
        # Try exact username match first
        user_by_username = await user_service.get_user_by_username(q)
        if user_by_username:
            return [PublicUserResponse(
                id=str(user_by_username.id),
                username=user_by_username.username,
                picture_url=user_by_username.picture_url,
                external_link=user_by_username.external_link,
                user_type=user_by_username.user_type,
                created_at=user_by_username.created_at.isoformat()
            )]
        
        # Try exact email match if query contains @
        if "@" in q:
            user_by_email = await user_service.get_user_by_email(q)
            if user_by_email:
                return [PublicUserResponse(
                    id=str(user_by_email.id),
                    username=user_by_email.username,
                    picture_url=user_by_email.picture_url,
                    external_link=user_by_email.external_link,
                    user_type=user_by_email.user_type,
                    created_at=user_by_email.created_at.isoformat()
                )]
        
        # No exact matches found
        return []
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Search failed"
        )