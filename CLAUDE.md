# CLAUDE.md

## Commands
 - test: `npm test`
 - test one file: `npm test -- path/to/file.test.js`
 - lint: `npm run lint`
 - migrate: `npm run migrate`
 - seed: `npm run seed`

## Architecture
 - entry point: `src/index.js` - registers middlewares, mounts routes
 - business logic: `src/services/*` - stateless where possible
 - database access: `src/models/*` - only files that access db, parametrized pg queries only

## Git
 - Conventional Commits: `<type>(<scope>): <subject>`. Types: feat, fix, chore, docs, refactor, test.
 - Branch names: `feature/JIRA-123-short-description`.
 - TDD Failing Test: `test: red — <subject>`