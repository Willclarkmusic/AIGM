from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from app.models.user import User, UserType
from app.core.config import settings

class UserService:
    def __init__(self, db: Session):
        self.db = db
    
    async def create_user(self, user_data: Dict[str, Any]) -> User:
        """Create a new user"""
        try:
            user = User(
                username=user_data["username"],
                email=user_data["email"],
                picture_url=user_data.get("picture_url"),
                external_link=user_data.get("external_link"),
                user_type=user_data.get("user_type", UserType.HUMAN)
            )
            
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)
            return user
            
        except IntegrityError as e:
            self.db.rollback()
            if "username" in str(e):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already exists"
                )
            elif "email" in str(e):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already exists"
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User creation failed"
            )
    
    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        return self.db.query(User).filter(User.id == user_id).first()
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        return self.db.query(User).filter(User.email == email).first()
    
    async def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        return self.db.query(User).filter(User.username == username).first()
    
    async def update_user(self, user_id: str, user_data: Dict[str, Any]) -> User:
        """Update user information"""
        user = await self.get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        try:
            # Update allowed fields only
            allowed_fields = ["username", "picture_url", "external_link"]
            for field in allowed_fields:
                if field in user_data:
                    setattr(user, field, user_data[field])
            
            self.db.commit()
            self.db.refresh(user)
            return user
            
        except IntegrityError as e:
            self.db.rollback()
            if "username" in str(e):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already exists"
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User update failed"
            )
    
    async def search_users(self, query: str, limit: int = 20) -> List[User]:
        """Search users by username or email"""
        return self.db.query(User).filter(
            (User.username.ilike(f"%{query}%")) | 
            (User.email.ilike(f"%{query}%"))
        ).limit(limit).all()
    
    async def delete_user(self, user_id: str) -> bool:
        """Delete user (soft delete in production)"""
        user = await self.get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # In production, implement soft delete
        # For now, hard delete
        self.db.delete(user)
        self.db.commit()
        return True