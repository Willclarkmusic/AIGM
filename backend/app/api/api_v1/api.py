from fastapi import APIRouter
from app.api.api_v1.endpoints import auth, users, friends, servers, rooms, messages, realtime, dev

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(friends.router, prefix="/friends", tags=["friends"])
api_router.include_router(servers.router, prefix="/servers", tags=["servers"])
api_router.include_router(rooms.router, prefix="/rooms", tags=["rooms"])
api_router.include_router(messages.router, prefix="/messages", tags=["messages"])
api_router.include_router(realtime.router, prefix="/realtime", tags=["realtime"])
api_router.include_router(dev.router, prefix="/dev", tags=["development"])