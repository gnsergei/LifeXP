import { db, getSnapshot } from './db.js';

const MAX_BACKUP_BYTES = 12 * 1024 * 1024;
function ensure(condition, message) { if (!condition) throw new Error(`Invalid backup: ${message}`); }
function hasUniqueIds(array) {
  return array.every(x => x && typeof x.id === 'string' && x.id.length > 0 && x.id.length < 150) && new Set(array.map(x => x.id)).size === array.length;
}

export function validateBackup(payload) {
  ensure(payload && payload.app === 'LifeXP' && payload.version === 1, 'unrecognised format/version');
  const data = payload.data;
  ensure(data && typeof data === 'object', 'missing data');
  for (const name of ['categories','skills','activities','logs']) {
    ensure(Array.isArray(data[name]), `${name} missing`);
    ensure(data[name].length <= (name === 'logs' ? 50000 : 10000), `too many ${name}`);
    ensure(hasUniqueIds(data[name]), `invalid or repeated IDs in ${name}`);
  }
  const names = (arr)=>arr.every(x => typeof x.name === 'string' && x.name.length <= 150);
  ensure(names(data.categories) && names(data.skills) && names(data.activities), 'invalid names');
  const cats = new Set(data.categories.map(x=>x.id));
  const skills = new Map(data.skills.map(x=>[x.id,x]));
  const activities = new Map(data.activities.map(x=>[x.id,x]));
  ensure(data.skills.every(x=>cats.has(x.categoryId) && ['hard','soft','physical','creative','personal'].includes(x.tag) && typeof x.archived === 'boolean'), 'invalid skills');
  ensure(data.categories.every(x=>typeof x.color==='string' && /^#[0-9a-fA-F]{6}$/.test(x.color)), 'invalid category colours');
  ensure(data.activities.every(x=>skills.has(x.skillId) && ['duration','quantity','completion','training'].includes(x.type) && typeof x.archived==='boolean'), 'invalid activities');
  ensure(data.logs.every(x=>activities.has(x.activityId) && skills.has(x.skillId) && cats.has(x.categoryId) && Number.isFinite(x.xp) && x.xp >= 0 && Number.isFinite(x.duration) && x.duration>=0 && typeof x.loggedAt==='string' && !Number.isNaN(new Date(x.loggedAt).getTime())), 'invalid activity log');
  ensure(data.logs.every(x=>activities.get(x.activityId).skillId===x.skillId && skills.get(x.skillId).categoryId===x.categoryId), 'mismatched activity links');
  ensure(data.settings && typeof data.settings === 'object', 'missing XP settings');
  for (const key of ['durationScale','light','standard','focused']) ensure(Number.isFinite(data.settings[key]) && data.settings[key] >= 0.1 && data.settings[key] <= 5, `invalid ${key} rule`);
  return data;
}

export async function exportBackup() {
  const data = await getSnapshot();
  const payload = {app:'LifeXP',version:1,exportedAt:new Date().toISOString(),data};
  const blob = new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lifexp-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}

export async function restoreBackup(file) {
  if (!file || file.size > MAX_BACKUP_BYTES) throw new Error('Choose a LifeXP backup smaller than 12 MB.');
  const raw = await file.text();
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw new Error('This file is not valid JSON.'); }
  const data = validateBackup(parsed);
  // One transaction prevents partially applied backups if an error occurs.
  await db.transaction('rw',db.categories,db.skills,db.activities,db.logs,db.meta,async()=>{
    await Promise.all([db.categories.clear(),db.skills.clear(),db.activities.clear(),db.logs.clear()]);
    await db.categories.bulkPut(data.categories);
    await db.skills.bulkPut(data.skills);
    await db.activities.bulkPut(data.activities);
    await db.logs.bulkPut(data.logs);
    await db.meta.put({...data.settings,id:'settings'});
    await db.meta.put({id:'initialized',schemaVersion:1});
  });
  return data.logs.length;
}
