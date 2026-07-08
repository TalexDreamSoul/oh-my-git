# KV / Sync / Trust Boundary Migration Roadmap

## Goal

Move the current cloud progress stack from “client-declared state over Workers KV” to a server-authoritative, low-write, migration-ready model.

## Current fixed baseline

The first hardening pass keeps Workers KV, but changes the contract:

- Save payload is whitelisted and size-limited.
- Client-submitted progress is stored as unverified progress and does not enter leaderboards.
- Full solved-list sync is treated as imported, unverified progress.
- Presence no longer writes one shared `presence:<levelId>` map key.
- Achievements and leaderboards only count verified progress.

## Phase 1 — KV-safe operating model

**Target:** keep the current Cloudflare KV deployment stable for small/public-good traffic.

### Work

- Add a real completion verification path:
  - `POST /api/attempt/start` returns `{ attemptId, levelId, startedAt }`.
  - `POST /api/progress/complete` accepts `{ attemptId, levelId, completionProof }`.
  - Server computes score/time/pureCli from server attempt data and accepted proof.
- Add `revision` to user progress and save rows.
- Collapse startup reads into `GET /api/sync`:
  - user profile
  - progress
  - save settings
  - achievement state
  - active season
- Collapse completion response:
  - progress row
  - unlocked achievements
  - affected level leaderboard snapshot
  - season leaderboard snapshot
- Keep leaderboard KV writes conditional on score/time/pureCli improvement only.

### Exit criteria

- Login startup is 1 read endpoint.
- Level completion is 1 write endpoint.
- Replayed/tampered completion body cannot create leaderboard rows.
- Duplicate completion with no better verified result causes no leaderboard write.

## Phase 2 — D1 authoritative storage

**Target:** move authoritative relational data out of KV.

### D1 tables

```sql
users(id primary key, provider, provider_user_id, name, email, avatar_url, leaderboard_anonymous, created_at, updated_at)
sessions(token primary key, user_id, expires_at, created_at)
progress(user_id, level_id, solved, verified, imported, best_score, best_time_seconds, pure_cli, attempts, first_completed_at, updated_at, primary key(user_id, level_id))
achievements(user_id, achievement_id, unlocked_at, primary key(user_id, achievement_id))
level_scores(season_id, level_id, user_id, score, time_seconds, pure_cli, completed_at, primary key(season_id, level_id, user_id))
season_scores(season_id, user_id, total_score, solved_count, pure_cli_count, updated_at, primary key(season_id, user_id))
```

### KV role after D1

KV becomes a read-through cache only:

- `cache:leaderboard:<seasonId>:<levelId>:top:<limit>`
- `cache:season:<seasonId>:top:<limit>`
- OAuth provider config if admin changes remain rare.

### Migration shape

1. Add D1 schema and dual-read fallback.
2. Backfill D1 from existing KV keys with an idempotent script.
3. Dual-write verified changes to D1 and old KV for one release.
4. Switch reads to D1.
5. Stop writing progress/leaderboards/achievements to KV.
6. Keep legacy KV read fallback for one retention window.

### Exit criteria

- D1 is the source of truth for users/progress/achievements/leaderboards.
- KV leaderboard cache can be deleted and rebuilt from D1.
- Admin summary no longer scans hundreds of KV records.

## Phase 3 — Durable Object presence

**Target:** remove presence from KV completely.

### Work

- Create one Durable Object namespace for presence rooms.
- Route presence by level id.
- DO keeps in-memory `userId -> lastSeen` with alarm cleanup.
- API exposes only counts and optional anonymized aggregate state.

### Exit criteria

- No `presence:*` writes in KV.
- Heartbeats do not touch global hot keys.
- Online counts are eventually cleaned without user traffic.

## Phase 4 — quotas and retention

**Target:** cap every per-user and public dataset.

### Limits

- Save payload: 16 KiB max.
- Progress rows: one per valid level id.
- Attempts: capped at 999 per level.
- Imported unverified progress: not eligible for leaderboard or skill achievements.
- Sessions: 30-day TTL; optional per-user session cap.
- Public leaderboard cache: top 100 per level, top 500 per season.
- Admin data writes: 64 KiB max and audited separately.

### Exit criteria

- Every write path has a documented byte limit and row-count limit.
- Every large list endpoint is paginated or cached.
- Public cache can be regenerated from authoritative storage.

## Phase 5 — rollout checks

Before each migration phase ships:

- Run `npm run qa:contracts`.
- Run TypeScript checking.
- Smoke test login, save settings, local anonymous mode, cloud account mode, completion, import, leaderboard display, profile update, and presence.
- Verify tampered requests do not create verified progress or leaderboard rows.
