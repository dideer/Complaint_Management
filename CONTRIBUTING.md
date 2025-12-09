# Contributing to Complaint Management System

## Code Quality Standards

### ESLint Rules
- Indentation: 2 spaces
- Quotes: Single quotes
- Semicolons: Required
- No console.log in production
- Use const/let instead of var
- Strict equality (===)

### Testing Requirements
- Minimum 80% code coverage
- Unit tests for all functions
- Integration tests for workflows
- All tests must pass before merge

### Security Requirements
- No hardcoded secrets
- Validate all inputs
- Use parameterized queries
- Handle errors gracefully
- Run npm audit before commit

## Commit Message Format
\`\`\`
[TYPE] Brief description

Detailed explanation if needed.

Fixes #issue-number
\`\`\`

### Commit Types
- **feat**: New feature
- **fix**: Bug fix
- **test**: Test-related changes
- **docs**: Documentation
- **style**: Code style (eslint)
- **refactor**: Code refactoring
- **perf**: Performance improvement
- **security**: Security fix

## Pre-Commit Checks
```bash
npm run precommit
```

## Pre-Push Checks
```bash
npm run prebuild
```

## Code Review Checklist
- [ ] Code follows ESLint rules
- [ ] All tests pass
- [ ] No security vulnerabilities
- [ ] Documentation updated
- [ ] No duplicate code
- [ ] Error handling complete

## Setup Development Environment
```bash
npm install
npm run dev
```

## Running Tests
```bash
npm run test:all
npm run lint
npm run security:all
```
