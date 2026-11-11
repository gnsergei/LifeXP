import Dexie from 'dexie';
import { presetCategories, presetSkills, presetActivities, initialSettings } from '../data/presets.js';

export const db = new Dexie('LifeXP-v1');
db.version(1).stores({
  categories: '&id, name',
  skills: '&id, categoryId, name, archived',
  activities: '&id, skillId, archived',
  logs: '&id, activityId, skillId, categoryId, loggedAt',
  meta: '&id'
});

export async function initializeDatabase() {
  await db.transaction('rw', db.categories, db.skills, db.activities, db.meta, async () => {
    const marker = await db.meta.get('initialized');
    if (marker) return;
    await db.categories.bulkAdd(presetCategories);
    await db.skills.bulkAdd(presetSkills);
    await db.activities.bulkAdd(presetActivities);
    await db.meta.put(initialSettings);
    await db.meta.put({id:'initialized',schemaVersion:1});
  });
}

export function makeId() { return crypto.randomUUID(); }

export async function getSnapshot() {
  const [categories,skills,activities,logs,settings] = await Promise.all([
    db.categories.toArray(),db.skills.toArray(),db.activities.toArray(),db.logs.toArray(),db.meta.get('settings')
  ]);
  return {categories,skills,activities,logs,settings:settings || initialSettings};
}

export async function saveActivityLog({ id, activityId, duration, quantity, intensity, distanceKm, loadKg, notes, day }, calculateXP) {
  const activity = await db.activities.get(activityId);
  if (!activity) throw new Error('This activity no longer exists.');
  const skill = await db.skills.get(activity.skillId);
  const category = skill && await db.categories.get(skill.categoryId);
  if (!skill || !category) throw new Error('This activity has no valid skill or category.');
  const settings = await db.meta.get('settings') || initialSettings;
  const validDay = typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(new Date(`${day}T12:00:00`).getTime());
  if (!validDay) throw new Error('Choose a valid date.');
  if (!['light','standard','focused'].includes(intensity)) throw new Error('Choose a valid intensity.');
  const input = {duration:Number(duration)||0,quantity:Number(quantity)||0,intensity};
  if (['duration','training'].includes(activity.type) && !(input.duration > 0 && input.duration <= 240)) throw new Error('Duration must be between 1 and 240 minutes.');
  if (activity.type === 'quantity' && !(input.quantity > 0 && input.quantity <= 10000)) throw new Error('Quantity must be between 1 and 10,000.');
  const xp = calculateXP(activity,input,settings);
  const old = id && await db.logs.get(id);
  if (id && !old) throw new Error('This log was already deleted.');
  const entry = {
    id: old?.id || makeId(),activityId,skillId:skill.id,categoryId:category.id,
    activityName:activity.name,skillName:skill.name,categoryName:category.name,
    loggedAt:new Date(`${day}T12:00:00`).toISOString(),
    duration:['duration','training'].includes(activity.type)?input.duration:0,
    quantity:activity.type==='quantity'?input.quantity:0,
    intensity,distanceKm:activity.type==='training' ? (Math.max(0,Number(distanceKm)||0)) : 0,
    loadKg:activity.type==='training' ? (Math.max(0,Number(loadKg)||0)) : 0,
    notes:String(notes||'').slice(0,1000),xp,createdAt:old?.createdAt || new Date().toISOString()
  };
  await db.logs.put(entry);
  return entry;
}
