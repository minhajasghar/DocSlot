const pool = require('./db');
(async () => {
  try {
    const sql = "SELECT id, name, specialization, clinic_name, bio, consultation_fee, profile_pic FROM doctors WHERE is_active = TRUE";
    const [r] = await pool.query(sql);
    console.log(JSON.stringify(r, null, 2));
  } catch(e) {
    console.log('FAIL:', e.code, e.message);
  }
  process.exit(0);
})();
