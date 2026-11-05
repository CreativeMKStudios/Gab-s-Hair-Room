import pg from 'pg';

const LOCK_KEY = 872341;

let pool;
let schemaReady;

function getPool() {
  if (!pool) pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  return pool;
}

async function ensureSchema(client) {
  if (schemaReady) return;
  await client.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id text PRIMARY KEY,
      payload jsonb NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id bigserial PRIMARY KEY,
      payload jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  schemaReady = true;
}

export async function readBookingRows() {
  const client = await getPool().connect();
  try {
    await ensureSchema(client);
    const { rows } = await client.query('SELECT payload FROM bookings');
    return rows.map((row) => row.payload);
  } finally {
    client.release();
  }
}

export async function withBookingTransaction(mutator) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await ensureSchema(client);
    await client.query('SELECT pg_advisory_xact_lock($1)', [LOCK_KEY]);
    const { rows } = await client.query('SELECT payload FROM bookings');
    const bookings = rows.map((row) => row.payload);
    const result = await mutator(bookings);
    await client.query('DELETE FROM bookings');
    for (const booking of bookings) {
      await client.query('INSERT INTO bookings (id, payload) VALUES ($1, $2::jsonb)', [
        booking.id,
        JSON.stringify(booking),
      ]);
    }
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* the connection is already broken */
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function insertMessage(record) {
  const client = await getPool().connect();
  try {
    await ensureSchema(client);
    await client.query('INSERT INTO messages (payload) VALUES ($1::jsonb)', [JSON.stringify(record)]);
  } finally {
    client.release();
  }
}
