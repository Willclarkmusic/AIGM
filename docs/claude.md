# Claude Code Project Guidelines

## Project Overview
Building a modern chat application inspired by Slack/Discord with AI agent integration.

**Project Name**: AIGM (AI Generative Messaging)
**Domain**: aigm.world
**Phase**: 1 (Web Application Only)
**Stack**: React + TypeScript, FastAPI, PostgreSQL, Auth0, Ably, Cloudflare R2

## Core Principles

1. **Code Quality**
   - Write clear, concise, and well-documented code
   - Follow ESLint and Prettier configurations
   - Test all critical functionality
   - Use TypeScript for type safety

2. **Architecture First**
   - Reference `architecture.md` for all architectural decisions
   - Build with future phases in mind (mobile, desktop, video)
   - Use clean separation of concerns

3. **Testing Requirements**
   - Unit tests for utilities and helpers
   - Integration tests for API endpoints
   - Component tests for critical UI elements
   - All tests go in `/tests` directories

4. **Development Workflow**
   - Always test code before committing
   - Use meaningful commit messages
   - Document any deviations from the plan
   - Create guides in `/guides` for complex procedures

## CRITICAL DEVELOPMENT RULES

### 1. Zero Errors Policy
- **NO TypeScript errors** - Fix all red squiggles before proceeding
- **NO ESLint warnings** - Code must pass all linting rules
- **NO console errors** - Test in browser before marking complete
- **NO any types** - Always define proper TypeScript types

### 2. Environment Variables
**Development (.env)**:
```
# Public values only
DATABASE_URL=postgresql://...
VITE_API_URL=http://localhost:8000
```

**Production (AWS Secrets Manager)**:
```
# Sensitive values
AUTH0_CLIENT_SECRET=...
CLOUDFLARE_R2_SECRET_KEY=...
ADMIN_PASSWORD=...
JWT_SECRET_KEY=...
```

**Rule**: If it's a secret key, password, or token, it goes in Secrets Manager, NOT .env

### 3. Error Handling
- Every API endpoint must have try/catch
- Every async function needs error handling
- User-facing errors must be helpful, not technical
- Log errors with context for debugging

### 4. Testing Before Completion
- Run the code before saying "complete"
- Test happy path AND error cases
- Check mobile, tablet, and desktop views
- Verify no breaking changes to existing features

### 5. Documentation Requirements
- Document every non-obvious decision
- Add JSDoc comments for complex functions
- Update README if setup changes
- Create migration guides for breaking changes

### 6. State Management Rules
- Don't duplicate state between stores
- Server state (API data) vs UI state (modals, themes)
- Clean up subscriptions and listeners
- Handle loading and error states

### 7. Security First
- Validate all user inputs
- Sanitize data before display
- Check permissions on every API call
- Never expose internal IDs in URLs

### 8. Performance Standards
- Lazy load routes and heavy components
- Debounce user inputs (search, typing indicators)
- Paginate all lists (50 items default)
- Optimize images before upload

### 9. Git Workflow
- Commit after each working feature
- Never commit sensitive data
- Use descriptive commit messages
- Tag major milestones

## Phase Planning

### Phase 1 (Current)
- Web application with core chat functionality
- Authentication via Auth0
- Real-time messaging with Ably
- File uploads to S3
- Basic AI agent framework

### Phase 2 (Future)
- Desktop app via Electron
- Enhanced AI agent capabilities
- Voice calling integration
- Mobile app development

### Phase 3 (Future)
- Video calling
- Advanced encryption
- Blockchain integration
- 3D spaces and music rooms

## Communication Style
- Be direct about technical limitations
- Suggest alternatives when something is too complex
- Always consider security implications
- Think about scalability from day one

## File Structure Requirements
```
/project-root
  /backend
  /frontend
  /shared
  /docs
    claude.md (this file)
    architecture.md
    api-spec.md
  /tests
  /guides
  /scripts
```

## Security Principles
- Never store sensitive data in code
- Use environment variables for secrets
- Implement proper authentication and authorization
- Rate limit all public endpoints
- Audit log all AI agent actions

## AI Agent Considerations
- Treat AI agents as special users with limited permissions
- All AI actions must be logged
- Implement strict rate limiting
- Use sandboxed API endpoints
- Visual indicators when AI is present in a room

## References
- **Architecture**: Always refer to `/docs/architecture.md` for:
  - Database schema
  - API endpoint structure  
  - Technology stack decisions
  - Real-time event patterns
- **API Specification**: See `/docs/api-spec.md`
- **Deployment Guide**: See `/guides/deployment.md`
- **Testing Guide**: See `/guides/testing.md`
- **Secrets Management**: See `/docs/SECRETS.md`
- **Change Log**: See `/docs/CHANGELOG.md`