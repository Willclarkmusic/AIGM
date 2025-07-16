from pydantic import BaseModel, EmailStr, validator
from typing import Optional, Dict, Any
from datetime import datetime

class LoginRequest(BaseModel):
    """Request body for Auth0 login validation"""
    access_token: str
    
    @validator('access_token')
    def validate_access_token(cls, v):
        if not v or not v.strip():
            raise ValueError('Access token is required')
        return v.strip()

class LoginResponse(BaseModel):
    """Response for successful login"""
    access_token: str
    user: Dict[str, Any]
    message: str = "Login successful"

class LogoutResponse(BaseModel):
    """Response for logout"""
    message: str = "Logout successful"

class EmailVerificationRequest(BaseModel):
    """Request body for email verification"""
    token: str
    
    @validator('token')
    def validate_token(cls, v):
        if not v or not v.strip():
            raise ValueError('Verification token is required')
        return v.strip()

class EmailVerificationResponse(BaseModel):
    """Response for email verification"""
    message: str
    verified: bool

class ResendVerificationRequest(BaseModel):
    """Request body for resending verification email"""
    email: EmailStr

class ResendVerificationResponse(BaseModel):
    """Response for resending verification email"""
    message: str
    email_sent: bool

class TokenPayload(BaseModel):
    """JWT token payload structure"""
    sub: str  # Auth0 user ID
    email: str
    email_verified: bool
    name: Optional[str] = None
    picture: Optional[str] = None
    iat: int
    exp: int
    aud: str
    iss: str

class UserInfo(BaseModel):
    """User information from Auth0"""
    id: str
    username: str
    email: str
    email_verified: bool
    picture_url: Optional[str] = None
    external_link: Optional[str] = None
    user_type: str = "human"
    created_at: datetime
    updated_at: datetime

class ErrorResponse(BaseModel):
    """Standard error response"""
    detail: str
    code: Optional[str] = None