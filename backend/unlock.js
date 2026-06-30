const m = require('mysql2/promise');

async function run() {
  const c = await m.createConnection({host:'127.0.0.1',user:'root',password:'',database:'doctor_appointment',connectTimeout:10000});
  console.log('Connected.');
  
  // Set lock wait timeout to 5 seconds
  await c.query("SET SESSION lock_wait_timeout = 5");
  await c.query("SET SESSION innodb_lock_wait_timeout = 5");
  
  // Kill hanging connections
  const [rows] = await c.query('SHOW FULL PROCESSLIST');
  const myId = (await c.query('SELECT CONNECTION_ID() as id'))[0][0].id;
  for (const row of rows) {
    if (row.Id == myId) continue;
    if (row.Id <= 5) continue; // system threads
    try {
      await c.query(`KILL ${row.Id}`);
      console.log(`Killed ${row.Id} (${row.Command}: ${(row.Info||'').trim().substring(0,100)})`);
    } catch(e) {
      console.log(`Could not kill ${row.Id}: ${e.message}`);
    }
  }
  
  console.log('Testing simple query...');
  const [r] = await c.query('SELECT COUNT(*) as cnt FROM doctors');
  console.log('Doctors count:', r[0].cnt);
  
  console.log('Now running ALTER...');
  try {
    await c.query('ALTER TABLE doctors ADD COLUMN clinic_name VARCHAR(150)');
    console.log('OK: clinic_name');
  } catch(e) { console.log('SKIP: ' + e.message); }
  try {
    await c.query('ALTER TABLE doctors ADD COLUMN bio TEXT');
    console.log('OK: bio');
  } catch(e) { console.log('SKIP: ' + e.message); }
  try {
    await c.query('ALTER TABLE doctors ADD COLUMN is_active TINYINT(1) DEFAULT 1');
    console.log('OK: is_active');
  } catch(e) { console.log('SKIP: ' + e.message); }
  try {
    await c.query('ALTER TABLE doctors ADD COLUMN consultation_fee INT DEFAULT 0');
    console.log('OK: consultation_fee');
  } catch(e) { console.log('SKIP: ' + e.message); }
  try {
    await c.query("ALTER TABLE appointments MODIFY COLUMN status ENUM('pending','confirmed','in_consultation','completed','cancelled','no_show') DEFAULT 'pending'");
    console.log('OK: status ENUM');
  } catch(e) { console.log('SKIP: ' + e.message); }
  console.log('Done.');
  await c.end();
}
run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
