export const DB_NAME = 'timelog.db'

export async function migrate(db) {
  const row = await db.getFirstAsync('PRAGMA user_version')
  const version = row?.user_version ?? 0
  if (version < 1) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day TEXT NOT NULL,
        slot_start INTEGER NOT NULL,
        text TEXT NOT NULL DEFAULT '',
        kind TEXT NOT NULL DEFAULT 'log',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(day, slot_start)
      );
      CREATE INDEX IF NOT EXISTS idx_entries_day ON entries(day);
      PRAGMA user_version = 1;
    `)
  }
  if (version < 2) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        bucket TEXT NOT NULL DEFAULT 'today',
        done INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT
      );
      PRAGMA user_version = 2;
    `)
  }
  if (version < 3) {
    // 'YYYY-MM-DD HH:MM' for a specific time, 'YYYY-MM-DD' for end of that day
    await db.execAsync(`
      ALTER TABLE todos ADD COLUMN deadline TEXT;
      PRAGMA user_version = 3;
    `)
  }
}

export function getEntriesForDay(db, day) {
  return db.getAllAsync('SELECT * FROM entries WHERE day = ? ORDER BY slot_start', [day])
}

export function upsertEntry(db, day, slotStart, text, kind) {
  return db.runAsync(
    `INSERT INTO entries (day, slot_start, text, kind) VALUES (?, ?, ?, ?)
     ON CONFLICT(day, slot_start) DO UPDATE SET
       text = excluded.text, kind = excluded.kind, updated_at = datetime('now')`,
    [day, slotStart, text, kind]
  )
}

export function deleteEntry(db, day, slotStart) {
  return db.runAsync('DELETE FROM entries WHERE day = ? AND slot_start = ?', [day, slotStart])
}

export function getDaySummaries(db, limit = 90) {
  return db.getAllAsync(
    `SELECT day, COUNT(*) AS logged, SUM(kind = 'break') AS breaks
     FROM entries GROUP BY day ORDER BY day DESC LIMIT ?`,
    [limit]
  )
}

// Logged-slot counts for every day in a month, keyed 'YYYY-MM'
export function getMonthSummaries(db, yearMonth) {
  return db.getAllAsync(
    'SELECT day, COUNT(*) AS logged FROM entries WHERE day LIKE ? GROUP BY day',
    [`${yearMonth}-%`]
  )
}

export function getTodos(db) {
  return db.getAllAsync('SELECT * FROM todos ORDER BY done ASC, id ASC')
}

export function addTodo(db, text, bucket) {
  return db.runAsync('INSERT INTO todos (text, bucket) VALUES (?, ?)', [text, bucket])
}

export function setTodoDone(db, id, done) {
  return db.runAsync(
    `UPDATE todos SET done = ?,
       completed_at = CASE WHEN ? THEN datetime('now') ELSE NULL END
     WHERE id = ?`,
    [done ? 1 : 0, done ? 1 : 0, id]
  )
}

export function setTodoDeadline(db, id, deadline) {
  return db.runAsync('UPDATE todos SET deadline = ? WHERE id = ?', [deadline, id])
}

export function deleteTodo(db, id) {
  return db.runAsync('DELETE FROM todos WHERE id = ?', [id])
}
