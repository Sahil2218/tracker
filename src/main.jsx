import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CheckCircle2, Flame, Lock, LogOut, Medal, RefreshCcw, Sparkles, Trophy, Users } from 'lucide-react';
import DailyView from './components/DailyView';
import WeeklyView from './components/WeeklyView';
import MonthlyTaskView from './components/MonthlyTaskView';
import ViewTabs from './components/ViewTabs';
import { PEOPLE } from './data/schedules';
import { fetchTracker, saveTrackerEntry } from './services/trackerApi';
import './styles.css';

function getTodayParts() { const now = new Date(); return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() }; }
function daysInMonth(year, month) { return new Date(year, month, 0).getDate(); }
function pad(value) { return String(value).padStart(2, '0'); }
function dateKey(year, month, day) { return year + '-' + pad(month) + '-' + pad(day); }
function credentialFor(name) { return name.toUpperCase(); }
function getEntryStatus(entry) { return typeof entry === 'string' ? entry : entry?.status || 'empty'; }

function calculateStats(personData = {}, year, month) {
  const totalDays = daysInMonth(year, month);
  let done = 0, cheat = 0, missed = 0, longestStreak = 0, runningStreak = 0;
  const today = getTodayParts();
  const limitDay = today.year === year && today.month === month ? today.day : totalDays;

  for (let day = 1; day <= totalDays; day++) {
    const status = getEntryStatus(personData[dateKey(year, month, day)]);
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
    if (!validPeople.includes(u) || u !== p) {
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
        <p className="subtitle">Sahil, Shreya and Thanya can update only their own tracker. Everyone can see the central results dashboard.</p>
        {error && <div className="alert">{error}</div>}
        <label>Username<input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="SAHIL" /></label>
        <label>Password<input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="SAHIL" type="password" /></label>
        <button className="primary-btn" type="submit">Login</button>
        <small className="login-hint">Allowed: SAHIL, SHREYA, THANYA</small>
      </form>
    </main>
  );
}

function TrackerApp({ user, onLogout }) {
  const today = getTodayParts();
  const loggedPerson = PEOPLE.find((p) => credentialFor(p) === user) || PEOPLE[0];
  const [year, setYear] = useState(today.year);
  const [month, setMonth] = useState(today.month);
  const [tracker, setTracker] = useState({});
  const [activeView, setActiveView] = useState('daily');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadTracker() {
    try {
      setLoading(true); setError('');
      setTracker(await fetchTracker(year, month));
    } catch (err) { setError(err.message || 'Something went wrong'); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadTracker(); }, [year, month]);

  const selectedStats = useMemo(() => calculateStats(tracker[loggedPerson], year, month), [tracker, loggedPerson, year, month]);
  const leaderboard = useMemo(() => PEOPLE.map((name) => ({ name, ...calculateStats(tracker[name], year, month) })).sort((a, b) => b.score - a.score), [tracker, year, month]);
  const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });

  async function saveEntry({ date, status, tasks }) {
    try {
      setSaving(true);
      const optimistic = { ...tracker, [loggedPerson]: { ...(tracker[loggedPerson] || {}), [date]: { status, tasks: tasks || {} } } };
      setTracker(optimistic);
      setTracker(await saveTrackerEntry({ person: loggedPerson, date, status, tasks: tasks || {}, year, month }));
    } catch (err) { setError(err.message || 'Save failed'); loadTracker(); }
    finally { setSaving(false); }
  }

  function changeMonth(delta) { const next = new Date(year, month - 1 + delta, 1); setYear(next.getFullYear()); setMonth(next.getMonth() + 1); }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow"><Sparkles size={16} /> Monthly Discipline Tracker</p>
          <h1>{loggedPerson}, track your one important task daily.</h1>
          <p className="subtitle">⚠️ Data is automatically deleted after 35 days. Daily tasks power weekly and monthly scores. Everyone can see the central result dashboard.</p>
        </div>
        <div className="hero-card"><Trophy size={34} /><strong>{selectedStats.score}%</strong><span>{loggedPerson}'s score</span><button className="logout-btn" onClick={onLogout}><LogOut size={15} /> Logout</button></div>
      </section>
      {error && <div className="alert">{error}</div>}
      <section className="top-bar">
        <div className="people-tabs"><button className="active"><Users size={16} /> {loggedPerson}</button></div>
        <div className="month-switcher"><button onClick={() => changeMonth(-1)}>‹</button><strong>{monthName} {year}</strong><button onClick={() => changeMonth(1)}>›</button></div>
      </section>
      <section className="stats-grid"><Stat icon={<CheckCircle2 />} label="Completed" value={selectedStats.done} /><Stat icon={<RefreshCcw />} label="Cheat Left" value={selectedStats.cheatLeft + '/3'} /><Stat icon={<Flame />} label="Current Streak" value={selectedStats.currentStreak} /><Stat icon={<Medal />} label="Longest Streak" value={selectedStats.longestStreak} /></section>
      <CentralDashboard leaderboard={leaderboard} />
      <ViewTabs activeView={activeView} onChange={setActiveView} />
      {loading ? <div className="panel loader">Loading tracker...</div> : activeView === 'daily' ? <DailyView person={loggedPerson} year={year} month={month} tracker={tracker} onSaveEntry={saveEntry} /> : activeView === 'weekly' ? <WeeklyView person={loggedPerson} year={year} month={month} tracker={tracker} /> : <MonthlyTaskView person={loggedPerson} year={year} month={month} tracker={tracker} />}
      {saving && <p className="saving">Saving...</p>}
      <aside className="panel leaderboard-panel full-width"><h2>Leaderboard</h2><div className="leaderboard">{leaderboard.map((item, index) => <div className="leader-row" key={item.name}><span className="rank">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</span><div><strong>{item.name}</strong><small>{item.done} done · {item.cheat} cheat · {item.missed} missed</small></div><b>{item.score}%</b></div>)}</div></aside>
    </main>
  );
}

function CentralDashboard({ leaderboard }) { return <section className="central-grid">{leaderboard.map((person) => <div className="central-card" key={person.name}><strong>{person.name}</strong><div className="progress"><span style={{ width: person.score + '%' }} /></div><p>{person.score}% · {person.done} done · {person.cheat}/3 cheat · {person.missed} missed</p></div>)}</section>; }
function Stat({ icon, label, value }) { return <div className="stat-card"><span>{icon}</span><p>{label}</p><strong>{value}</strong></div>; }
createRoot(document.getElementById('root')).render(<App />);
