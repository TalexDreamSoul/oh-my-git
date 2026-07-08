export type ActiveTimerState = {
  activeElapsedMs: number;
  lastNowMs: number;
  active: boolean;
};

export type ActiveTimerOptions = {
  maxActiveTickMs?: number;
};

export const ACTIVE_TIMER_MAX_TICK_MS = 2_000;

export function isActiveGameplayTime(visibilityState: DocumentVisibilityState | 'visible' | 'hidden', hasFocus: boolean): boolean {
  return visibilityState === 'visible' && hasFocus;
}

export function createActiveTimerState(nowMs: number, active: boolean): ActiveTimerState {
  return {
    activeElapsedMs: 0,
    lastNowMs: nowMs,
    active
  };
}

export function advanceActiveTimer(state: ActiveTimerState, nowMs: number, active: boolean, options: ActiveTimerOptions = {}): ActiveTimerState {
  const maxActiveTickMs = options.maxActiveTickMs ?? ACTIVE_TIMER_MAX_TICK_MS;
  const deltaMs = Math.max(0, nowMs - state.lastNowMs);
  const countedMs = state.active ? Math.min(deltaMs, maxActiveTickMs) : 0;

  return {
    activeElapsedMs: state.activeElapsedMs + countedMs,
    lastNowMs: nowMs,
    active
  };
}

export function activeElapsedSeconds(state: ActiveTimerState): number {
  return Math.floor(state.activeElapsedMs / 1000);
}
