export interface PageSpec { pages: Set<number>; errors: string[] }

export function parsePages(text: string, valid: number[]): PageSpec {
  const known = new Set(valid);
  const lo = Math.min(...valid), hi = Math.max(...valid);
  const include = new Set<number>(), exclude = new Set<number>(), errors: string[] = [];
  const parts = text.toLowerCase().replace(/\s*(?:-|–|—|to)\s*/g, "-").replace(/!\s+/g, "!").split(/[,;\s]+/);
  for (const part of parts.map(p => p.replace(/^(!?)p(?:ages?|p)?\.?/, "$1")).filter(p => p && p !== "!")) {
    const m = part.match(/^(!)?(\d+)(?:-(\d+))?$/);
    if (!m) { errors.push(`can't read "${part}"`); continue; }
    let a = Number(m[2]), b = Number(m[3] ?? m[2]);
    if (a > b) [a, b] = [b, a];
    if (b < lo || a > hi) { errors.push(`${a === b ? `page ${a} isn't` : `pages ${a}-${b} aren't`} in the vocab (${lo}-${hi})`); continue; }
    if (a === b && !known.has(a)) { errors.push(`page ${a} has no vocab`); continue; }
    for (let p = Math.max(a, lo); p <= Math.min(b, hi); p++) if (known.has(p)) (m[1] ? exclude : include).add(p);
  }
  if (!include.size && exclude.size) for (const p of valid) include.add(p);
  for (const p of exclude) include.delete(p);
  return { pages: include, errors };
}
