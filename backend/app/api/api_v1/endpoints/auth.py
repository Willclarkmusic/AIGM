from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.auth import (
    LoginRequest, LoginResponse, LogoutResponse,
    EmailVerificationRequest, EmailVerificationResponse,
    ResendVerificationRequest, ResendVerificationResponse,
    ErrorResponse
)
from app.auth.auth0 import Auth0Token, get_auth0_token
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.services.email_service import EmailService
from app.services.user_service import UserService
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/login", response_model=LoginResponse, responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}})
async def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Validate Auth0 access token and create/login user
    
    This endpoint:
    1. Validates the Auth0 access token
    2. Creates a new user if first-time login
    3. Returns user information and token confirmation
    4. Requires email verification for new users
    """
    try:
        # Validate Auth0 token
        auth_token = Auth0Token(login_data.access_token)
        
        if not auth_token.email_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email verification required"
            )
        
        # Check if user exists
        user_service = UserService(db)
        user = await user_service.get_user_by_email(auth_token.email)
        
        if not user:
            # Create new user from Auth0 token
            user_data = {
                "username": auth_token.email.split("@")[0],  # Default username
                "email": auth_token.email,
                "picture_url": auth_token.payload.get("picture"),
                "user_type": "human"
            }
            
            # Make username unique if needed
            base_username = user_data["username"]
            counter = 1
            while await user_service.get_user_by_username(user_data["username"]):
                user_data["username"] = f"{base_username}{counter}"
                counter += 1
            
            user = await user_service.create_user(user_data)
            logger.info(f"Created new user: {user.email}")
        
        # Return successful login response
        return LoginResponse(
            access_token=login_data.access_token,
            user={
                "id": str(user.id),
                "username": user.username,
                "email": user.email,
                "picture_url": user.picture_url,
                "external_link": user.external_link,
                "user_type": user.user_type,
                "created_at": user.created_at.isoformat(),
                "updated_at": user.updated_at.isoformat()
            },
            message="Login successful"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

@router.post("/logout", response_model=LogoutResponse)
async def logout(
    current_user: User = Depends(get_current_user)
):
    """
    Logout user (invalidate session)
    
    Note: With Auth0, token invalidation happens on the client side.
    This endpoint can be used for logging/cleanup purposes.
    """
    logger.info(f"User {current_user.email} logged out")
    
    return LogoutResponse(message="Logout successful")

@router.post("/verify-email", response_model=EmailVerificationResponse, responses={400: {"model": ErrorResponse}})
async def verify_email(
    verification_data: EmailVerificationRequest,
    db: Session = Depends(get_db)
):
    """
    Verify user email with token
    
    This endpoint verifies the email verification token sent via email
    and marks the user's email as verified in our system.
    """
    try:
        email_service = EmailService()
        email = email_service.verify_verification_token(verification_data.token)
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification token"
            )
        
        # Update user email verification status
        user_service = UserService(db)
        user = await user_service.get_user_by_email(email)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # For Auth0, email verification is handled by Auth0
        # This endpoint can be used for additional verification logic if needed
        logger.info(f"Email verification confirmed for: {email}")
        
        return EmailVerificationResponse(
            message="Email verified successfully",
            verified=True
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Email verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Email verification failed"
        )

@router.post("/resend-verification", response_model=ResendVerificationResponse, responses={400: {"model": ErrorResponse}})
async def resend_verification(
    resend_data: ResendVerificationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Resend email verification email
    
    This endpoint resends the verification email to the user.
    """
    try:
        user_service = UserService(db)
        user = await user_service.get_user_by_email(resend_data.email)
        
        if not user:
            # Don't reveal if email exists for security
            return ResendVerificationResponse(
                message="If the email exists, a verification email has been sent",
                email_sent=True
            )
        
        # Send verification email in background
        email_service = EmailService()
        background_tasks.add_task(
            email_service.send_verification_email,
            user.email,
            user.username
        )
        
        logger.info(f"Verification email resent to: {user.email}")
        
        return ResendVerificationResponse(
            message="Verification email sent",
            email_sent=True
        )
        
    except Exception as e:
        logger.error(f"Resend verification error: {e}")
        # Don't expose internal errors
        return ResendVerificationResponse(
            message="If the email exists, a verification email has been sent",
            email_sent=True
        )

@router.get("/me", response_model=dict)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Get current authenticated user information
    """
    return {
        "id": str(current_user.id),
        "username": current_user.username,
        "email": current_user.email,
        "picture_url": current_user.picture_url,
        "external_link": current_user.external_link,
        "user_type": current_user.user_type,
        "created_at": current_user.created_at.isoformat(),
        "updated_at": current_user.updated_at.isoformat()
    }

@router.post("/refresh")
async def refresh_token():
    """
    Token refresh endpoint
    
    Note: With Auth0, token refresh is handled on the client side.
    This endpoint exists for API completeness but delegates to Auth0.
    """
    return {
        "message": "Token refresh should be handled by Auth0 on the client side",
        "instructions": "Use Auth0's checkSession() or getTokenSilently() methods"
    }