# AGENTS.md

## Project Context

Antokton is a community, jobs, services, marketplace, events, media, and member platform.

The current codebase was exported/ejected from Base44. The active frontend is a React/Vite app in `antokton-export`.

The current backend is a local Base44-compatible compatibility backend in `backend`. It uses SQLite for local data and local disk uploads for files.

The goal is an independent production deployment for web first, then PWA/mobile app packaging later.

## Strict Working Rules For Codex

1. Do not rewrite the project from scratch.

2. Preserve the current React/Vite frontend structure.

3. Preserve the Base44-compatible local client temporarily until a replacement is planned and tested.

4. Do not delete files without explicit user approval.

5. Do not introduce new paid third-party services without explaining why they are needed, what they replace, and what the cost/lock-in tradeoff is.

6. Prioritize production readiness in this order:
   - remove remaining Base44 dependency risk
   - secure authentication
   - migrate from SQLite/local data to PostgreSQL/Supabase-compatible schema
   - move uploads from local disk to cloud/object storage
   - prepare deployment
   - prepare PWA/mobile packaging

7. Every code change must be small, testable, and documented.

8. Before changing code, read `AUDIT_REPORT.md` and `PRODUCTION_ROADMAP.md`.

9. After each task, report:
   - files changed
   - why changed
   - how to test
   - risks or pending issues

10. Never commit secrets, API keys, tokens, passwords, or `.env` files.

11. Use `.env.example` for required environment variables.

12. Keep the project portable and avoid vendor lock-in where possible.

13. Prefer standard technologies:
   - React/Vite
   - Node.js
   - PostgreSQL
   - Supabase-compatible architecture
   - object storage compatible with S3/R2/Supabase Storage

14. For production security, do not keep dev-only auth as the final solution.

15. Do not remove SQLite/local backend until the replacement path is tested.
