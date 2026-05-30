import { getTasksForDate, taskId } from '../data/schedules';

function pad(value) {
  return String(value).padStart(2, '0');
}

function toKey(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function startOfWeek(date) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function getEntry(tracker, person, date) {
  return tracker[person]?.[toKey(date)] || { status: 'empty', tasks: {} };
}

function progressFor(person, date, entry) {
  const tasks = getTasksForDate(person, date);
  const done = tasks.filter((task) => entry.tasks?.[taskId(task)]).length;
  const percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  return { done, total: tasks.length, percent };
}

export default function WeeklyView({ person, year, month, tracker }) {
  const today = new Date();
  const baseDate = today.getFullYear() === year && today.getMonth() + 1 === month ? today : new Date(year, month - 1, 1);
  const start = startOfWeek(baseDate);
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });

  return (
    <section className="panel task-panel">
      <div className="task-panel-head">
        <div>
          <p className="eyebrow">Weekly View</p>
          <h2>This Week</h2>
          <p>7-day task progress for {person}</p>
        </div>
      </div>

      <div className="week-list">
        {weekDays.map((date) => {
          const entry = getEntry(tracker, person, date);
          const progress = progressFor(person, date, entry);
          return (
            <div className="week-row" key={toKey(date)}>
              <div>
                <strong>{date.toLocaleDateString(undefined, { weekday: 'short' })}</strong>
                <small>{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</small>
              </div>
              <div className="week-progress">
                <div className="progress"><span style={{ width: progress.percent + '%' }} /></div>
                <small>{entry.status === 'cheat' ? 'Cheat Day' : progress.done + '/' + progress.total + ' tasks'}</small>
              </div>
              <b>{entry.status === 'cheat' ? '⭐' : progress.percent + '%'}</b>
            </div>
          );
        })}
      </div>
    </section>
  );
}
