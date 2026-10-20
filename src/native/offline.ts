import type { Entry, Guide } from './iptv';
export type Snapshot = { version: 1; savedAt: number; entries: Entry[]; guide: Guide };
const DAY = 24 * 60 * 60 * 1000;
// Cache only browsing metadata. Playback credentials remain in SecureStore.
export function snapshot(entries: Entry[], guide: Guide, now = Date.now()): Snapshot {
  return { version: 1, savedAt: now, entries: entries.map(({ uri, headers, logo, ...entry }) => ({ ...entry, logo: '' })),
    guide: Object.fromEntries(Object.entries(guide).map(([key, programs]) => [key, programs.filter(p => p.end > now && p.start < now + DAY)])) };
}
export function readSnapshot(raw: string | null, now = Date.now()): Snapshot | null {
  if (!raw) return null;
  try { const data = JSON.parse(raw) as Snapshot;
    if (data.version !== 1 || !Number.isFinite(data.savedAt) || data.savedAt > now || now - data.savedAt >= DAY || !Array.isArray(data.entries) || !data.guide || typeof data.guide !== 'object') return null;
    return snapshot(data.entries, data.guide, data.savedAt);
  } catch { return null; }
}
export function childEntries(entries: Entry[], child: boolean, groups: string[]): Entry[] {
  return child ? entries.filter(e => e.kind === 'live' && groups.includes(e.group)) : entries;
}
export function smartMatches(entries: Entry[], input: string): Entry[] {
  const norm = (s: string) => s.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i');
  const q = norm(input);
  const kind = /film|aksiyon/.test(q) ? 'movie' : /dizi/.test(q) ? 'series' : /kanal|spor|sport/.test(q) ? 'live' : null;
  const topic = /spor|sport/.test(q) ? /spor|sport|bein|s sport/ : /aksiyon|action/.test(q) ? /aksiyon|action/ : null;
  const words = q.replace(/bana|bul|getir|goster|kanallari|kanallarini|kanal|filmleri|filmlerini|film|dizileri|dizi/g, ' ').split(/\s+/).filter(Boolean);
  return entries.filter(e => (!kind || e.kind === kind) && (topic ? topic.test(norm(e.name+' '+e.group)) : words.every(w => norm(e.name+' '+e.group).includes(w))));
}
