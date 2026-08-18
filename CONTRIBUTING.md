# Contributing to WeaveClip

Thank you for your interest in contributing to WeaveClip! This document provides guidelines and instructions for contributing.

## Development Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   ./scripts/setup.sh
   ```
3. Start development environment:
   ```bash
   docker-compose up -d
   cd server && go run ./cmd/server
   cd web && pnpm dev
   ```

## Code Standards

### Frontend (React + TypeScript)
- Follow the existing component structure in `web/src/components/` and `web/src/pages/`
- Use CSS Modules for all styles (`.module.scss` or `.module.css`)
- All user-facing text must use i18n keys (no hardcoded strings)
- Use Semi Design components for all interactive elements
- Run `pnpm build` before committing to ensure no build errors

### Backend (Go)
- Follow Go conventions and the existing package structure
- All handlers should use the standard response helpers (`OK`, `Created`, `BadRequest`, etc.)
- Add tests for new handlers in `*_test.go` files
- Run `go vet ./...` and `go test ./...` before committing

## Testing

- Frontend: `pnpm test:run` (Vitest + React Testing Library)
- Backend: `go test ./...`
- Full verification: `pnpm build` and `go build ./...`

## Commit Messages

Follow conventional commits:
- `feat:` new features
- `fix:` bug fixes
- `refactor:` code changes that neither fix bugs nor add features
- `docs:` documentation changes
- `test:` adding or updating tests
- `chore:` maintenance tasks

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes and ensure all tests pass
3. Update documentation if needed
4. Submit a PR with a clear description of changes

## Questions?

Feel free to open an issue for any questions or concerns.
