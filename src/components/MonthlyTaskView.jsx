import { getTasksForDate, taskId } from '../data/schedules';

function pad(value) {
  return String(value).padStart(2, '0');
}

function toKey(year, month, day) {
  return year + '-' + pad(month) + '-' + pad(day);
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function progressFor(person, date, entry) {
  const tasks = getTasksForDate(person, date);
  const done = tasks.filter((task) => entry?.tasks?.[taskId(task)]).length;
  const percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  return { done, total: tasks.length, percent };
}

export default function MonthlyTaskView({ person, year, month, tracker }) {
  const total = daysInMonth(year, month);
  const firstDay = new Date(year, month - 1, 1).getDay();
  const blanks = Array.from({ length: firstDay });
  const days = Array.from({ length: total }, (_, index) => index + 1);

  return (
    <section className="panel task-panel">
      <div className="task-panel-head">
        <div>
          <p className="eyebrow">Monthly View</p>
          <h2>{new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
          <p>Task completion percentage for every day.</p>
        </div>
      </div>

      <div className="calendar-grid monthly-task-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span className="week" key={day}>{day}</span>)}
        {blanks.map((_, index) => <span key={'blank-' + index} />)}
        {days.map((day) => {
          const date = new Date(year, month - 1, day);
          const key = toKey(year, month, day);
          const entry = tracker[person]?.[key] || { status: 'empty', tasks: {} };
          const progress = progressFor(person, date, entry);
          const label = entry.status === 'cheat' ? '⭐ Cheat' : progress.percent + '%';
          const statusClass = entry.status === 'cheat' ? 'cheat' : progress.percent === 100 ? 'done' : progress.percent >= 50 ? 'partial' : progress.percent > 0 ? 'low' : 'empty';

          return (
            <div className={'day readonly-day ' + statusClass} key={key}>
              <b>{day}</b>
              <small>{label}</small>
              <small>{progress.done}/{progress.total}</small>
            </div>
          );
        })}
      </div>
    </section>
  );
}
