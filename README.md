# LandVerify

Next.js (App Router) app for the LandVerify platform: public marketing routes live under `app/(public)`.

## Scripts

```bash
npm run dev        # local dev (Turbopack)
npm run build      # production build
npm run start      # run production build
npm run lint       # ESLint (includes jsx-a11y)
npm run typecheck  # TypeScript, no emit
```

## Environment

Copy `.env.example` to `.env.local` and fill values. Do not commit secrets.

## GitHub Actions

CI runs lint, typecheck, and build on pushes and pull requests to `main`.

## Admin Blog Publishing (main admin only)

This project includes an admin-only publisher at `/admin/login` and `/admin/blog/new`.

### Setup

1. Set environment variables:
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `ADMIN_SESSION_SECRET` (long random string)
   - `GITHUB_REPO` in `owner/repo` format
   - `GITHUB_BRANCH` (defaults to `main`)
   - `GITHUB_CONTENT_TOKEN` (GitHub token with `contents:write` permission)
2. Sign in at `/admin/login`.
3. Publish from `/admin/blog/new`.

Publishing creates/updates Markdown in `content/blog/<slug>.md` through GitHub API. Your normal deployment pipeline then builds and serves the new post.
