import test from 'node:test';
import assert from 'node:assert/strict';
import { durationBase,computeXP,thresholdForLevel,levelInfo,activitySummary,xpBySkill,localDay,defaultRules } from '../src/lib/progression.mjs';

test('reading duration preset values match spec',()=>{
  assert.equal(durationBase(15),5);
  assert.equal(durationBase(30),12);
  assert.equal(durationBase(45),20);
  assert.equal(durationBase(60),30);
  assert.equal(durationBase(90),40);
  assert.equal(durationBase(120),48);
});
test('duration interpolation and cap',()=>{
  assert.equal(durationBase(0),0);
  assert.equal(durationBase(75),35);
  assert.equal(durationBase(1000),64);
});
test('duration XP responds to intensity and overrides',()=>{
  const activity={type:'duration',xpMultiplier:1};
  assert.equal(computeXP(activity,{duration:60,intensity:'standard'},defaultRules),30);
  assert.equal(computeXP(activity,{duration:60,intensity:'focused'},defaultRules),35);
  assert.equal(computeXP({...activity,xpMultiplier:2},{duration:60,intensity:'standard'},defaultRules),60);
});
test('quantity and completed actions receive XP',()=>{
  assert.equal(computeXP({type:'quantity',xpPerUnit:7},{quantity:3,intensity:'standard'}),21);
  assert.equal(computeXP({type:'completion',completionXP:25},{intensity:'standard'}),25);
});
test('character level thresholds rise gradually',()=>{
  assert.deepEqual([1,2,3,4,5].map(n=>thresholdForLevel(n)),[0,100,250,450,700]);
  assert.deepEqual([1,2,3,4,5].map(n=>thresholdForLevel(n,'skill')),[0,50,125,225,350]);
});
test('level progress recalculates from cumulative XP',()=>{
  assert.equal(levelInfo(99).level,1);
  assert.equal(levelInfo(100).level,2);
  assert.equal(levelInfo(249).nextXP,1);
  assert.equal(levelInfo(50,'skill').level,2);
});
test('activity summaries and skill totals use saved logs',()=>{
  const logs=[{xp:30,duration:60,skillId:'reading'},{xp:10,duration:15,skillId:'reading'},{xp:12,duration:30,skillId:'cardio'}];
  assert.deepEqual(activitySummary(logs),{totalXP:52,minutes:105,sessions:3});
  assert.deepEqual(xpBySkill(logs),{reading:40,cardio:12});
});
test('local day extraction uses local calendar day',()=>{
  assert.equal(localDay('2026-11-11T12:00:00'), '2026-11-11');
});
