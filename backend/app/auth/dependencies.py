from typing import Optional
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.user import User
from app.auth.auth0 import Auth0Token, get_auth0_token, get_optional_auth0_token

async def get_current_user(
    token: Auth0Token = Depends(get_auth0_token),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user from database"""
    # Extract user ID from Auth0 token (sub claim)
    auth0_user_id = token.user_id
    
    # Find user in database by Auth0 ID
    # Note: We'll need to add an auth0_id field to User model or use email
    user = db.query(User).filter(User.email == token.email).first()
    
    if not user:
        # Create user if they don't exist (first-time login)
        user = await create_user_from_auth0_token(token, db)
    
    return user

async def get_optional_current_user(
    token: Optional[Auth0Token] = Depends(get_optional_auth0_token),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get current user if authenticated, None otherwise"""
    if token is None:
        return None
    
    try:
        return await get_current_user(token, db)
    except HTTPException:
        return None

async def create_user_from_auth0_token(token: Auth0Token, db: Session) -> User:
    """Create a new user from Auth0 token data"""
    from app.services.user_service import UserService
    
    # Extract user info from Auth0 token
    email = token.email
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not found in token"
        )
    
    if not token.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not verified"
        )
    
    # Generate username from email (can be changed later)
    username = email.split("@")[0]
    
    # Check if username already exists and make it unique if needed
    existing_user = db.query(User).filter(User.username == username).first()
    if existing_user:
        counter = 1
        base_username = username
        while existing_user:
            username = f"{base_username}{counter}"
            existing_user = db.query(User).filter(User.username == username).first()
            counter += 1
    
    # Create user
    user_service = UserService(db)
    user_data = {
        "username": username,
        "email": email,
        "picture_url": token.payload.get("picture"),  # Auth0 profile picture
    }
    
    try:
        user = await user_service.create_user(user_data)
        return user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )

def require_user_type(user_type: str):
    """Dependency factory to require specific user type"""
    async def user_type_checker(user: User = Depends(get_current_user)) -> User:
        if user.user_type != user_type:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User type '{user_type}' required"
            )
        return user
    return user_type_checker

def require_server_permission(server_id: str, required_role: str = "member"):
    """Dependency factory to require server permission"""
    async def server_permission_checker(
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ) -> User:
        from app.models.server import UserServer
        from app.services.server_service import ServerService
        
        # Check if user has required role in server
        server_service = ServerService(db)
        user_server = db.query(UserServer).filter(
            UserServer.user_id == user.id,
            UserServer.server_id == server_id
        ).first()
        
        if not user_server:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Not a member of this server"
            )
        
        # Check role hierarchy: owner > admin > member
        role_hierarchy = {"owner": 3, "admin": 2, "member": 1}
        required_level = role_hierarchy.get(required_role, 0)
        user_level = role_hierarchy.get(user_server.role, 0)
        
        if user_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: '{required_role}' role required"
            )
        
        return user
    return server_permission_checker