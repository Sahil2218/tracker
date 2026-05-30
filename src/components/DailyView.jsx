import { getTasksForDate, taskId } from '../data/schedules';

function pad(value) {
  return String(value).padStart(2, '0');
}

function dateKey(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function getEntry(tracker, person, date) {
  return tracker[person]?.[dateKey(date)] || { status: 'empty', tasks: {} };
}

function getTaskProgress(tasks, completedMap) {
  if (!tasks.length) return { done: 0, total: 0, percent: 0 };
  const done = tasks.filter((task) => completedMap[taskId(task)]).length;
  return { done, total: tasks.length, percent: Math.round((done / tasks.length) * 100) };
}

export default function DailyView({ person, year, month, tracker, onSaveEntry }) {
  const today = new Date();
  const viewDate = today.getFullYear() === year && today.getMonth() + 1 === month ? today : new Date(year, month - 1, 1);
  const tasks = getTasksForDate(person, viewDate);
  const entry = getEntry(tracker, person, viewDate);
  const completedMap = entry.tasks || {};
  const progress = getTaskProgress(tasks, completedMap);

  function toggleTask(task) {
    const id = taskId(task);
    const nextTasks = { ...completedMap, [id]: !completedMap[id] };
    const nextDone = tasks.filter((item) => nextTasks[taskId(item)]).length;
    const nextStatus = nextDone === tasks.length ? 'done' : 'missed';
    onSaveEntry({ date: dateKey(viewDate), status: nextStatus, tasks: nextTasks });
  }

  function markCheat() {
    onSaveEntry({ date: dateKey(viewDate), status: 'cheat', tasks: completedMap });
  }

  return (
    <section className="panel task-panel">
      <div className="task-panel-head">
        <div>
          <p className="eyebrow">Daily View</p>
          <h2>{viewDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
          <p>{progress.done}/{progress.total} tasks completed · {progress.percent}%</p>
        </div>
        <button className="cheat-btn" onClick={markCheat}>Use Cheat Day</button>
      </div>

      <div className="progress big"><span style={{ width: progress.percent + '%' }} /></div>

      <div className="task-list">
        {tasks.map((task) => {
          const id = taskId(task);
          return (
            <button className={completedMap[id] ? 'task-row done-task' : 'task-row'} key={id} onClick={() => toggleTask(task)}>
              <span>{completedMap[id] ? '✓' : ''}</span>
              <b>{task}</b>
            </button>
          );
        })}
      </div>
    </section>
  );
}
