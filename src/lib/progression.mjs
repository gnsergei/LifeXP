/** Pure functions: XP, levels and time; safe to test without a browser. */
export const durationPoints = [[0,0],[15,5],[30,12],[45,20],[60,30],[90,40],[120,48],[180,56],[240,64]];
export const defaultRules = Object.freeze({ durationScale: 1, light: 0.85, standard: 1, focused: 1.15 });

export function durationBase(minutes) {
  const m = Math.max(0, Math.min(240, Number(minutes) || 0));
  for (let i = 1; i < durationPoints.length; i++) {
    const [rightMinutes,rightXP] = durationPoints[i];
    if (m <= rightMinutes) {
      const [leftMinutes,leftXP] = durationPoints[i-1];
      return leftXP + (rightXP-leftXP) * (m-leftMinutes)/(rightMinutes-leftMinutes);
    }
  }
  return 64;
}

export function computeXP(activity, input, rules = defaultRules) {
  if (!activity || !input) return 0;
  const kind = activity.type;
  const intensity = Math.max(0, Number(rules[input.intensity || 'standard']) || 1);
  let base = 0;
  if (kind === 'duration' || kind === 'training') {
    const minutes = Math.max(0, Number(input.duration) || 0);
    base = durationBase(minutes) * Math.max(0, Number(activity.xpMultiplier ?? 1)) * Math.max(0, Number(rules.durationScale ?? 1));
  } else if (kind === 'quantity') {
    base = Math.max(0, Number(input.quantity) || 0) * Math.max(0, Number(activity.xpPerUnit) || 0);
  } else if (kind === 'completion') {
    base = Math.max(0, Number(activity.completionXP) || 0);
  }
  return Math.max(0, Math.round(base * intensity));
}

export function thresholdForLevel(level, kind = 'character') {
  const n = Math.max(0, Math.floor(Number(level) || 1) - 1);
  const start = kind === 'skill' ? 50 : 100;
  const increment = kind === 'skill' ? 25 : 50;
  return n * start + increment * n * (n - 1) / 2;
}

export function levelInfo(totalXP, kind = 'character') {
  const xp = Math.max(0, Math.floor(Number(totalXP) || 0));
  let level = 1;
  while (level < 10000 && xp >= thresholdForLevel(level + 1, kind)) level++;
  const start = thresholdForLevel(level, kind);
  const end = thresholdForLevel(level + 1, kind);
  return { level, totalXP: xp, currentXP: xp - start, neededXP: end - start, nextXP: end - xp, percent: (xp - start) / (end - start) * 100 };
}

export function localDay(dateValue) {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

export function activitySummary(logs = []) {
  const totalXP = logs.reduce((sum, log) => sum + (Number(log.xp) || 0), 0);
  const minutes = logs.reduce((sum, log) => sum + (Number(log.duration) || 0), 0);
  return { totalXP, minutes, sessions: logs.length };
}

export function xpBySkill(logs = []) {
  const result = {};
  for (const log of logs) result[log.skillId] = (result[log.skillId] || 0) + (Number(log.xp) || 0);
  return result;
}
