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
