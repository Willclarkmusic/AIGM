# AIGM - AI Generative Messaging

A modern chat application inspired by Slack/Discord with AI agent integration.

## Project Structure

```
/
├── backend/          # FastAPI backend
├── frontend/         # React + TypeScript frontend
├── shared/           # Shared TypeScript types and utilities
├── docs/             # Project documentation
├── tests/            # Test files
├── guides/           # Setup and deployment guides
├── scripts/          # Build and deployment scripts
└── docker-compose.yml
```

## Tech Stack

### Frontend
- **Framework**: React 18+ with TypeScript
- **Styling**: Tailwind CSS (mobile-first)
- **State Management**: Zustand
- **Real-time**: Ably React Hooks
- **Build Tool**: Vite

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL 15+ with SQLAlchemy 2.0
- **Authentication**: Auth0
- **Real-time**: Ably
- **File Storage**: Cloudflare R2/AWS S3

### Infrastructure
- **Container**: Docker
- **Development**: Docker Compose
- **Production**: AWS ECS, RDS, S3

## Quick Start

1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd AIGM
   ```

2. **Environment setup**:
   ```bash
   # Copy environment files
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   
   # Edit the .env files with your configuration
   ```

3. **Start with Docker**:
   ```bash
   docker-compose up
   ```

4. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## Development

### Backend Development
```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

### Code Quality
- **Backend**: Black, isort, flake8, mypy
- **Frontend**: ESLint, Prettier
- **Testing**: pytest (backend), vitest (frontend)

## Phase 1 Features

### Core Functionality
- [x] Project structure and configuration
- [ ] User authentication (Auth0)
- [ ] Server creation and management
- [ ] Room creation and management
- [ ] Real-time messaging
- [ ] File uploads
- [ ] Friends system
- [ ] Direct messaging
- [ ] Message reactions and threading

### Technical Features
- [ ] Database migrations
- [ ] API endpoints
- [ ] Real-time events (Ably)
- [ ] File storage (S3/R2)
- [ ] Email notifications
- [ ] Rate limiting
- [ ] Error handling
- [ ] Testing suite

## Environment Variables

See the `.env.example` files in `backend/` and `frontend/` directories for required environment variables.

**Security Note**: Never commit sensitive values like API keys or secrets. Use AWS Secrets Manager for production.

## Contributing

1. Follow the code quality standards defined in the project
2. Write tests for new functionality
3. Update documentation for significant changes
4. Ensure all linting and tests pass before committing

## Architecture

See `/docs/architecture.md` for detailed technical architecture and decision documentation.

## Development Guidelines

See `/docs/claude.md` for comprehensive development guidelines and best practices.