const bcrypt = require('bcryptjs');
const pool = require('./db');

async function run() {
  const hash = await bcrypt.hash('doctor123', 10);
  const doctors = [
    ['Dr. Ahmed Khan', 'ahmed@clinic.com', hash, '555-0100', 'General Physician', 'City Hospital', 'MBBS', 500],
    ['Dr. Sara Malik', 'sara@clinic.com', hash, '555-0106', 'Gynecologist', "Women's Care Clinic", 'MBBS, FCPS', 800],
    ['Dr. Usman Raza', 'usman@clinic.com', hash, '555-0107', 'Dermatologist', 'Skin & Hair Center', 'MBBS, DDV', 600],
    ['Dr. Fatima Zaidi', 'fatima@clinic.com', hash, '555-0108', 'Pediatrician', 'Child Care Center', 'MBBS, MCPS (Pediatrics)', 700],
  ];

  // Update existing Dr. Sarah Johnson → Dr. Ahmed Khan
  const [existing] = await pool.query('SELECT id FROM doctors WHERE email = ?', ['sarah@clinic.com']);
  if (existing.length > 0) {
    const d = doctors[0];
    await pool.query(
      `UPDATE doctors SET name=?, email=?, password_hash=?, phone=?, specialization=?, clinic_name=?, bio=?, consultation_fee=?, is_active=1 WHERE id=?`,
      [d[0], d[1], d[2], d[3], d[4], d[5], d[6], d[7], existing[0].id]
    );
    console.log('Updated Dr. Sarah Johnson → Dr. Ahmed Khan');
  }

  for (const d of doctors) {
    const [existing] = await pool.query('SELECT id FROM doctors WHERE email = ?', [d[1]]);
    if (existing.length === 0) {
      await pool.query(
        `INSERT INTO doctors (name, email, password_hash, phone, specialization, clinic_name, bio, consultation_fee, is_active) VALUES (?,?,?,?,?,?,?,?,1)`,
        d
      );
      console.log(`Created ${d[0]}`);
    } else {
      console.log(`Skipped ${d[0]} (already exists)`);
    }
  }

  // Now add time slots for all 4 doctors
  const [allDocs] = await pool.query(
    "SELECT id, email FROM doctors WHERE email IN ('ahmed@clinic.com','sara@clinic.com','usman@clinic.com','fatima@clinic.com')"
  );
  const docMap = {};
  for (const doc of allDocs) docMap[doc.email] = doc.id;

  const slots = [
    // Ahmed — Mon-Sat
    [docMap['ahmed@clinic.com'], 'Mon','09:00','17:00',20],
    [docMap['ahmed@clinic.com'], 'Tue','09:00','17:00',20],
    [docMap['ahmed@clinic.com'], 'Wed','09:00','17:00',20],
    [docMap['ahmed@clinic.com'], 'Thu','09:00','17:00',20],
    [docMap['ahmed@clinic.com'], 'Fri','09:00','17:00',20],
    [docMap['ahmed@clinic.com'], 'Sat','09:00','13:00',20],
    // Sara — Mon-Sat
    [docMap['sara@clinic.com'], 'Mon','10:00','16:00',20],
    [docMap['sara@clinic.com'], 'Tue','10:00','16:00',20],
    [docMap['sara@clinic.com'], 'Wed','10:00','16:00',20],
    [docMap['sara@clinic.com'], 'Thu','10:00','16:00',20],
    [docMap['sara@clinic.com'], 'Fri','10:00','16:00',20],
    [docMap['sara@clinic.com'], 'Sat','10:00','14:00',20],
    // Usman — Mon-Sat
    [docMap['usman@clinic.com'], 'Mon','11:00','18:00',20],
    [docMap['usman@clinic.com'], 'Tue','11:00','18:00',20],
    [docMap['usman@clinic.com'], 'Wed','11:00','18:00',20],
    [docMap['usman@clinic.com'], 'Thu','11:00','18:00',20],
    [docMap['usman@clinic.com'], 'Fri','11:00','18:00',20],
    [docMap['usman@clinic.com'], 'Sat','11:00','15:00',20],
    // Fatima — Mon-Sat
    [docMap['fatima@clinic.com'], 'Mon','08:00','14:00',20],
    [docMap['fatima@clinic.com'], 'Tue','08:00','14:00',20],
    [docMap['fatima@clinic.com'], 'Wed','08:00','14:00',20],
    [docMap['fatima@clinic.com'], 'Thu','08:00','14:00',20],
    [docMap['fatima@clinic.com'], 'Fri','08:00','14:00',20],
    [docMap['fatima@clinic.com'], 'Sat','08:00','12:00',20],
  ];

  for (const s of slots) {
    await pool.query(
      'INSERT OR IGNORE INTO time_slots (doctor_id, day_of_week, start_time, end_time, slot_duration_mins) VALUES (?,?,?,?,?)',
      s
    );
  }
  console.log('Time slots seeded.');

  console.log('\nDoctor logins:');
  console.log('  ahmed@clinic.com / doctor123 (Dr. Ahmed Khan — General Physician)');
  console.log('  sara@clinic.com / doctor123 (Dr. Sara Malik — Gynecologist)');
  console.log('  usman@clinic.com / doctor123 (Dr. Usman Raza — Dermatologist)');
  console.log('  fatima@clinic.com / doctor123 (Dr. Fatima Zaidi — Pediatrician)');
}
run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
