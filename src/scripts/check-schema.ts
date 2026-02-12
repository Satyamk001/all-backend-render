import { query } from '../db/db.js';

async function checkSchema() {
  try {
    const res = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'notifications';
    `);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  }
}

checkSchema();
