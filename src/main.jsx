import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CalendarDays, CheckCircle2, Flame, Lock, LogOut, Medal, RefreshCcw, Sparkles, Trophy, Users } from 'lucide-react';
import './styles.css';

const PEOPLE = ['Sahil', 'Shreya', 'Thanya'];
const CENTRAL_USER = 'CENTRAL';
const STATUS_FLOW = ['empty', 'done', 'cheat', 'missed'];
const STATUS_LABELS = { empty: 'Pending', done: 'Done', cheat: 'Cheat', missed: 'Missed' };

function getTodayParts() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}
function daysInMonth(year, month) { return new Date(year, month, 0).getDate(); }
function pad(value) { return String(value).padStart(2, '0'); }
function dateKey(year, month, day) { return `${year}-${pad(month)}-${pad(day)}`; }
function credentialFor(name) { return name.toUpperCase(); }

function calculateStats(personData = {}, year, month) {
  const totalDays = daysInMonth(year, month);
  let done = 0, cheat = 0, missed = 0, longestStreak = 0, runningStreak = 0;
  const today = getTodayParts();
  const isCurrentMonth = today.year === year && today.month === month;
  const limitDay = isCurrentMonth ? today.day : totalDays;

  for (let day = 1; day <= totalDays; day++) {
    const status = personData[dateKey(year, month, day)] || 'empty';
    if (status === 'done') done += 1;
    if (status === 'cheat') cheat += 1;
    if (status === 'missed') missed += 1;
    if (day <= limitDay && (status === 'done' || status === 'cheat')) {
      runningStreak += 1;
      longestStreak = Math.max(longestStreak, runningStreak);
    } else if (day <= limitDay) runningStreak = 0;
  }
  const score = Math.round(((done + Math.min(cheat, 3)) / totalDays) * 100);
  return { totalDays, done, cheat, missed, score, currentStreak: runningStreak, longestStreak, cheatLeft: Math.max(0, 3 - cheat) };
}

function App() {
  const savedUser = localStorage.getItem('trackerUser') || '';
  const [user, setUser] = useState(savedUser);
  return user ? <TrackerApp user={user} onLogout={() => { localStorage.removeItem('trackerUser'); setUser(''); }} /> : <Login onLogin={setUser} />;
}

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function submit(e) {
    e.preventDefault();
    const u = username.trim().toUpperCase();
    const p = password.trim().toUpperCase();
    const validPeople = PEOPLE.map(credentialFor);
    const isPerson = validPeople.includes(u) && u === p;
    const isCentral = u === CENTRAL_USER && p === CENTRAL_USER;
    if (!isPerson && !isCentral) {
      setError('Use username and password as the name in ALL CAPS. Example: SAHIL / SAHIL');
      return;
    }
    localStorage.setItem('trackerUser', u);
    onLogin(u);
  }

  return (
    <main className="login-shell">
      <form className="login-card" onSubmit={submit}>
        <p className="eyebrow"><Lock size={16} /> Private Tracker</p>
        <h1>Login to your monthly tracker</h1>
        <p className="subtitle">Sahil, Shreya and Thanya can view only their own tracker. Central login shows everyone’s result.</p>
        {error && <div className="alert">{error}</div>}
        <label>Username<input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="SAHIL" /></label>
        <label>Password<input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="SAHIL" type="password" /></label>
        <button className="primary-btn" type="submit">Login</button>
        <small className="login-hint">Central dashboard: CENTRAL / CENTRAL</small>
      </form>
    </main>
  );
}

function TrackerApp({ user, onLogout }) {
  const today = getTodayParts();
  const isCentral = user === CENTRAL_USER;
  const loggedPerson = PEOPLE.find((p) => credentialFor(p) === user) || PEOPLE[0];
  const [selectedPerson, setSelectedPerson] = useState(loggedPerson);
  const [year, setYear] = useState(today.year);
  const [month, setMonth] = useState(today.month);
  const [tracker, setTracker] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadTracker() {
    try {
      setLoading(true); setError('');
      const response = await fetch(`/api/tracker?year=${year}&month=${month}`);
      if (!response.ok) throw new Error('Unable to load tracker data');
      const data = await response.json();
      setTracker(data.tracker || {});
    } catch (err) { setError(err.message || 'Something went wrong'); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadTracker(); }, [year, month]);
  useEffect(() => { if (!isCentral) setSelectedPerson(loggedPerson); }, [user]);

  const selectedStats = useMemo(() => calculateStats(tracker[selectedPerson], year, month), [tracker, selectedPerson, year, month]);
  const leaderboard = useMemo(() => PEOPLE.map((name) => ({ name, ...calculateStats(tracker[name], year, month) })).sort((a, b) => b.score - a.score), [tracker, year, month]);
  const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });

  async function updateStatus(day) {
    if (isCentral) return;
    const key = dateKey(year, month, day);
    const current = tracker[loggedPerson]?.[key] || 'empty';
    let next = STATUS_FLOW[(STATUS_FLOW.indexOf(current) + 1) % STATUS_FLOW.length];
    const stats = calculateStats(tracker[loggedPerson], year, month);
    if (next === 'cheat' && stats.cheat >= 3 && current !== 'cheat') next = 'missed';
    const optimistic = { ...tracker, [loggedPerson]: { ...(tracker[loggedPerson] || {}), [key]: next } };
    setTracker(optimistic);
    try {
      setSaving(true);
      const response = await fetch('/api/tracker', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ person: loggedPerson, date: key, status: next, year, month }) });
      if (!response.ok) throw new Error('Unable to save status');
      const data = await response.json();
      setTracker(data.tracker || optimistic);
    } catch (err) { setError(err.message || 'Save failed'); loadTracker(); }
    finally { setSaving(false); }
  }

  function changeMonth(delta) {
    const next = new Date(year, month - 1 + delta, 1);
    setYear(next.getFullYear()); setMonth(next.getMonth() + 1);
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow"><Sparkles size={16} /> Monthly Discipline Tracker</p>
          <h1>{isCentral ? 'Central dashboard for all results.' : `${loggedPerson}, track your one important task daily.`}</h1>
          <p className="subtitle">⚠️ Data is automatically deleted after 35 days. Done days and up to 3 cheat days count toward the monthly score.</p>
        </div>
        <div className="hero-card"><Trophy size={34} /><strong>{selectedStats.score}%</strong><span>{selectedPerson}'s score</span><button className="logout-btn" onClick={onLogout}><LogOut size={15} /> Logout</button></div>
      </section>
      {error && <div className="alert">{error}</div>}
      <section className="top-bar">
        <div className="people-tabs">
          {(isCentral ? PEOPLE : [loggedPerson]).map((person) => <button key={person} className={person === selectedPerson ? 'active' : ''} onClick={() => setSelectedPerson(person)}><Users size={16} /> {person}</button>)}
        </div>
        <div className="month-switcher"><button onClick={() => changeMonth(-1)}>‹</button><strong>{monthName} {year}</strong><button onClick={() => changeMonth(1)}>›</button></div>
      </section>
      <section className="stats-grid"><Stat icon={<CheckCircle2 />} label="Completed" value={selectedStats.done} /><Stat icon={<RefreshCcw />} label="Cheat Left" value={`${selectedStats.cheatLeft}/3`} /><Stat icon={<Flame />} label="Current Streak" value={selectedStats.currentStreak} /><Stat icon={<Medal />} label="Longest Streak" value={selectedStats.longestStreak} /></section>
      {isCentral && <CentralDashboard leaderboard={leaderboard} />}
      <section className="content-grid">
        <div className="panel calendar-panel"><div className="panel-title"><CalendarDays /><div><h2>{selectedPerson}'s Calendar</h2><p>{isCentral ? 'Central dashboard is read-only.' : 'Click a day: Pending → Done → Cheat → Missed.'}</p></div></div>{loading ? <div className="loader">Loading tracker...</div> : <CalendarGrid year={year} month={month} personData={tracker[selectedPerson] || {}} onDayClick={updateStatus} disabled={isCentral} />}{saving && <p className="saving">Saving...</p>}</div>
        <aside className="panel leaderboard-panel"><h2>Leaderboard</h2><div className="leaderboard">{leaderboard.map((item, index) => <div className="leader-row" key={item.name}><span className="rank">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</span><div><strong>{item.name}</strong><small>{item.done} done · {item.cheat} cheat · {item.missed} missed</small></div><b>{item.score}%</b></div>)}</div><div className="score-box"><h3>Monthly Score</h3><p>({selectedStats.done} done + {Math.min(selectedStats.cheat, 3)} cheat) / {selectedStats.totalDays} × 100 = <strong>{selectedStats.score}%</strong></p></div></aside>
      </section>
    </main>
  );
}

function CentralDashboard({ leaderboard }) {
  return <section className="central-grid">{leaderboard.map((person) => <div className="central-card" key={person.name}><strong>{person.name}</strong><div className="progress"><span style={{ width: `${person.score}%` }} /></div><p>{person.score}% · {person.done} done · {person.cheat}/3 cheat · {person.missed} missed</p></div>)}</section>;
}
function Stat({ icon, label, value }) { return <div className="stat-card"><span>{icon}</span><p>{label}</p><strong>{value}</strong></div>; }
function CalendarGrid({ year, month, personData, onDayClick, disabled }) {
  const total = daysInMonth(year, month); const firstDay = new Date(year, month - 1, 1).getDay(); const blanks = Array.from({ length: firstDay }); const days = Array.from({ length: total }, (_, index) => index + 1);
  return <div className="calendar-grid">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span className="week" key={day}>{day}</span>)}{blanks.map((_, index) => <span key={`blank-${index}`} />)}{days.map((day) => { const status = personData[dateKey(year, month, day)] || 'empty'; return <button key={day} className={`day ${status}`} onClick={() => onDayClick(day)} title={STATUS_LABELS[status]} disabled={disabled}><b>{day}</b><small>{STATUS_LABELS[status]}</small></button>; })}</div>;
}
createRoot(document.getElementById('root')).render(<App />);
