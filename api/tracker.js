import { neon } from '@neondatabase/serverless';

const PEOPLE = ['Sahil', 'Shreya', 'Thanya'];
const VALID_STATUS = new Set(['empty', 'done', 'cheat', 'missed']);

function emptyTracker() {
  return PEOPLE.reduce((acc, person) => {
    acc[person] = {};
    return acc;
  }, {});
}

function monthBounds(year, month) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const next = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;
  return { start, next };
}

function getSql() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing. Add Neon DATABASE_URL in Vercel Environment Variables.');
  return neon(process.env.DATABASE_URL);
}

async function ensureTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS tracker_entries (
      id SERIAL PRIMARY KEY,
      person TEXT NOT NULL,
      entry_date DATE NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('done', 'cheat', 'missed')),
      tasks JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(person, entry_date)
    )
  `;

  await sql`ALTER TABLE tracker_entries ADD COLUMN IF NOT EXISTS tasks JSONB DEFAULT '{}'::jsonb`;
  await sql`DELETE FROM tracker_entries WHERE entry_date < CURRENT_DATE - INTERVAL '35 days'`;
}

async function readMonth(sql, year, month) {
  const { start, next } = monthBounds(year, month);
  const rows = await sql`
    SELECT person, entry_date::text AS entry_date, status, tasks
    FROM tracker_entries
    WHERE entry_date >= ${start}::date AND entry_date < ${next}::date
    ORDER BY entry_date ASC
  `;

  const tracker = emptyTracker();
  for (const row of rows) {
    if (!tracker[row.person]) tracker[row.person] = {};
    tracker[row.person][row.entry_date] = { status: row.status, tasks: row.tasks || {} };
  }
  return tracker;
}

export default async function handler(req, res) {
  try {
    const sql = getSql();
    await ensureTable(sql);

    if (req.method === 'GET') {
      const year = Number(req.query.year);
      const month = Number(req.query.month);
      if (!year || !month || month < 1 || month > 12) return res.status(400).json({ error: 'Valid year and month are required' });
      const tracker = await readMonth(sql, year, month);
      return res.status(200).json({ tracker, retentionDays: 35 });
    }

    if (req.method === 'POST') {
      const { person, date, status, tasks = {}, year, month } = req.body || {};
      if (!PEOPLE.includes(person)) return res.status(400).json({ error: 'Invalid person' });
      if (!VALID_STATUS.has(status)) return res.status(400).json({ error: 'Invalid status' });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return res.status(400).json({ error: 'Invalid date' });
      if (!year || !month || month < 1 || month > 12) return res.status(400).json({ error: 'Valid year and month are required' });

      if (status === 'empty') {
        await sql`DELETE FROM tracker_entries WHERE person = ${person} AND entry_date = ${date}::date`;
      } else {
        await sql`
          INSERT INTO tracker_entries (person, entry_date, status, tasks, updated_at)
          VALUES (${person}, ${date}::date, ${status}, ${JSON.stringify(tasks)}::jsonb, NOW())
          ON CONFLICT (person, entry_date)
          DO UPDATE SET status = EXCLUDED.status, tasks = EXCLUDED.tasks, updated_at = NOW()
        `;
      }

      const tracker = await readMonth(sql, Number(year), Number(month));
      return res.status(200).json({ tracker, retentionDays: 35 });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
