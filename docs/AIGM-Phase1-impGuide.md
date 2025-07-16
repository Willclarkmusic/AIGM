# AIGM Phase 1 Complete Implementation Guide

## Overview
This guide provides exact step-by-step instructions to implement AIGM Phase 1. Follow each step precisely.

**Total Timeline**: 50 days (10 weeks)
**Daily Time**: Assume 4-6 hours of development per day

## Pre-Setup Requirements

### 1. Install Required Software
```bash
# In Windows PowerShell (as Administrator)
wsl --install -d Ubuntu
# Restart computer

# In Ubuntu WSL2 terminal
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3.11 python3-pip nodejs npm git postgresql-client curl

# Install Docker Desktop for Windows
# Download from: https://www.docker.com/products/docker-desktop/
# Enable WSL2 integration in Docker Desktop settings

# Verify installations
python3.11 --version  # Should show 3.11.x
node --version        # Should show v18.x+
npm --version         # Should show 9.x+
docker --version      # Should show version info
```

### 2. Create Accounts
Create free accounts at:
- [ ] GitHub (for code repository)
- [ ] Auth0 (authentication) - auth0.com
- [ ] Ably (real-time) - ably.com
- [ ] AWS (for SES email) - aws.amazon.com
- [ ] Cloudflare (you already have for aigm.world)

### 3. Initial Setup in WSL2
```bash
# Create project directory
cd ~
mkdir projects && cd projects
mkdir aigm && cd aigm

# Initialize git
git init
```

## WEEK 1: Project Foundation (Days 1-5)

### Day 1: Project Structure Setup

#### Step 1: Use Main Claude Instance
Copy and paste this exact prompt to **Main Claude Code Instance**:

```
You are the main Claude Code instance for building AIGM. Please:
1. Create the complete project directory structure at ~/projects/aigm
2. Initialize git repository with proper .gitignore
3. Create all base configuration files including Docker setup
4. Set up requirements.txt and package.json with the exact versions specified
5. Create empty .env.example files for both frontend and backend
6. Create README.md with project overview

Follow the Main Claude Code Instance prompt exactly, including:
- Using Cloudflare R2 (NOT S3)
- Mobile-first approach
- Friends system (global, not server-linked)
- 3 server limit per user
- All required dependencies with correct versions

Reference /docs/architecture.md for the complete schema and technical decisions.
```

#### Step 2: Verify Structure
Your project should now look like:
```
aigm/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   └── services/
│   ├── admin/
│   │   ├── frontend/
│   │   └── static/
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── stores/
│   │   └── services/
│   ├── tests/
│   ├── package.json
│   └── .env.example
├── shared/
│   └── types/
├── docs/
│   ├── claude.md
│   ├── architecture.md
│   ├── CHANGELOG.md
│   └── SECRETS.md
├── guides/
├── scripts/
├── docker-compose.yml
├── .gitignore
└── README.md
```

#### Step 3: Copy Documentation Files
1. Create the `/docs` directory
2. Copy each artifact content into respective files:
   - claude.md (from artifact)
   - architecture.md (from artifact)
   - CHANGELOG.md (from artifact)
   - SECRETS.md (from artifact)

#### Step 4: Create Environment Files
```bash
cd ~/projects/aigm/backend
cp .env.example .env
cd ../frontend
cp .env.example .env
```

#### Step 5: Fill in Environment Files

**Backend .env** (update with your actual values):
```bash
# Database
DATABASE_URL=postgresql://aigm:localpassword@localhost:5432/aigm
REDIS_URL=redis://localhost:6379

# Auth0 (get from Auth0 dashboard)
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_API_AUDIENCE=https://api.aigm.world
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret

# Ably (get from Ably dashboard)
ABLY_API_KEY=your-ably-key

# Cloudflare R2 (get from Cloudflare dashboard)
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret
R2_BUCKET_NAME=aigm-uploads
R2_PUBLIC_URL=https://files.aigm.world

# AWS SES (get from AWS console)
AWS_ACCESS_KEY_ID=your-ses-key
AWS_SECRET_ACCESS_KEY=your-ses-secret
AWS_REGION=us-east-1
SES_FROM_EMAIL=noreply@aigm.world

# Admin
ADMIN_PASSWORD=changeme-to-secure-password

# App
SECRET_KEY=changeme-to-random-string
ENVIRONMENT=development
```

**Frontend .env**:
```bash
VITE_API_URL=http://localhost:8000
VITE_AUTH0_DOMAIN=your-domain.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_REDIRECT_URI=http://localhost:3000/callback
VITE_ABLY_PUBLIC_KEY=first-part-of-ably-key-before-colon
VITE_R2_PUBLIC_URL=https://files.aigm.world
```

### Day 2: Service Configuration

#### Step 1: Auth0 Setup
1. Go to https://auth0.com and create account
2. Create new tenant named "aigm"
3. Create new Application:
   - Name: "AIGM Web App"
   - Type: "Single Page Application"
4. In Application Settings:
   - Allowed Callback URLs: `http://localhost:3000/callback, https://aigm.world/callback`
   - Allowed Logout URLs: `http://localhost:3000, https://aigm.world`
   - Allowed Web Origins: `http://localhost:3000, https://aigm.world`
5. Enable Username-Password Authentication
6. Create API:
   - Name: "AIGM API"
   - Identifier: `https://api.aigm.world`
7. Enable Gmail Social Connection
8. Update your .env files with these values

#### Step 2: Ably Setup
1. Create Ably account at https://ably.com
2. Create new app named "AIGM"
3. Copy your API key (format: `xxxxx.yyyyy:zzzzz`)
4. Update .env files:
   - Backend: Full key in `ABLY_API_KEY`
   - Frontend: Only part before colon in `VITE_ABLY_PUBLIC_KEY`

#### Step 3: Cloudflare R2 Setup
1. In Cloudflare dashboard for aigm.world
2. Go to R2 Object Storage
3. Create bucket: "aigm-uploads"
4. Create API token:
   - Permission: Object Read & Write
   - Specify bucket: aigm-uploads
5. Set up custom domain:
   - Add custom domain: `files.aigm.world`
   - Configure DNS settings
6. Update .env files with credentials

#### Step 4: AWS SES Setup
1. In AWS Console, go to SES
2. Verify domain: aigm.world
3. Verify email: noreply@aigm.world
4. Create IAM user with SES send permissions:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Action": ["ses:SendEmail", "ses:SendRawEmail"],
       "Resource": "*"
     }]
   }
   ```
5. Generate access keys and update .env

### Day 3: Docker and Database Setup

#### Step 1: Start Docker Services
```bash
cd ~/projects/aigm
docker-compose up -d postgres redis
# Wait 30 seconds for startup
docker-compose ps  # Should show both services as healthy
```

#### Step 2: Test Database Connection
```bash
# Test PostgreSQL
docker exec -it aigm-postgres-1 psql -U aigm -d aigm -c "SELECT version();"

# Test Redis
docker exec -it aigm-redis-1 redis-cli ping
# Should return "PONG"
```

### Day 4-5: Backend Foundation

#### Step 1: Prompt Backend Claude Instance
Use the **Backend Claude Code Instance** prompt:

```
You are the Backend Claude Instance for AIGM. Working in the /backend directory:

1. Set up complete FastAPI application structure following architecture.md
2. Create ALL SQLAlchemy models from the database schema in architecture.md
3. Set up Alembic for migrations
4. Create database connection with connection pooling
5. Implement health check endpoint
6. Set up CORS configuration
7. Create initial migration and test database connection

IMPORTANT:
- Use Cloudflare R2, NOT AWS S3
- Include friends system with global DMs
- Enforce 3-server limit per user
- Support both room and DM messages
- Use the exact dependency versions from requirements.txt
- Make sure email verification is included
- Test that the server starts without errors

Reference /docs/architecture.md for complete schema and /docs/claude.md for coding standards.
```

#### Step 2: Install Dependencies and Run Migration
```bash
cd ~/projects/aigm/backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run initial migration
alembic init alembic
# Claude will modify alembic.ini and create migration files
alembic revision --autogenerate -m "Initial tables"
alembic upgrade head
```

#### Step 3: Test Backend
```bash
# Start backend (in backend directory with venv activated)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Open browser to http://localhost:8000/docs
# You should see Swagger documentation
```

## WEEK 2-3: Backend API Development (Days 6-15)

### Days 6-7: Authentication Endpoints

**Prompt Backend Claude Instance**:
```
Implement complete Auth0 integration for AIGM:

1. Create auth middleware to validate JWT tokens from Auth0
2. Implement /api/v1/auth/login endpoint
3. Implement /api/v1/auth/logout endpoint
4. Implement /api/v1/auth/verify-email endpoint
5. Implement /api/v1/auth/resend-verification endpoint
6. Create dependency to get current user from token
7. Add auth protection to test endpoints
8. Create comprehensive tests for auth flow
9. Integrate with AWS SES for email verification

Use the exact Auth0 configuration from the .env file and ensure email verification is required for all new users.

Test with Swagger UI to ensure tokens work correctly.
```

### Days 8-9: User Management

**Prompt Backend Claude Instance**:
```
Implement all user endpoints from architecture.md:

1. GET /api/v1/users/me - with full user details including email verification status
2. PATCH /api/v1/users/me - update profile (username, picture_url, external_link)
3. GET /api/v1/users/{id} - get user by ID (only basic public info)
4. GET /api/v1/users/search?q={exact_username_or_email} - exact match search only

Include proper error handling, validation, and ensure users can only edit their own profiles.
```

### Days 10-11: Friends System

**Prompt Backend Claude Instance**:
```
Implement complete friends system for AIGM:

1. All friends endpoints from architecture.md (/api/v1/friends/*)
2. Friend request notifications via Ably real-time events
3. Validation that users exist before sending requests
4. Prevent self-friending and duplicate requests
5. Proper status management (pending/accepted/blocked)
6. List friends with online status
7. Logic: Users can DM if they are friends OR in the same server

This is a global friends system, not server-specific. Test all endpoints thoroughly.
```

### Days 12-13: Servers and Rooms

**Prompt Backend Claude Instance**:
```
Implement server and room management with these requirements:

1. All server endpoints with 3-server limit enforcement (CHECK IN CODE)
2. Unique 5-character access code generation for each server
3. Room creation within servers
4. Member management with roles (owner/admin/member)
5. Join server/room with proper validation
6. List user's servers and rooms
7. Server deletion only by owner (cascade delete rooms)

CRITICAL: Enforce the 3-server limit in the create endpoint. Return clear error when limit reached.
```

### Days 14-15: Messages and Real-time

**Prompt Backend Claude Instance**:
```
Implement messaging system for both rooms and direct conversations:

1. Message CRUD endpoints supporting both room_id and conversation_id
2. Reply threading support with parent_message_id
3. Reaction endpoints (add/remove emoji reactions)
4. Ably integration for real-time events
5. Message pagination (50 per page with before/after cursors)
6. Typing indicators via Ably
7. Support for both room messages and DM conversations
8. File attachment support (metadata only, files go to R2)

Publish these Ably events:
- message.created
- message.updated
- message.deleted
- reaction.added
- reaction.removed
- typing.start
- typing.stop

Test real-time events work correctly.
```

## WEEK 4-5: Frontend Development (Days 16-25)

### Days 16-17: Frontend Setup

**Prompt Frontend Claude Instance**:
```
You are the Frontend Claude Instance for AIGM. In the /frontend directory:

1. Set up Vite + React + TypeScript with the exact package.json dependencies
2. Configure Tailwind CSS with MOBILE-FIRST approach
3. Set up React Router with these routes:
   - / (redirect to first server or friends)
   - /friends
   - /login
   - /servers/:serverId
   - /servers/:serverId/rooms/:roomId
4. Create responsive base layout component
5. Set up Auth0 Provider with email verification flow
6. Create working login/logout flow with email verification

CRITICAL: Mobile-first design. Every component must work on mobile. Use proper Tailwind breakpoints (sm:, md:, lg:).

Test on mobile viewport constantly. Minimum 44px touch targets.
```

### Days 18-19: State Management

**Prompt Frontend Claude Instance**:
```
Set up Zustand stores for AIGM:

1. authStore - user authentication, email verification status, login/logout methods
2. friendsStore - friends list, requests, conversations, online status
3. serverStore - servers list (max 3), current server, can create check
4. roomStore - rooms, current room, messages with replies map
5. uiStore - sidebar state, modals, theme (dark/light), mobile detection

Create API client with axios interceptors for authentication and error handling.

Include proper TypeScript interfaces for all state and ensure mobile responsiveness is considered in UI state.
```

### Days 20-21: Core UI Components

**Prompt Frontend Claude Instance**:
```
Create mobile-first UI components for AIGM:

1. Responsive layout with collapsible sidebars (75% width on mobile)
2. Friends page that replaces server view when selected
3. Server sidebar with icons (max 3 + add button, disabled when at limit)
4. Room list with collapsible sections
5. Message list component (virtual scrolling, no real-time yet)
6. User profile dropdown with theme toggle
7. Mobile hamburger menu navigation
8. Toast notification system

CRITICAL: 
- Mobile-first: Design for mobile, enhance for desktop
- Touch targets minimum 44px on mobile
- Test on actual mobile viewport sizes
- Friends icon goes above server list in sidebar
```

### Days 22-23: Friends System UI

**Prompt Frontend Claude Instance**:
```
Complete friends system UI for AIGM:

1. Friends page with search by exact username/email (no suggestions)
2. Friend request list with accept/reject actions
3. Friends list with online status indicators
4. DM conversation interface (up to 10 users per DM)
5. Friend request notifications (toasts)
6. Add friend modal with exact search only
7. Online/offline status indicators
8. Integration with friends store
9. Users can DM friends OR users in same server
10. DMs support reactions and files but NO replies

When Friends icon is selected in sidebar, replace the main server view with friends management interface.
```

### Days 24-25: Rich Text Editor

**Prompt Frontend Claude Instance**:
```
Integrate TipTap rich text editor for AIGM:

1. Install and configure TipTap with StarterKit
2. Create message composer with:
   - Bold, italic, code formatting
   - Emoji picker integration (emoji-mart)
   - Auto-expanding textarea
   - Mobile-friendly toolbar
   - @mention autocomplete
   - File attachment button (10MB limit)
3. Message preview rendering
4. Mobile optimization (proper keyboard handling)
5. Paste handling for text and images

Ensure the editor works perfectly on mobile with proper keyboard spacing and touch interactions.
```

## WEEK 6: Real-time Integration (Days 26-30)

### Days 26-27: Ably Integration

**Prompt both Backend and Frontend Claude**:

**Backend**:
```
Set up Ably server-side publishing for all real-time events:
1. Message events (created/updated/deleted)
2. Friend events (request/accepted/online/offline)
3. Reaction events
4. Typing indicators
5. Presence tracking for online status

Use proper channel naming:
- room:{server_id}:{room_id}
- dm:{conversation_id}
- user:{user_id}
```

**Frontend**:
```
Set up Ably React hooks for real-time subscriptions:
1. Connection management with auth token endpoint
2. Channel subscriptions per room/conversation
3. Optimistic updates for messages
4. Typing indicators (debounced)
5. Friend online/offline status
6. Error handling and reconnection
7. Mobile-optimized real-time updates

Test with multiple browser windows to ensure real-time works correctly.
```

### Days 28-30: Real-time Features

**Test each feature**:
1. Open two browser windows
2. Test message appears instantly
3. Test reactions sync in real-time
4. Test typing indicators work
5. Test friend online status updates
6. Test on mobile devices

## WEEK 7: Advanced Features (Days 31-35)

### Days 31-32: Reply System

**Prompt Frontend Claude Instance**:
```
Implement collapsible reply system for AIGM:

1. Reply button on message hover/long-press
2. Reply threads that indent under original message
3. Collapse/expand with smooth animations
4. Reply count indicators with arrow
5. Replies collapsed by default
6. Mobile touch-friendly interactions
7. Proper threading in message store

This should work seamlessly on both mobile and desktop with appropriate touch/click interactions.
```

### Days 33-35: File Uploads

**Prompt both Backend and Frontend Claude**:

**Backend**:
```
Implement Cloudflare R2 file uploads:
1. Presigned URL generation for R2
2. File metadata storage in database
3. 10MB size limit enforcement
4. MIME type validation
5. File download endpoints
6. Integration with message system

Use Cloudflare R2, NOT AWS S3. Ensure proper CORS setup.
```

**Frontend**:
```
Implement file upload UI:
1. Drag-drop upload with react-dropzone
2. Mobile file picker support
3. Upload progress tracking
4. Image inline preview in messages
5. File type icons for non-images
6. 10MB limit with clear error messages
7. Mobile-optimized file selection

Test file uploads work on both mobile and desktop.
```

## WEEK 8: Admin Portal (Days 36-40)

**Prompt Admin Portal Claude Instance**:
```
Create complete admin portal for AIGM:

1. Separate React app in /backend/admin/frontend/
2. Password protected with basic auth
3. User management interface (view, disable, delete)
4. Server/room management with stats
5. AI agent configuration and monitoring
6. Audit logging for all admin actions
7. System stats dashboard
8. Build setup to serve from FastAPI at /admin

Include all safe operations from the admin portal prompt with proper confirmation dialogs.
```

## WEEK 9: AI Agents & Testing (Days 41-45)

### Days 41-43: AI Agent System

**Prompt AI Agent Claude Instance**:
```
Implement basic AI agent system for AIGM:

1. Agent user type in database with special permissions
2. Webhook endpoints with HMAC signature validation
3. Rate limiting system (100 requests/hour default)
4. Simple Python SDK for developers
5. Agent activity indicators in room UI
6. Admin interface for agent management
7. Audit logging for all agent actions

Phase 1: Simple webhook bots only. Focus on security and reliability.
```

### Days 44-45: Testing

**All instances should**:
```
Create comprehensive test suites:
1. Unit tests for critical functions
2. Integration tests for API endpoints
3. Component tests for UI interactions
4. Mobile responsiveness testing
5. Real-time event testing
6. File upload testing
7. Security testing (auth, rate limits)

Test on multiple devices and browsers.
```

## WEEK 10: Final Integration (Days 46-50)

### Days 46-48: Integration Testing

**Complete System Testing**:
1. Test complete user journeys (signup → friend → message)
2. Test mobile functionality on real devices
3. Fix any integration issues
4. Performance optimization
5. Security audit

### Days 49-50: Deployment Preparation

**Create Production Setup**:
1. Environment variable audit using SECRETS.md
2. AWS Secrets Manager setup
3. Production build scripts
4. Deployment documentation
5. Backup system verification

## Daily Workflow

### Morning Routine
1. Open WSL2 terminal
2. Navigate to project: `cd ~/projects/aigm`
3. Start Docker: `docker-compose up -d`
4. Check service health: `docker-compose ps`

### Development Flow
1. Use appropriate Claude instance for current task
2. Test changes on mobile first, then desktop
3. Commit with clear messages: `git add . && git commit -m "feat: implement user search"`
4. Update progress tracking

### Evening Checklist
- [ ] All code committed
- [ ] Tests passing
- [ ] Mobile functionality verified
- [ ] No secrets in committed files

## Common Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f [service]

# Backend development
cd backend && source venv/bin/activate
uvicorn app.main:app --reload

# Frontend development
cd frontend && npm run dev

# Run migrations
cd backend && alembic upgrade head

# Run tests
cd backend && pytest
cd frontend && npm test

# Build admin portal
cd backend/admin/frontend && npm run build
```

## Troubleshooting

### WSL2 Issues
- If slow, move code to WSL2 filesystem: `/home/username/`
- If Docker won't connect, restart Docker Desktop
- Check WSL2 integration is enabled in Docker settings

### Database Issues
- Check if PostgreSQL container running: `docker-compose ps`
- Check logs: `docker-compose logs postgres`
- Reset database: `docker-compose down -v && docker-compose up -d`

### Auth0 Issues
- Verify callback URLs match exactly
- Check tenant settings and API configuration
- Ensure tokens aren't expired
- Test with Swagger UI

### Mobile Issues
- Test on real devices, not just browser DevTools
- Check touch targets are 44px minimum
- Verify fonts are 16px+ to prevent zoom
- Test keyboard interactions

### File Upload Issues
- Verify R2 credentials and bucket exists
- Check CORS settings in Cloudflare
- Ensure custom domain is properly configured
- Test file size limits

## Progress Tracking

Create a `progress.md` file to track:
- [ ] Week 1: Project Foundation
- [ ] Week 2-3: Backend Core
- [ ] Week 4-5: Frontend Foundation
- [ ] Week 6: Real-time Integration
- [ ] Week 7: Advanced Features
- [ ] Week 8: Admin Portal
- [ ] Week 9: AI Agents & Testing
- [ ] Week 10: Final Integration

## Success Criteria

Phase 1 is complete when:
- [ ] Users can register and login with email verification
- [ ] Gmail social login works
- [ ] Users can add friends and send DMs
- [ ] Users can create up to 3 servers
- [ ] Users can create/join rooms and message in real-time
- [ ] Rich text messaging with TipTap works on mobile
- [ ] File uploads to R2 work (10MB limit)
- [ ] Message reactions and replies work
- [ ] Dark/Light themes work
- [ ] Admin portal is functional
- [ ] Basic AI agent framework works
- [ ] All features work perfectly on mobile
- [ ] All tests passing
- [ ] Production deployment ready

## Important Reminders

1. **Mobile First**: Test every feature on mobile immediately
2. **Use Cloudflare R2**: Never use AWS S3
3. **Friends are Global**: Not server-specific DMs
4. **3 Server Limit**: Enforce in code and UI
5. **Email Verification**: Required for all users
6. **Security First**: Rate limiting and proper auth
7. **Test Real Devices**: Don't rely only on browser DevTools

Follow each step exactly and you'll have a working AIGM Phase 1 in 50 days!