export const PEOPLE = ['Sahil', 'Shreya', 'Thanya'];

export const SCHEDULES = {
  Sahil: {
    weekday: [
      'Wake up at 5 AM',
      'Breathing exercises',
      'Read Gita',
      'Office work',
      'Gym or quality time with Shreya',
      'Dinner',
      'Daily call',
      'Study session',
      'Sleep'
    ],
    specialWeekday: [
      'Office',
      'Freshen up',
      'Dinner',
      'Walk',
      'Call',
      'Study with Shreya',
      'Sleep'
    ],
    weekend: [
      'Wake up',
      'Outdoor activities',
      'Rest',
      'Exercise (Walk/Gym/Run)',
      'Free time',
      'Dinner',
      'Call',
      'Study',
      'Sleep'
    ]
  },
  Shreya: {
    weekday: [
      'Office work',
      'Freshen up',
      'Work session with Sahil',
      'Dinner',
      'Walk',
      'Call',
      'Study with Sahil',
      'Sleep'
    ],
    specialWeekday: [
      'Office',
      'Freshen up',
      'Dinner',
      'Walk',
      'Call',
      'Study',
      'Sleep'
    ],
    weekend: [
      'Wake up',
      'Personal outing',
      'Rest',
      'Dinner',
      'Walk if needed',
      'Study if needed',
      'Sleep'
    ]
  },
  Thanya: {
    weekday: [
      'Wake up at 5 AM',
      'Complete morning routine',
      'Swimming session',
      'Travel to office',
      'Complete office work',
      'Return home',
      'Dinner and rest',
      '1 hour study',
      'Sleep by 11 PM'
    ],
    specialWeekday: [
      'Wake up at 5 AM',
      'Complete morning routine',
      'Swimming session',
      'Travel to office',
      'Complete office work',
      'Return home',
      'Dinner and rest',
      '1 hour study',
      'Sleep by 11 PM'
    ],
    weekend: [
      'Wake up at 7 AM',
      'Morning routine',
      'Breakfast',
      'Personal activities',
      '4-hour study block',
      'Sleep by 10 PM'
    ]
  }
};

export function getScheduleType(date) {
  const day = date.getDay();
  if (day === 0 || day === 6) return 'weekend';
  if (day === 5) return 'specialWeekday';
  return 'weekday';
}

export function getTasksForDate(person, date) {
  const scheduleType = getScheduleType(date);
  return SCHEDULES[person]?.[scheduleType] || [];
}

export function taskId(task) {
  return task.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
