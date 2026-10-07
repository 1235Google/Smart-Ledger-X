export function getUserTimeZone(): string {
  try {
    const saved = localStorage.getItem('smart_ledger_timezone');
    if (saved) return saved;
  } catch (e) {}

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) return tz;
  } catch (e) {}

  return 'UTC';
}

export function setUserTimeZone(tz: string): void {
  try {
    localStorage.setItem('smart_ledger_timezone', tz);
    window.dispatchEvent(new Event('timezone-changed'));
  } catch (e) {}
}

export function formatUserDateTime(timestamp: string | number | Date | null | undefined, timeZone?: string): string {
  if (!timestamp) return 'Time unavailable';
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return 'Legacy timestamp unavailable';

  const tz = timeZone || getUserTimeZone();
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: tz,
      dateStyle: 'medium',
      timeStyle: 'medium',
      hour12: true
    }).format(d);
  } catch (e) {
    return d.toLocaleString();
  }
}

export function formatUserTime(timestamp: string | number | Date | null | undefined, timeZone?: string): string {
  if (!timestamp) return 'Time unavailable';
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return 'Legacy timestamp unavailable';

  const tz = timeZone || getUserTimeZone();
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: tz,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(d);
  } catch (e) {
    return d.toLocaleTimeString();
  }
}

export function formatDuration(startedAt: string | number | Date | null | undefined, completedAt?: string | number | Date | null | undefined): string {
  if (!startedAt) return 'Time unavailable';
  const start = new Date(startedAt).getTime();
  if (isNaN(start)) return 'Time unavailable';

  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  if (isNaN(end)) return 'Time unavailable';

  const diffMs = Math.max(0, end - start);
  const secs = Math.floor(diffMs / 1000);
  const mins = Math.floor(secs / 60);
  const remSecs = secs % 60;

  if (mins === 0) {
    return `${secs} seconds`;
  }
  return `${mins} minutes ${remSecs} seconds`;
}
