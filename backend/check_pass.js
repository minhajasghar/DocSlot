const bcrypt = require('bcryptjs');
const pool = require('./db');

(async () => {
  const [rows] = await pool.query("SELECT id, email, name, password_hash FROM doctors WHERE email = 'ahmed@clinic.com'");
  if (rows.length === 0) {
    console.log('Doctor not found');
    process.exit(0);
  }
  const doc = rows[0];
  console.log('Found:', doc.name, doc.email);
  console.log('Hash:', doc.password_hash);
  const match = await bcrypt.compare('doctor123', doc.password_hash);
  console.log('Password match:', match);

  // Also try bcryptjs hash
  const hash = await bcrypt.hash('doctor123', 10);
  console.log('Fresh hash:', hash);
  const match2 = await bcrypt.compare('doctor123', hash);
  console.log('Fresh hash match:', match2);
  process.exit(0);
})();
