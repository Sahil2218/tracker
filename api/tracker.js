import { kv } from '@vercel/kv';

const PEOPLE = ['Sahil', 'Person 2', 'Person 3'];
const VALID_STATUS = new Set(['empty', 'done', 'cheat', 'missed']);

function keyFor(year, month) {
  return `tracker:${year}:${String(month).padStart(2, '0')}`;
}

function emptyTracker() {
  return PEOPLE.reduce((acc, person) => {
    acc[person] = {};
    return acc;
  }, {});
}

function normaliseTracker(value) {
  return { ...emptyTracker(), ...(value || {}) };
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const year = Number(req.query.year);
      const month = Number(req.query.month);
      if (!year || !month) return res.status(400).json({ error: 'year and month are required' });
      const tracker = normaliseTracker(await kv.get(keyFor(year, month)));
      return res.status(200).json({ tracker });
    }

    if (req.method === 'POST') {
      const { person, date, status, year, month } = req.body || {};
      if (!PEOPLE.includes(person)) return res.status(400).json({ error: 'Invalid person' });
      if (!VALID_STATUS.has(status)) return res.status(400).json({ error: 'Invalid status' });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return res.status(400).json({ error: 'Invalid date' });
      if (!year || !month) return res.status(400).json({ error: 'year and month are required' });

      const storageKey = keyFor(year, month);
      const tracker = normaliseTracker(await kv.get(storageKey));
      tracker[person] = tracker[person] || {};
      if (status === 'empty') delete tracker[person][date];
      else tracker[person][date] = status;
      await kv.set(storageKey, tracker);
      return res.status(200).json({ tracker });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
