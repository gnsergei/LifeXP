import { defaultRules } from '../lib/progression.mjs';

export const initialSettings = { id: 'settings', ...defaultRules };
const categoryData = [
  ['knowledge','Knowledge','#918bfa','book'],
  ['physical','Physical','#71c6a8','activity'],
  ['career','Career','#79b6f5','briefcase'],
  ['social','Social','#e5a4a3','message'],
  ['creativity','Creativity','#ebb879','palette'],
  ['personal','Personal','#b6a0e6','sun']
];
export const presetCategories = categoryData.map(([id,name,color,icon]) => ({id,name,color,icon,createdAt:'2026-01-01T00:00:00.000Z'}));

const skillData = [
  ['reading','knowledge','Reading','hard'],['languages','knowledge','Languages','hard'],
  ['research','knowledge','Research','hard'],['strength','physical','Strength','physical'],
  ['cardio','physical','Cardio','physical'],['mobility','physical','Mobility','physical'],
  ['programming','career','Programming','hard'],['career-learning','career','Professional Learning','hard'],
  ['communication','social','Communication','soft'],['public-speaking','social','Public Speaking','soft'],
  ['drawing','creativity','Drawing','creative'],['music','creativity','Music','creative'],
  ['content','creativity','Content Creation','creative'],['mindfulness','personal','Mindfulness','personal'],
  ['organisation','personal','Organisation','personal']
];
export const presetSkills = skillData.map(([id,categoryId,name,tag]) => ({id,categoryId,name,tag,archived:false,createdAt:'2026-01-01T00:00:00.000Z'}));

const activities = [
  ['read','reading','Read a book','duration'],['language','languages','Language practice','duration'],
  ['research','research','Research session','duration'],
  ['strength','strength','Strength workout','training'],['cycle','cardio','Cycling','training'],
  ['walk','cardio','Walking','training'],['stretch','mobility','Stretching','duration'],
  ['code','programming','Coding practice','duration'],['lesson','career-learning','Complete a lesson','completion'],
  ['learn','career-learning','Study session','duration'],
  ['conversation','communication','Meaningful conversation','duration'],
  ['speech','public-speaking','Public speaking practice','duration'],
  ['sketch','drawing','Drawing practice','duration'],['guitar','music','Music practice','duration'],
  ['make-content','content','Create content','duration'],
  ['journal','mindfulness','Journaling','duration'],['meditate','mindfulness','Meditation','duration'],
  ['organise','organisation','Organise a space','duration'],['tidy','organisation','Complete a home task','completion']
];
export const presetActivities = activities.map(([id,skillId,name,type]) => ({
  id,skillId,name,type,unit:'times',defaultMinutes:30,xpMultiplier:1,xpPerUnit:5,completionXP:25,archived:false,createdAt:'2026-01-01T00:00:00.000Z'
}));
