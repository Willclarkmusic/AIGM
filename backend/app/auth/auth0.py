from typing import Optional
import jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jwt import PyJWKClient
from app.core.config import settings
import httpx
import json

# Auth0 configuration
AUTH0_DOMAIN = settings.AUTH0_DOMAIN
AUTH0_AUDIENCE = settings.AUTH0_AUDIENCE
AUTH0_ALGORITHMS = ["RS256"]

# JWT token verification
security = HTTPBearer()

# JWK client for Auth0 public keys
jwks_client = PyJWKClient(f"https://{AUTH0_DOMAIN}/.well-known/jwks.json")

class Auth0Token:
    def __init__(self, token: str):
        self.token = token
        self.payload = self._verify_token()
    
    def _verify_token(self) -> dict:
        """Verify Auth0 JWT token and return payload"""
        try:
            # Get the signing key from Auth0
            signing_key = jwks_client.get_signing_key_from_jwt(self.token)
            
            # Verify and decode the token
            payload = jwt.decode(
                self.token,
                signing_key.key,
                algorithms=AUTH0_ALGORITHMS,
                audience=AUTH0_AUDIENCE,
                issuer=f"https://{AUTH0_DOMAIN}/"
            )
            return payload
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token verification failed: {str(e)}"
            )
    
    @property
    def user_id(self) -> str:
        """Get user ID from token (Auth0 'sub' claim)"""
        return self.payload.get("sub", "")
    
    @property
    def email(self) -> Optional[str]:
        """Get email from token"""
        return self.payload.get("email")
    
    @property
    def email_verified(self) -> bool:
        """Check if email is verified"""
        return self.payload.get("email_verified", False)
    
    @property
    def permissions(self) -> list:
        """Get user permissions from token"""
        return self.payload.get("permissions", [])

def get_auth0_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Auth0Token:
    """Dependency to get and verify Auth0 token"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required"
        )
    
    return Auth0Token(credentials.credentials)

def require_permission(permission: str):
    """Decorator to require specific permission"""
    def permission_checker(token: Auth0Token = Depends(get_auth0_token)) -> Auth0Token:
        if permission not in token.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{permission}' required"
            )
        return token
    return permission_checker

# Optional dependency for endpoints that can work with or without auth
def get_optional_auth0_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[Auth0Token]:
    """Optional dependency to get Auth0 token if present"""
    if credentials is None:
        return None
    
    try:
        return Auth0Token(credentials.credentials)
    except HTTPException:
        return None