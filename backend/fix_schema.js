const m = require('mysql2/promise');

async function run() {
  console.log('Connecting...');
  const c = await m.createConnection({host:'127.0.0.1',user:'root',password:'',database:'doctor_appointment',connectTimeout:10000});
  console.log('Connected.');
  const cols = [
    'ALTER TABLE doctors ADD COLUMN clinic_name VARCHAR(150)',
    'ALTER TABLE doctors ADD COLUMN bio TEXT',
    'ALTER TABLE doctors ADD COLUMN is_active TINYINT(1) DEFAULT 1',
    'ALTER TABLE doctors ADD COLUMN consultation_fee INT DEFAULT 0',
  ];
  for (const sql of cols) {
    try { await c.query(sql); console.log('OK:', sql); } catch (e) { console.log('SKIP:', e.message); }
  }
  try {
    await c.query("ALTER TABLE appointments MODIFY COLUMN status ENUM('pending','confirmed','in_consultation','completed','cancelled','no_show') DEFAULT 'pending'");
    console.log('OK: updated status ENUM');
  } catch (e) { console.log('SKIP:', e.message); }
  console.log('Done.');
  await c.end();
}
run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
