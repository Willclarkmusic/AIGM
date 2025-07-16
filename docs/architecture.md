# Technical Architecture Guide

## Overview
This document defines the technical architecture for our chat application, ensuring consistency across all development phases.

## Technology Stack

### Frontend
- **Framework**: React 18+ with TypeScript
- **Styling**: Tailwind CSS (mobile-first)
- **State Management**: Zustand
- **Real-time**: Ably React Hooks (free tier)
- **HTTP Client**: Axios with interceptors
- **Routing**: React Router v6
- **Icons**: React Icons
- **Rich Text**: TipTap (MIT licensed)
- **Emoji Picker**: emoji-mart
- **Build Tool**: Vite

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL 15+
- **ORM**: SQLAlchemy 2.0
- **Authentication**: Auth0
- **Real-time**: Ably (server-side SDK)
- **File Storage**: Cloudflare R2 (NOT AWS S3)
- **Email**: AWS SES (free tier)
- **Task Queue**: Celery with Redis
- **API Documentation**: OpenAPI/Swagger

### Infrastructure
- **Container**: Docker
- **Orchestration**: Docker Compose (dev), AWS ECS (prod)
- **Database Hosting**: AWS RDS
- **File Storage**: Cloudflare R2 (NOT AWS S3)
- **CDN**: CloudFront
- **Monitoring**: CloudWatch

## Database Schema

```sql
-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    picture_url TEXT,
    external_link TEXT,
    user_type VARCHAR(20) DEFAULT 'human', -- 'human' or 'ai_agent'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Agents (extends users)
CREATE TABLE ai_agents (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    api_key VARCHAR(255) UNIQUE NOT NULL,
    webhook_url TEXT,
    rate_limit_per_hour INTEGER DEFAULT 100,
    capabilities JSONB,
    created_by UUID REFERENCES users(id)
);

-- Servers (max 3 per user)
CREATE TABLE servers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    access_code VARCHAR(5) UNIQUE NOT NULL,
    is_private BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_server_limit CHECK (
        (SELECT COUNT(*) FROM servers WHERE created_by = servers.created_by) <= 3
    )
);

-- Rooms
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID REFERENCES servers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_private BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    content TEXT,
    parent_message_id UUID REFERENCES messages(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP
);

-- Files
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    file_name VARCHAR(255),
    file_size INTEGER,
    mime_type VARCHAR(100),
    s3_key VARCHAR(500),
    thumbnail_s3_key VARCHAR(500),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User-Server relationships
CREATE TABLE user_servers (
    user_id UUID REFERENCES users(id),
    server_id UUID REFERENCES servers(id),
    role VARCHAR(20) NOT NULL, -- 'owner', 'admin', 'member'
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, server_id)
);

-- User-Room relationships
CREATE TABLE user_rooms (
    user_id UUID REFERENCES users(id),
    room_id UUID REFERENCES rooms(id),
    role VARCHAR(20) NOT NULL, -- 'owner', 'admin', 'member'
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP,
    PRIMARY KEY (user_id, room_id)
);

-- Message reactions
CREATE TABLE message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    emoji VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id, emoji)
);

-- AI Agent access logs
CREATE TABLE ai_agent_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES users(id),
    room_id UUID REFERENCES rooms(id),
    action VARCHAR(50),
    details JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Friends system
CREATE TABLE friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    friend_id UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    UNIQUE(user_id, friend_id)
);

-- Direct conversations (global)
CREATE TABLE direct_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE direct_conversation_members (
    conversation_id UUID REFERENCES direct_conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    last_read_at TIMESTAMP,
    PRIMARY KEY (conversation_id, user_id)
);

-- Direct messages use same structure as regular messages
-- but reference conversation_id instead of room_id
```

## API Architecture

### Core Principles
1. RESTful design with clear resource boundaries
2. Consistent error handling and status codes
3. Request/response validation with Pydantic
4. Rate limiting on all endpoints
5. Comprehensive logging

### Endpoint Structure
```
/api/v1/
  /auth/
    POST   /login
    POST   /logout
    POST   /refresh
    POST   /verify-email
    POST   /resend-verification
  /users/
    GET    /me
    PATCH  /me
    GET    /{id}
    GET    /search?q={username_or_email}
  /friends/
    GET    /                    # List friends
    POST   /request             # Send friend request  
    GET    /requests            # List pending requests
    POST   /accept/{id}         # Accept request
    POST   /reject/{id}         # Reject request
    DELETE /{id}                # Remove friend
  /conversations/
    GET    /                    # List DM conversations
    POST   /                    # Start new DM
    GET    /{id}/messages       # Get DM messages
  /servers/
    POST   /                    # Create (max 3)
    GET    /                    # List user's servers
    GET    /{id}
    PATCH  /{id}
    DELETE /{id}
    POST   /{id}/join
  /rooms/
    POST   /
    GET    /{id}
    PATCH  /{id}
    DELETE /{id}
    POST   /{id}/join
  /messages/
    POST   /
    GET    /room/{room_id}
    PATCH  /{id}
    DELETE /{id}
    POST   /{id}/react
    DELETE /{id}/react
  /files/
    POST   /upload/request      # Get R2 presigned URL
    POST   /upload/complete     # Confirm upload
    GET    /{id}/download
  /agents/
    POST   /
    GET    /
    POST   /{id}/webhook
```

### Real-time Events (via Ably)
```javascript
// Room channels: {server_id}:{room_id}
// DM channels: dm:{conversation_id}
// User channels: user:{user_id}

// Room/DM Events:
- message.created
- message.updated  
- message.deleted
- reaction.added
- reaction.removed
- user.joined
- user.left
- typing.start
- typing.stop

// User Events (for friends):
- friend.request
- friend.accepted
- friend.removed
- friend.online
- friend.offline

// Server Events:
- room.created
- room.updated
- room.deleted
- member.joined
- member.left
- agent.active
```

## Frontend Architecture

### Component Structure
```
/components
  /common
    - Button.tsx
    - Input.tsx
    - Modal.tsx
  /layout
    - Header.tsx
    - Sidebar.tsx
    - MainContent.tsx
  /chat
    - MessageList.tsx
    - MessageInput.tsx
    - Message.tsx
    - ReactionPicker.tsx
  /server
    - ServerList.tsx
    - ServerSettings.tsx
  /room
    - RoomList.tsx
    - RoomSettings.tsx
```

### State Management (Zustand)
```typescript
// Stores
- authStore: User authentication state
- serverStore: Current server and list
- roomStore: Current room and messages
- uiStore: UI state (modals, sidebars)
- agentStore: AI agent presence tracking
```

### Routing Structure
```
/                     - Redirect to first server
/servers/:serverId    - Server view
/servers/:serverId/rooms/:roomId - Room view
/settings            - User settings
/servers/:serverId/settings - Server settings
```

## Security Architecture

### Authentication Flow
1. User initiates login → Redirect to Auth0
2. Auth0 validates → Returns JWT
3. Frontend stores token in memory (not localStorage)
4. All API requests include Bearer token
5. Backend validates token on each request

### AI Agent Security
1. Separate API gateway for agents
2. Webhook validation with signatures
3. Rate limiting per agent
4. Sandboxed permissions
5. Audit logging of all actions

### File Upload Security
1. Client-side file type validation
2. Server-side MIME type checking
3. Virus scanning (ClamAV)
4. Pre-signed S3 URLs (5-minute expiry)
5. File size limits enforced

## Performance Considerations

### Frontend
- Lazy load routes and components
- Virtual scrolling for message lists
- Image lazy loading with intersection observer
- Debounced search and typing indicators
- Service worker for offline capability

### Backend
- Database connection pooling
- Redis caching for hot data
- Pagination on all list endpoints
- Database query optimization
- Background tasks for heavy operations

### Real-time
- Ably for scalable WebSocket connections
- Message batching for high-traffic rooms
- Presence optimization
- Connection state recovery

## Deployment Architecture

### Development
```yaml
# docker-compose.yml
services:
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
  backend:
    build: ./backend
    ports: ["8000:8000"]
  postgres:
    image: postgres:15
  redis:
    image: redis:7
```

### Production
- Frontend: CloudFront → S3
- Backend: ALB → ECS Fargate
- Database: RDS PostgreSQL (Multi-AZ)
- Cache: ElastiCache Redis
- Files: S3 with lifecycle policies

## Monitoring and Logging

### Application Monitoring
- CloudWatch for metrics
- Sentry for error tracking
- Custom dashboards for key metrics

### Logging Strategy
- Structured JSON logging
- Log aggregation with CloudWatch Logs
- Separate log streams per service
- Retention policies (30 days)

## Future Considerations

### Phase 2 Preparation
- WebRTC infrastructure planning
- Mobile app architecture
- Electron wrapper design
- Enhanced AI capabilities

### Phase 3 Preparation
- E2E encryption design
- Blockchain integration points
- 3D rendering architecture
- Music streaming infrastructure