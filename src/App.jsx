import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Zap, LayoutDashboard, Layers3, ChartNoAxesColumnIncreasing, Settings2, Plus, X,
  BookOpen, Activity, BriefcaseBusiness, MessageCircle, Palette, Sun, Target,
  ArrowUpRight, Clock3, Check, CheckCircle2, Pencil, Trash2, Download, Upload,
  ShieldCheck, ChevronRight, CalendarDays, Sparkles, RotateCcw, Archive,
  Database, TrendingUp, AlertTriangle, Save, Info, ListFilter
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import { db, initializeDatabase, makeId, saveActivityLog } from './lib/db.js';
import { computeXP, levelInfo, localDay, activitySummary, xpBySkill } from './lib/progression.mjs';
import { exportBackup, restoreBackup } from './lib/backup.js';

const ICONS = {book:BookOpen,activity:Activity,briefcase:BriefcaseBusiness,message:MessageCircle,palette:Palette,sun:Sun};
const NAV = [{id:'dashboard',label:'Dashboard',Icon:LayoutDashboard},{id:'skills',label:'My Skills',Icon:Layers3},{id:'statistics',label:'Statistics',Icon:ChartNoAxesColumnIncreasing},{id:'settings',label:'Settings',Icon:Settings2}];
const number = value => new Intl.NumberFormat('en-US').format(value || 0);
const dateLabel = iso => new Date(iso).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
const humanTime = mins => mins >= 60 ? `${Math.floor(mins/60)}h ${Math.round(mins%60)}m` : `${Math.round(mins)}m`;
const badgeText = kind => ({duration:'Time',training:'Training',quantity:'Quantity',completion:'One-time'}[kind] || kind);
const nowISO = () => new Date().toISOString();

function Progress({percent,color='var(--violet)',height=7}) {
  return <div className="progress-track" style={{height}}><span style={{width:`${Math.max(0,Math.min(100,percent))}%`,background:color}}/></div>;
}
function Empty({icon:Icon=Target,title,description,action}) {
  return <div className="empty"><Icon size={27}/><strong>{title}</strong><p>{description}</p>{action}</div>;
}
function Modal({title,subtitle,onClose,children}) {
  useEffect(()=>{ const close=e=>{if(e.key==='Escape') onClose();}; document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close);},[onClose]);
  return <div className="modal-scrim" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className="modal-card" role="dialog" aria-modal="true" aria-label={title}>
      <header className="modal-header"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button className="icon-btn" aria-label="Close" onClick={onClose}><X size={19}/></button></header>
      <div className="modal-body">{children}</div>
    </div>
  </div>;
}
function CategoryIcon({category,size=19}) {const Icon=ICONS[category?.icon] || Target;return <Icon size={size} style={{color:category?.color || '#918bfa'}}/>;}

function LogEditor({all,editing,initialActivityId,onClose,onSuccess}) {
  const options=all.activities.filter(a=>!a.archived && all.skills.some(s=>s.id===a.skillId&&!s.archived));
  const fallback=options[0]?.id || '';
  const [activityId,setActivityId]=useState(editing?.activityId || initialActivityId || fallback);
  const activity=all.activities.find(a=>a.id===activityId);
  const [day,setDay]=useState(editing?localDay(editing.loggedAt):localDay(new Date()));
  const [duration,setDuration]=useState(editing?.duration || activity?.defaultMinutes || 30);
  const [quantity,setQuantity]=useState(editing?.quantity || 1);
  const [intensity,setIntensity]=useState(editing?.intensity || 'standard');
  const [distanceKm,setDistanceKm]=useState(editing?.distanceKm || '');
  const [loadKg,setLoadKg]=useState(editing?.loadKg || '');
  const [notes,setNotes]=useState(editing?.notes || '');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const skill=all.skills.find(s=>s.id===activity?.skillId);
  const category=all.categories.find(c=>c.id===skill?.categoryId);
  const xp=computeXP(activity,{duration,quantity,intensity},all.settings);
  const changeActivity=(newId)=>{setActivityId(newId);setDuration(all.activities.find(a=>a.id===newId)?.defaultMinutes||30);};
  async function submit(e) {
    e.preventDefault();setBusy(true);setError('');
    try {const entry=await saveActivityLog({id:editing?.id,activityId,day,duration,quantity,intensity,distanceKm,loadKg,notes},computeXP);onSuccess(editing?`Updated · ${entry.xp} XP`:`Saved · +${entry.xp} XP`);onClose();}
    catch(err){setError(err.message);}finally{setBusy(false);}
  }
  return <Modal title={editing?'Edit activity':'Log an activity'} subtitle="Small steps add up. Every session counts." onClose={onClose}>
    <form onSubmit={submit} className="form-stack">
      <label className="field">Activity
        <select value={activityId} onChange={e=>changeActivity(e.target.value)} required>
          {all.categories.map(c=><optgroup key={c.id} label={c.name}>
            {all.activities.filter(a=>{const s=all.skills.find(s=>s.id===a.skillId);return s?.categoryId===c.id && ((!a.archived&&!s.archived)||a.id===editing?.activityId);}).map(a=><option key={a.id} value={a.id}>{all.skills.find(s=>s.id===a.skillId)?.name} · {a.name}</option>)}
          </optgroup>)}
        </select>
      </label>
      <div className="tag-row"><span className="tag muted-tag"><CategoryIcon category={category} size={14}/>{skill?.name||'Skill'}</span><span className="tag muted-tag">{badgeText(activity?.type)}</span></div>
      {['duration','training'].includes(activity?.type) && <label className="field">Duration (minutes)
        <input type="number" min="1" max="240" step="1" value={duration} onChange={e=>setDuration(e.target.value)} required/>
      </label>}
      {activity?.type==='quantity' && <label className="field">Quantity ({activity.unit || 'times'})
        <input type="number" min="1" max="10000" step="1" value={quantity} onChange={e=>setQuantity(e.target.value)} required/>
      </label>}
      {activity?.type==='training' && <div className="two-fields">
        <label className="field">Distance (km) <span className="optional">optional</span><input type="number" min="0" max="10000" step="0.1" value={distanceKm} onChange={e=>setDistanceKm(e.target.value)} placeholder="e.g. 5"/></label>
        <label className="field">Weight / load (kg) <span className="optional">optional</span><input type="number" min="0" max="10000" step="0.5" value={loadKg} onChange={e=>setLoadKg(e.target.value)} placeholder="e.g. 40"/></label>
      </div>}
      <div className="field"><span>Intensity / focus</span><div className="segment">
        {[['light','Light'],['standard','Standard'],['focused','Focused']].map(([value,label])=><button type="button" key={value} className={intensity===value?'selected':''} onClick={()=>setIntensity(value)}>{label}</button>)}
      </div></div>
      <div className="two-fields"><label className="field">Date<input type="date" value={day} max={localDay(new Date())} onChange={e=>setDay(e.target.value)} required/></label><label className="field">Notes <span className="optional">optional</span><input maxLength={1000} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="How did it go?"/></label></div>
      <div className="xp-preview"><div><span>XP for this activity</span><strong>+{xp} XP</strong></div><Zap size={26}/></div>
      {error&&<div className="form-error"><AlertTriangle size={16}/>{error}</div>}
      <button type="submit" className="btn primary full" disabled={busy || !activity}><Check size={17}/>{busy?'Saving…':editing?'Update activity':'Log activity'}</button>
    </form>
  </Modal>;
}

function SkillEditor({all,editing,defaultCategoryId,onClose,onSuccess}) {
  const [name,setName]=useState(editing?.name||'');
  const [categoryId,setCategoryId]=useState(editing?.categoryId||defaultCategoryId||all.categories[0]?.id||'');
  const [tag,setTag]=useState(editing?.tag||'hard');
  const [archived,setArchived]=useState(Boolean(editing?.archived));
  const [busy,setBusy]=useState(false);
  async function submit(e) {
    e.preventDefault();setBusy(true);
    try {await db.skills.put({id:editing?.id||makeId(),name:name.trim().slice(0,100),categoryId,tag,archived,createdAt:editing?.createdAt||nowISO()});onSuccess(editing?'Skill updated':'Skill created');onClose();}
    catch(e){onSuccess(`Could not save: ${e.message}`,true);}finally{setBusy(false);}
  }
  return <Modal title={editing?'Edit skill':'New skill'} onClose={onClose} subtitle="Skills grow from logged activities."><form className="form-stack" onSubmit={submit}>
    <label className="field">Skill name<input value={name} maxLength={100} onChange={e=>setName(e.target.value)} placeholder="e.g. Photography" required/></label>
    <label className="field">Category<select value={categoryId} onChange={e=>setCategoryId(e.target.value)} required>{all.categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <label className="field">Skill tag<select value={tag} onChange={e=>setTag(e.target.value)}><option value="hard">Hard skill</option><option value="soft">Soft skill</option><option value="physical">Physical</option><option value="creative">Creative</option><option value="personal">Personal</option></select></label>
    {editing&&<label className="checkline"><input type="checkbox" checked={archived} onChange={e=>setArchived(e.target.checked)}/>Archive this skill (keeps all history)</label>}
    <button className="btn primary full" disabled={busy||!name.trim()||!categoryId}><Save size={17}/>{editing?'Save changes':'Create skill'}</button>
  </form></Modal>;
}

function CategoryEditor({editing,onClose,onSuccess}) {
  const [name,setName]=useState(editing?.name||'');
  const [color,setColor]=useState(editing?.color||'#918bfa');
  const [icon,setIcon]=useState(editing?.icon||'book');
  async function submit(e) {
    e.preventDefault();
    try {await db.categories.put({id:editing?.id||makeId(),name:name.trim().slice(0,100),color,icon,createdAt:editing?.createdAt||nowISO()});onSuccess(editing?'Category updated':'Category created');onClose();}
    catch(e){onSuccess(`Could not save: ${e.message}`,true);}
  }
  return <Modal title={editing?'Edit category':'New category'} onClose={onClose}><form className="form-stack" onSubmit={submit}>
    <label className="field">Category name<input value={name} onChange={e=>setName(e.target.value)} maxLength={100} placeholder="e.g. Wellness" required/></label>
    <div className="two-fields"><label className="field">Accent colour<input type="color" className="color-input" value={color} onChange={e=>setColor(e.target.value)}/></label>
      <label className="field">Icon<select value={icon} onChange={e=>setIcon(e.target.value)}>{Object.keys(ICONS).map(x=><option key={x} value={x}>{x[0].toUpperCase()+x.slice(1)}</option>)}</select></label></div>
    <button className="btn primary full" disabled={!name.trim()}><Save size={17}/>{editing?'Save changes':'Create category'}</button>
  </form></Modal>;
}

function ActivityEditor({all,editing,defaultSkillId,onClose,onSuccess}) {
  const [name,setName]=useState(editing?.name||'');
  const [skillId,setSkillId]=useState(editing?.skillId||defaultSkillId||all.skills.find(s=>!s.archived)?.id||'');
  const [type,setType]=useState(editing?.type||'duration');
  const [defaultMinutes,setDefaultMinutes]=useState(editing?.defaultMinutes??30);
  const [xpMultiplier,setMultiplier]=useState(editing?.xpMultiplier??1);
  const [xpPerUnit,setXpPerUnit]=useState(editing?.xpPerUnit??5);
  const [completionXP,setCompletionXP]=useState(editing?.completionXP??25);
  const [unit,setUnit]=useState(editing?.unit||'times');
  const [archived,setArchived]=useState(Boolean(editing?.archived));
  async function submit(e) {
    e.preventDefault();
    if (!name.trim()||!skillId) return;
    const record={id:editing?.id||makeId(),skillId,name:name.trim().slice(0,100),type,
      defaultMinutes:Number(defaultMinutes),xpMultiplier:Number(xpMultiplier),xpPerUnit:Number(xpPerUnit),
      completionXP:Number(completionXP),unit:unit.trim().slice(0,30)||'times',archived,createdAt:editing?.createdAt||nowISO()};
    try {await db.activities.put(record);onSuccess(editing?'Activity updated':'Activity created');onClose();}
    catch(e){onSuccess(`Could not save: ${e.message}`,true);}
  }
  return <Modal title={editing?'Edit activity':'Create activity'} onClose={onClose} subtitle="Define how this activity earns experience."><form className="form-stack" onSubmit={submit}>
    <label className="field">Activity name<input value={name} maxLength={100} onChange={e=>setName(e.target.value)} required placeholder="e.g. Practise guitar"/></label>
    <label className="field">Belongs to skill<select value={skillId} required onChange={e=>setSkillId(e.target.value)}>{all.skills.filter(s=>!s.archived||s.id===editing?.skillId).map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label>
    <label className="field">Tracking method<select value={type} onChange={e=>setType(e.target.value)}><option value="duration">Duration · minutes</option><option value="training">Training · minutes, optional distance/weight</option><option value="quantity">Quantity · units completed</option><option value="completion">Completion · fixed XP</option></select></label>
    {['duration','training'].includes(type)&&<div className="two-fields">
      <label className="field">Default session (min)<input type="number" min="1" max="240" value={defaultMinutes} onChange={e=>setDefaultMinutes(e.target.value)} required/></label>
      <label className="field">XP multiplier<input type="number" step="0.05" min="0.1" max="5" value={xpMultiplier} onChange={e=>setMultiplier(e.target.value)} required/></label>
    </div>}
    {type==='quantity'&&<div className="two-fields"><label className="field">Unit<input value={unit} onChange={e=>setUnit(e.target.value)} placeholder="pages, times, tasks" maxLength={30} required/></label><label className="field">XP per unit<input type="number" min="1" max="1000" step="1" value={xpPerUnit} onChange={e=>setXpPerUnit(e.target.value)} required/></label></div>}
    {type==='completion'&&<label className="field">XP per completion<input type="number" min="1" max="1000" step="1" value={completionXP} onChange={e=>setCompletionXP(e.target.value)} required/></label>}
    {editing&&<label className="checkline"><input type="checkbox" checked={archived} onChange={e=>setArchived(e.target.checked)}/>Archive activity (preserves history)</label>}
    <div className="helper"><Info size={15}/>Changing an activity's XP rule affects new logs, not previously earned XP.</div>
    <button className="btn primary full" disabled={!name.trim()||!skillId}><Save size={17}/>{editing?'Save changes':'Create activity'}</button>
  </form></Modal>;
}

function Metric({icon:Icon,label,value,foot}) {return <div className="metric card"><div className="metric-icon"><Icon size={18}/></div><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-foot">{foot}</div></div>;}

function Dashboard({all,logAction,navigate}) {
  const sorted=[...all.logs].sort((a,b)=>new Date(b.loggedAt)-new Date(a.loggedAt)||new Date(b.createdAt)-new Date(a.createdAt));
  const summary=activitySummary(all.logs);
  const level=levelInfo(summary.totalXP);
  const skillTotals=xpBySkill(all.logs);
  const weekDays=Array.from({length:7},(_,i)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-i);return localDay(d);});
  const weekLogs=all.logs.filter(log=>weekDays.includes(localDay(log.loggedAt)));
  const weekSummary=activitySummary(weekLogs);
  const today=all.logs.filter(log=>localDay(log.loggedAt)===localDay(new Date()));
  const skillCards=all.skills.filter(s=>!s.archived).map(s=>({...s,totalXP:skillTotals[s.id]||0,level:levelInfo(skillTotals[s.id]||0,'skill'),category:all.categories.find(c=>c.id===s.categoryId)})).sort((a,b)=>b.totalXP-a.totalXP || a.name.localeCompare(b.name)).slice(0,4);
  const quickActivities=all.activities.filter(a=>!a.archived && all.skills.find(s=>s.id===a.skillId&&!s.archived)).slice(0,6);
  return <div className="page-stack">
    <div className="page-head"><div><div className="eyebrow">YOUR PERSONAL PROGRESSION</div><h1>Keep building yourself.</h1><p>Every effort counts. Every skill grows.</p></div><button className="btn primary" onClick={()=>logAction()}><Plus size={18}/>Log activity</button></div>
    <div className="hero card"><div className="hero-left"><span className="eyebrow light">CHARACTER PROGRESS</span><div className="hero-level">Level <span>{level.level}</span></div><p>Your progress is made of real actions.</p><div className="hero-xp-row"><strong>{number(level.currentXP)} / {number(level.neededXP)} XP</strong><span>{number(level.nextXP)} to next level</span></div><Progress percent={level.percent} color="#cbc7ff" height={9}/></div><div className="hero-symbol"><Zap size={70}/></div></div>
    <div className="metric-grid"><Metric icon={Zap} label="Total experience" value={`${number(summary.totalXP)} XP`} foot="All-time progress"/><Metric icon={CheckCircle2} label="Today's activity" value={`${today.length} sessions`} foot={`${number(activitySummary(today).totalXP)} XP earned today`}/><Metric icon={Clock3} label="Last 7 days" value={humanTime(weekSummary.minutes)} foot={`${weekSummary.sessions} sessions completed`}/><Metric icon={TrendingUp} label="Active skills" value={Object.values(skillTotals).filter(x=>x>0).length} foot="Skills you've practised"/></div>
    <div className="section-heading"><div><h2>Your skills</h2><p>Levels are earned through practice.</p></div><button className="text-btn" onClick={()=>navigate('skills')}>View all <ChevronRight size={16}/></button></div>
    {skillCards.length>0?<div className="skill-grid">{skillCards.map(s=><div className="skill-card card" key={s.id}><div className="skill-top"><span className="skill-symbol" style={{background:`${s.category?.color || '#918bfa'}22`}}><CategoryIcon category={s.category} size={21}/></span><span className="level-pill">LVL {s.level.level}</span></div><strong>{s.name}</strong><span className="subtle">{s.category?.name} · {s.tag} skill</span><Progress percent={s.level.percent} color={s.category?.color}/><div className="skill-meta"><span>{number(s.totalXP)} XP earned</span><span>{Math.ceil(s.level.percent)}%</span></div></div>)}</div>:<Empty title="No skills yet" description="Create a skill to begin your journey."/>}
    <div className="dashboard-bottom"><section className="card panel"><div className="section-heading tight"><h2>Quick log</h2><span className="muted-small">Your starter activities</span></div><div className="quick-list">{quickActivities.length?quickActivities.map(a=><button className="quick-activity" key={a.id} onClick={()=>logAction(a.id)}><span className="quick-plus"><Plus size={17}/></span><span>{a.name}<small>{all.skills.find(s=>s.id===a.skillId)?.name}</small></span><ChevronRight size={15}/></button>):<p className="subtle">Create an activity to get started.</p>}</div></section>
      <section className="card panel"><div className="section-heading tight"><h2>Recent activity</h2><button className="text-btn" onClick={()=>navigate('statistics')}>History <ChevronRight size={15}/></button></div><div className="recent-list">{sorted.length?sorted.slice(0,6).map(log=><div className="recent-item" key={log.id}><span className="recent-dot"><Check size={14}/></span><div><strong>{log.activityName}</strong><small>{dateLabel(log.loggedAt)} · {log.duration?humanTime(log.duration):log.quantity?`${log.quantity} units`:'Completed'}</small></div><b>+{log.xp} XP</b></div>):<Empty title="Nothing logged yet" description="Your first activity will appear here."/>}</div></section></div>
  </div>;
}

function SkillsPage({all,logAction,openEditor}) {
  const [filter,setFilter]=useState('all');
  const skillTotals=xpBySkill(all.logs);
  const visible=all.skills.filter(s=>!s.archived && (filter==='all'||s.categoryId===filter));
  return <div className="page-stack"><div className="page-head"><div><div className="eyebrow">SKILL LIBRARY</div><h1>My Skills</h1><p>Customise your own areas of growth.</p></div><div className="head-actions"><button className="btn outline" onClick={()=>openEditor({kind:'category'})}><Plus size={17}/>Category</button><button className="btn primary" onClick={()=>openEditor({kind:'skill'})}><Plus size={17}/>New skill</button></div></div>
    <div className="category-strip"><button className={`filter-chip ${filter==='all'?'active':''}`} onClick={()=>setFilter('all')}>All skills</button>{all.categories.map(c=><div className="category-chip" key={c.id}><button className={`filter-chip ${filter===c.id?'active':''}`} onClick={()=>setFilter(c.id)}><CategoryIcon category={c} size={14}/>{c.name}</button><button className="category-edit" title={`Edit ${c.name} category`} onClick={()=>openEditor({kind:'category',editing:c})}><Pencil size={12}/></button></div>)}</div>
    <div className="skills-list">{visible.length?visible.map(s=>{
      const cat=all.categories.find(c=>c.id===s.categoryId);
      const level=levelInfo(skillTotals[s.id]||0,'skill');
      const activities=all.activities.filter(a=>a.skillId===s.id && !a.archived);
      return <section className="skill-detail card" key={s.id}><div className="skill-detail-head"><div className="skill-heading"><span className="skill-symbol large" style={{background:`${cat?.color||'#918bfa'}22`}}><CategoryIcon category={cat} size={24}/></span><div><h3>{s.name}</h3><p>{cat?.name} · {s.tag} skill</p></div></div><div className="skill-detail-controls"><span className="level-pill">Level {level.level}</span><button className="icon-btn" aria-label={`Edit ${s.name}`} onClick={()=>openEditor({kind:'skill',editing:s})}><Pencil size={16}/></button></div></div><div className="skill-progress"><Progress percent={level.percent} color={cat?.color}/><div className="skill-meta"><span>{number(skillTotals[s.id]||0)} XP total</span><span>{number(level.nextXP)} XP to level {level.level+1}</span></div></div><div className="activity-chips">{activities.map(a=><div className="activity-chip" key={a.id}><button title={`Log ${a.name}`} onClick={()=>logAction(a.id)}><Plus size={13}/>{a.name}</button><button title={`Edit ${a.name}`} className="chip-edit" aria-label={`Edit ${a.name}`} onClick={()=>openEditor({kind:'activity',editing:a})}><Pencil size={13}/></button></div>)}<button className="add-activity" onClick={()=>openEditor({kind:'activity',skillId:s.id})}><Plus size={14}/> New activity</button></div></section>;
    }):<Empty icon={Layers3} title="No active skills in this category" description="Add a custom skill or choose another category." action={<button className="btn outline" onClick={()=>openEditor({kind:'skill',categoryId:filter==='all'?undefined:filter})}>Add skill</button>}/> }</div>
  </div>;
}

function StatisticsPage({all,editLog,onSuccess}) {
  const [range,setRange]=useState('7');
  const sorted=[...all.logs].sort((a,b)=>new Date(b.loggedAt)-new Date(a.loggedAt)||new Date(b.createdAt)-new Date(a.createdAt));
  const days=Number(range);
  const dayList=Array.from({length:days},(_,i)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-(days-1-i));return localDay(d);});
  const visible=all.logs.filter(l=>dayList.includes(localDay(l.loggedAt)));
  const total=activitySummary(visible);
  const totalsByDay=new Map(dayList.map(day=>[day,0]));
  for (const l of visible) totalsByDay.set(localDay(l.loggedAt),(totalsByDay.get(localDay(l.loggedAt))||0)+l.xp);
  const chartData=dayList.map(day=>({day:days===7?new Date(`${day}T12:00:00`).toLocaleDateString(undefined,{weekday:'short'}):day.slice(5),xp:totalsByDay.get(day)||0}));
  const categoryTotals=all.categories.map(c=>({category:c,xp:visible.filter(l=>l.categoryId===c.id).reduce((sum,l)=>sum+l.xp,0)})).sort((a,b)=>b.xp-a.xp);
  const heatmap=Array.from({length:35},(_,i)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-(34-i));const key=localDay(d);return {day:key,xp:all.logs.filter(l=>localDay(l.loggedAt)===key).reduce((n,l)=>n+l.xp,0)};});
  async function deleteLog(log) {
    if (!window.confirm(`Delete “${log.activityName}” (+${log.xp} XP)? Your levels will recalculate.`)) return;
    try {await db.logs.delete(log.id);onSuccess('Entry deleted. Progress recalculated.');} catch(e){onSuccess(e.message,true);}
  }
  return <div className="page-stack"><div className="page-head"><div><div className="eyebrow">YOUR PROGRESS, VISUALISED</div><h1>Statistics</h1><p>Measure time, consistency and earned experience.</p></div><select className="range-select" aria-label="Statistics date range" value={range} onChange={e=>setRange(e.target.value)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></div>
    <div className="stat-pills"><div className="card compact-stat"><span>XP earned</span><strong>{number(total.totalXP)}</strong></div><div className="card compact-stat"><span>Time invested</span><strong>{humanTime(total.minutes)}</strong></div><div className="card compact-stat"><span>Activities logged</span><strong>{number(total.sessions)}</strong></div></div>
    <div className="stats-panels"><section className="card panel"><div className="section-heading tight"><div><h2>Experience over time</h2><p>XP earned per day</p></div><TrendingUp size={18} className="dimmed"/></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{top:12,right:4,left:-26,bottom:0}}><CartesianGrid stroke="#303646" vertical={false} strokeDasharray="4 6"/><XAxis dataKey="day" stroke="#848c9e" tickLine={false} axisLine={false} fontSize={11} interval={days===90?13:days===30?5:0}/><YAxis stroke="#848c9e" tickLine={false} axisLine={false} fontSize={11} allowDecimals={false}/><Tooltip contentStyle={{background:'#1b2030',border:'1px solid #3b4254',borderRadius:12,color:'#fff'}} cursor={{fill:'rgba(151,144,244,.08)'}}/><Bar dataKey="xp" fill="#918bfa" name="XP" radius={[5,5,0,0]} maxBarSize={35}/></BarChart></ResponsiveContainer></div></section>
    <section className="card panel"><div className="section-heading tight"><div><h2>By category</h2><p>Where your effort goes</p></div></div><div className="category-totals">{categoryTotals.map(({category,xp})=><div className="cat-total" key={category.id}><div><CategoryIcon category={category} size={17}/><span>{category.name}</span><strong>{number(xp)} XP</strong></div><Progress percent={total.totalXP?xp/total.totalXP*100:0} color={category.color} height={6}/></div>)}</div></section></div>
    <section className="card panel"><div className="section-heading tight"><div><h2>Consistency calendar</h2><p>Last 35 days — darker means more XP.</p></div><span className="muted-small">Practice, not perfection</span></div><div className="heatmap" aria-label="35-day activity heatmap">{heatmap.map(d=><div key={d.day} className="heatmap-cell" title={`${d.day}: ${d.xp} XP`} style={{background:d.xp===0?'#292f3d':d.xp<15?'#504e80':d.xp<40?'#7570b7':'#aaa3ff'}}/>)}</div><div className="heatmap-key">Less <span style={{background:'#292f3d'}}/><span style={{background:'#504e80'}}/><span style={{background:'#7570b7'}}/><span style={{background:'#aaa3ff'}}/> More</div></section>
    <section className="card panel"><div className="section-heading tight"><div><h2>Activity history</h2><p>Edit or remove incorrect entries; XP updates automatically.</p></div><span className="muted-small">{sorted.length} entries</span></div>
      {sorted.length?<div className="history-list">{sorted.map(l=><div key={l.id} className="history-row"><span className="history-icon"><Check size={16}/></span><div className="history-name"><strong>{l.activityName}</strong><small>{dateLabel(l.loggedAt)} · {l.skillName} · {l.duration?humanTime(l.duration):l.quantity?`${l.quantity} units`:'Completed'}{l.notes?` · ${l.notes}`:''}</small></div><strong className="xp-amount">+{l.xp}</strong><button className="icon-btn" aria-label={`Edit ${l.activityName} log`} onClick={()=>editLog(l)}><Pencil size={16}/></button><button className="icon-btn danger-icon" aria-label={`Delete ${l.activityName} log`} onClick={()=>deleteLog(l)}><Trash2 size={16}/></button></div>)}</div>:<Empty title="No history yet" description="Activities will appear here after you log them."/>}</section>
  </div>;
}

function SettingsPage({all,onSuccess}) {
  const [values,setValues]=useState(all.settings);
  const importRef=useRef(null);
  const [busy,setBusy]=useState(false);
  useEffect(()=>setValues(all.settings),[all.settings]);
  const update=(key,value)=>setValues(v=>({...v,[key]:value}));
  async function saveRules(e) {
    e.preventDefault();
    const rules={id:'settings'};
    for (const key of ['durationScale','light','standard','focused']) {
      const val=Number(values[key]);
      if (!Number.isFinite(val)||val<0.1||val>5) return onSuccess('All XP multipliers must be between 0.1 and 5.',true);
      rules[key]=val;
    }
    try {await db.meta.put(rules);onSuccess('XP settings saved. Future logs will use the new rules.');}catch(e){onSuccess(e.message,true);}
  }
  async function importFile(file) {
    if (!file) return;
    if (!window.confirm('Restore this backup? It will REPLACE all current skills, activities and progress. Export your current data first if needed.')) return;
    setBusy(true);
    try {const count=await restoreBackup(file);onSuccess(`Backup restored · ${count} saved activities.`);}
    catch(e){onSuccess(e.message,true);}finally{setBusy(false);if(importRef.current)importRef.current.value='';}
  }
  async function resetData() {
    if (!window.confirm('Reset all activity history, custom skills and settings? This cannot be undone without a backup.')) return;
    if (!window.confirm('Final confirmation: permanently delete ALL LifeXP progress in this browser?')) return;
    try {await db.transaction('rw',db.categories,db.skills,db.activities,db.logs,db.meta,async()=>{await db.categories.clear();await db.skills.clear();await db.activities.clear();await db.logs.clear();await db.meta.clear();});await initializeDatabase();onSuccess('LifeXP reset to starter presets.');}
    catch(e){onSuccess(e.message,true);}
  }
  return <div className="page-stack"><div className="page-head"><div><div className="eyebrow">MAKE IT YOUR OWN</div><h1>Settings</h1><p>Control XP rules, privacy and data backups.</p></div></div>
    <div className="settings-grid"><section className="card panel"><div className="section-heading tight"><div><h2>XP balancing</h2><p>Adjust rewards for newly logged activities.</p></div><Zap size={19} className="dimmed"/></div><form className="form-stack" onSubmit={saveRules}><label className="field">Duration XP scale <small>1.0 = default rewards</small><input type="number" min="0.1" max="5" step="0.05" value={values.durationScale} onChange={e=>update('durationScale',e.target.value)} required/></label><div className="two-fields"><label className="field">Light focus<input type="number" min="0.1" max="5" step="0.05" value={values.light} onChange={e=>update('light',e.target.value)} required/></label><label className="field">Standard focus<input type="number" min="0.1" max="5" step="0.05" value={values.standard} onChange={e=>update('standard',e.target.value)} required/></label></div><label className="field">Focused / hard<input type="number" min="0.1" max="5" step="0.05" value={values.focused} onChange={e=>update('focused',e.target.value)} required/></label><div className="helper"><Info size={16}/>Past logs retain their awarded XP unless edited.</div><button className="btn primary" type="submit"><Save size={17}/>Save XP rules</button></form></section>
    <section className="card panel"><div className="section-heading tight"><div><h2>Backups & privacy</h2><p>Your progression stays on this device.</p></div><ShieldCheck size={19} className="dimmed"/></div><div className="backup-info"><Database size={20}/><div><strong>Saved automatically</strong><p>IndexedDB · Browser-local storage</p></div><span className="status-dot"/></div><p className="explainer">Your activities save instantly when you log them. GitHub Pages serves the app; it does not receive your progress. Other browsers and devices have separate data.</p><div className="form-stack"><button className="btn outline full" onClick={async()=>{try {await exportBackup();onSuccess('Backup downloaded. Keep it somewhere safe.');}catch(e){onSuccess(e.message,true);}}}><Download size={18}/>Export JSON backup</button><input type="file" ref={importRef} hidden accept=".json,application/json" onChange={e=>importFile(e.target.files?.[0])}/><button className="btn outline full" disabled={busy} onClick={()=>importRef.current?.click()}><Upload size={18}/>{busy?'Restoring…':'Restore JSON backup'}</button><div className="helper"><AlertTriangle size={16}/>Browser data can be lost if you clear site data or lose the device. Back up periodically.</div></div></section></div>
    <section className="card panel danger-panel"><div><h2>Reset LifeXP</h2><p>Remove all your progress and return to the original starter presets.</p></div><button className="btn danger" onClick={resetData}><RotateCcw size={17}/>Reset all data</button></section>
  </div>;
}

export default function App() {
  const [page,setPage]=useState('dashboard');
  const [editor,setEditor]=useState(null);
  const [toast,setToast]=useState(null);
  const [initError,setInitError]=useState('');
  const all=useLiveQuery(async()=>{
    const [categories,skills,activities,logs,settings] = await Promise.all([
      db.categories.toArray(),db.skills.toArray(),db.activities.toArray(),db.logs.toArray(),db.meta.get('settings')
    ]);
    return {categories,skills,activities,logs,settings:settings||{id:'settings',durationScale:1,light:.85,standard:1,focused:1.15}};
  },[],null);
  useEffect(()=>{initializeDatabase().catch(e=>setInitError(e.message||String(e)));},[]);
  useEffect(()=>{if(!toast)return;const id=setTimeout(()=>setToast(null),4200);return()=>clearTimeout(id);},[toast]);
  const notify=(message,error=false)=>setToast({message,error,id:Date.now()});
  const openLog=(activityId)=>setEditor({kind:'log',activityId});
  const openEditLog=(log)=>setEditor({kind:'log',editing:log});
  const close=()=>setEditor(null);
  if(initError) return <main className="fatal"><AlertTriangle size={35}/><h1>Could not open LifeXP storage</h1><p>{initError}</p><p>Try a normal browsing window, make sure your browser allows site data, then reload.</p></main>;
  if(!all) return <main className="loading"><div className="brand-symbol"><Zap size={27}/></div><h2>Opening LifeXP…</h2></main>;
  return <div className="app-shell"><aside className="sidebar"><div className="brand"><span className="brand-symbol"><Zap size={23}/></span><div><strong>LifeXP</strong><small>Every action counts.</small></div></div><div className="nav-caption">WORKSPACE</div><nav className="nav-list" aria-label="Main navigation">{NAV.map(n=><button key={n.id} className={`nav-link ${page===n.id?'active':''}`} onClick={()=>setPage(n.id)}><n.Icon size={18}/>{n.label}{page===n.id&&<span className="nav-indicator"/>}</button>)}</nav><div className="sidebar-spacer"/><div className="sidebar-note"><span><ShieldCheck size={16}/>LOCAL & PRIVATE</span><p>Your progress is saved on this device, automatically.</p></div><div className="sidebar-bottom">LifeXP <span>v0.1</span></div></aside>
    <div className="main-area"><header className="topbar"><div className="topbar-path">LIFEXP <ChevronRight size={14}/> <span>{NAV.find(n=>n.id===page)?.label}</span></div><div className="topbar-right"><span className="private-indicator"><span/> Local storage</span><button className="topbar-plus" aria-label="Log activity" onClick={()=>openLog()}><Plus size={19}/></button></div></header><main className="main-content">
      {page==='dashboard'&&<Dashboard all={all} logAction={openLog} navigate={setPage}/>}
      {page==='skills'&&<SkillsPage all={all} logAction={openLog} openEditor={setEditor}/>}
      {page==='statistics'&&<StatisticsPage all={all} editLog={openEditLog} onSuccess={notify}/>}
      {page==='settings'&&<SettingsPage all={all} onSuccess={notify}/>}
    </main></div>
    <nav className="mobile-nav" aria-label="Mobile navigation">{NAV.map(n=><button key={n.id} className={page===n.id?'active':''} onClick={()=>setPage(n.id)}><n.Icon size={20}/><span>{n.label}</span></button>)}</nav>
    {editor?.kind==='log'&&<LogEditor key={editor.editing?.id||editor.activityId||'new-log'} all={all} editing={editor.editing} initialActivityId={editor.activityId} onClose={close} onSuccess={notify}/>}
    {editor?.kind==='skill'&&<SkillEditor all={all} editing={editor.editing} defaultCategoryId={editor.categoryId} onClose={close} onSuccess={notify}/>}
    {editor?.kind==='category'&&<CategoryEditor editing={editor.editing} onClose={close} onSuccess={notify}/>}
    {editor?.kind==='activity'&&<ActivityEditor all={all} editing={editor.editing} defaultSkillId={editor.skillId} onClose={close} onSuccess={notify}/>}
    {toast&&<div key={toast.id} className={`toast ${toast.error?'error':''}`} role="status">{toast.error?<AlertTriangle size={18}/>:<CheckCircle2 size={18}/>}<span>{toast.message}</span><button aria-label="Dismiss" onClick={()=>setToast(null)}><X size={15}/></button></div>}
  </div>;
}
