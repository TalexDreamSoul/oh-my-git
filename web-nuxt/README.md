# Oh My Git! Web Nuxt Cloudflare

Nuxt full-stack target for the next web version.

## Stack

- Nuxt 4
- Cloudflare Pages / Workers preset
- NuxtHub-style D1/KV bindings
- D1 tables for users, sessions, progress, saves
- OAuth placeholders for GitHub and Google

## Local setup

```bash
cd web-nuxt
cp .env.example .env
npm install
npm run dev
```

## OAuth callback URLs

For local development:

```text
http://localhost:3000/api/auth/github/callback
http://localhost:3000/api/auth/google/callback
```

For production, after deployment:

```text
https://<your-domain>/api/auth/github/callback
https://<your-domain>/api/auth/google/callback
```

Set env vars:

```bash
NUXT_PUBLIC_OAUTH_REDIRECT_BASE=https://<your-domain>
NUXT_PUBLIC_GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
NUXT_PUBLIC_GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

## Cloudflare resources

Create D1 and KV, then update `wrangler.toml`:

```bash
wrangler d1 create oh-my-git-web
wrangler kv namespace create KV
```

Apply schema:

```bash
wrangler d1 execute oh-my-git-web --file server/database/migrations/0001_init.sql
```

Deploy:

```bash
npm run build
wrangler pages deploy .output/public --project-name oh-my-git-web-nuxt
```
