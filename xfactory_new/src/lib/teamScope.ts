export function getCurrentTeamId(): string | null {
  try { return localStorage.getItem('xfactoryTeamId'); } catch { return null; }
}

export function scopedKey(base: string): string {
  const teamId = getCurrentTeamId();
  return teamId ? `${base}_${teamId}` : base;
}

export function lsGetScoped(base: string): string | null {
  try {
    const scoped = localStorage.getItem(scopedKey(base));
    if (scoped !== null && scoped !== undefined) return scoped;
    // Fallback: if teamId was not set at write-time, read unscoped value
    return localStorage.getItem(base);
  } catch {
    return null;
  }
}

export function lsSetScoped(base: string, value: string) {
  try { localStorage.setItem(scopedKey(base), value); } catch {}
}

export function lsRemoveScoped(base: string) {
  try { localStorage.removeItem(scopedKey(base)); } catch {}
} 