# AIGM Change Log

All notable changes to this project will be documented in this file.

## [Phase 1] - In Development

### Added
- User authentication with Auth0 (email + Gmail login)
- Email verification system
- Friends system with friend requests
- Global direct messaging between friends
- Server creation (3 per user limit)
- Room management within servers
- Real-time messaging with Ably
- Rich text editor using TipTap
- Message reactions with emojis
- Collapsible reply threads
- File uploads to Cloudflare R2 (10MB limit)
- Dark/Light theme system
- Mobile-first responsive design
- Admin portal for system management
- Basic AI agent framework with webhooks
- Rate limiting (in-memory)
- Weekly automated database backups

### Technical Stack
- Frontend: React 18, TypeScript, Tailwind CSS, Vite
- Backend: FastAPI, PostgreSQL, SQLAlchemy
- Real-time: Ably
- Auth: Auth0
- Storage: Cloudflare R2
- Email: AWS SES

---

## [Phase 2] - Planned

### Planned Features
- Desktop app (Electron wrapper)
- Enhanced AI agents with JavaScript sandbox
- Voice calling rooms
- Redis-based rate limiting
- Advanced theme customization
- Server discovery/browse feature
- Message search functionality
- Push notifications

---

## [Phase 3] - Future

### Planned Features
- Video calling
- End-to-end encryption option
- Mobile apps (React Native)
- 3D spaces
- Music collaboration rooms
- Blockchain integration
- Advanced moderation tools

---

## Version History

### [0.1.0] - Phase 1 Start Date
- Initial project setup
- Core architecture established
- Development environment configured