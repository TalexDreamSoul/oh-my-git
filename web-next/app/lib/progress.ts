import { VALID_LEVEL_ID_SET } from '../game/levelIds';

export const MAX_PROGRESS_ATTEMPTS = 999;

export type ProgressRow = {
  level_id: string;
  solved?: number | boolean;
  best_score?: number | null;
  best_time_seconds?: number | null;
  pure_cli?: number | boolean;
  attempts?: number;
  first_completed_at?: string | null;
  season_id?: string | null;
  updated_at?: string;
  verified?: number | boolean;
  imported?: number | boolean;
};

function flag(value: unknown): 0 | 1 {
  return value === true || value === 1 ? 1 : 0;
}

function optionalFlag(value: unknown): 0 | 1 | undefined {
  if (value === true || value === 1) return 1;
  if (value === false || value === 0) return 0;
  return undefined;
}

function finiteNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

function cappedAttempts(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(MAX_PROGRESS_ATTEMPTS, Math.trunc(value))) : 0;
}

export function isSolvedProgress(row: ProgressRow | null | undefined) {
  return row?.solved === true || row?.solved === 1;
}

export function isVerifiedProgress(row: ProgressRow | null | undefined) {
  return isSolvedProgress(row) && row?.verified !== 0 && row?.verified !== false;
}

export function normalizeProgressRows(value: unknown): ProgressRow[] {
  if (!Array.isArray(value)) return [];
  const byLevel = new Map<string, ProgressRow>();

  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const raw = item as Record<string, unknown>;
    const levelId = typeof raw.level_id === 'string' ? raw.level_id : '';
    if (!VALID_LEVEL_ID_SET.has(levelId)) continue;

    const row: ProgressRow = {
      level_id: levelId,
      solved: flag(raw.solved),
      best_score: finiteNumberOrNull(raw.best_score),
      best_time_seconds: finiteNumberOrNull(raw.best_time_seconds),
      pure_cli: flag(raw.pure_cli),
      attempts: cappedAttempts(raw.attempts),
      first_completed_at: stringOrNull(raw.first_completed_at),
      season_id: stringOrNull(raw.season_id),
      updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : undefined
    };

    const verified = optionalFlag(raw.verified);
    if (verified !== undefined) row.verified = verified;
    const imported = optionalFlag(raw.imported);
    if (imported !== undefined) row.imported = imported;

    byLevel.set(levelId, row);
  }

  return [...byLevel.values()];
}
