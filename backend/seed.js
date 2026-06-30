const bcrypt = require('bcryptjs');
const pool = require('./db');
require('dotenv').config();

async function seed() {
  try {
    pool.db.exec(`
      CREATE TABLE IF NOT EXISTS doctors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        phone TEXT,
        specialization TEXT,
        clinic_name TEXT,
        profile_pic TEXT,
        bio TEXT,
        is_active INTEGER DEFAULT 1,
        consultation_fee INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        age INTEGER,
        gender TEXT CHECK(gender IN ('Male', 'Female', 'Other')),
        address TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);

      CREATE TABLE IF NOT EXISTS time_slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doctor_id INTEGER NOT NULL,
        day_of_week TEXT NOT NULL CHECK(day_of_week IN ('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat')),
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        slot_duration_mins INTEGER DEFAULT 20,
        is_active INTEGER DEFAULT 1,
        FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS blocked_dates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doctor_id INTEGER NOT NULL,
        blocked_date TEXT NOT NULL,
        reason TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doctor_id INTEGER NOT NULL,
        patient_id INTEGER NOT NULL,
        appointment_date TEXT NOT NULL,
        slot_time TEXT NOT NULL,
        token_number INTEGER NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'in_consultation', 'completed', 'cancelled', 'no_show')),
        reason TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
      CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
    `);

    const [existingDoctors] = await pool.query(
      "SELECT id, email FROM doctors WHERE email IN ('ahmed@clinic.com', 'sara@clinic.com', 'usman@clinic.com', 'fatima@clinic.com')"
    );
    const existingEmails = new Set(existingDoctors.map(d => d.email));

    if (existingEmails.has('ahmed@clinic.com') && existingEmails.has('sara@clinic.com') && existingEmails.has('usman@clinic.com') && existingEmails.has('fatima@clinic.com')) {
      console.log('Seed data already exists. Skipping.');
      return;
    }

    const passwordHash = await bcrypt.hash('doctor123', 10);

    const [oldDoc] = await pool.query('SELECT id FROM doctors WHERE email = ?', ['sarah@clinic.com']);
    if (oldDoc.length > 0) {
      await pool.query(
        `UPDATE doctors SET name = ?, email = ?, password_hash = ?, phone = ?, specialization = ?, clinic_name = ?, bio = ?, consultation_fee = ?, is_active = 1 WHERE id = ?`,
        ['Dr. Ahmed Khan', 'ahmed@clinic.com', passwordHash, '555-0100', 'General Physician', 'City Hospital', 'MBBS', 500, oldDoc[0].id]
      );
    } else if (!existingEmails.has('ahmed@clinic.com')) {
      await pool.query(
        `INSERT INTO doctors (name, email, password_hash, phone, specialization, clinic_name, bio, consultation_fee, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        ['Dr. Ahmed Khan', 'ahmed@clinic.com', passwordHash, '555-0100', 'General Physician', 'City Hospital', 'MBBS', 500]
      );
    }

    if (!existingEmails.has('sara@clinic.com')) {
      await pool.query(
        `INSERT INTO doctors (name, email, password_hash, phone, specialization, clinic_name, bio, consultation_fee, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        ['Dr. Sara Malik', 'sara@clinic.com', passwordHash, '555-0106', 'Gynecologist', "Women's Care Clinic", 'MBBS, FCPS', 800]
      );
    }

    if (!existingEmails.has('usman@clinic.com')) {
      await pool.query(
        `INSERT INTO doctors (name, email, password_hash, phone, specialization, clinic_name, bio, consultation_fee, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        ['Dr. Usman Raza', 'usman@clinic.com', passwordHash, '555-0107', 'Dermatologist', 'Skin & Hair Center', 'MBBS, DDV', 600]
      );
    }

    if (!existingEmails.has('fatima@clinic.com')) {
      await pool.query(
        `INSERT INTO doctors (name, email, password_hash, phone, specialization, clinic_name, bio, consultation_fee, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        ['Dr. Fatima Zaidi', 'fatima@clinic.com', passwordHash, '555-0108', 'Pediatrician', 'Child Care Center', 'MBBS, MCPS (Pediatrics)', 700]
      );
    }

    const [allDocs] = await pool.query(
      "SELECT id, email FROM doctors WHERE email IN (?, ?, ?, ?)",
      ['ahmed@clinic.com', 'sara@clinic.com', 'usman@clinic.com', 'fatima@clinic.com']
    );
    const docMap = {};
    for (const d of allDocs) docMap[d.email] = d.id;

    const patients = [
      ['John Smith', '555-0101', 'john@email.com', 35, 'Male', '123 Main St, Springfield'],
      ['Emily Davis', '555-0102', 'emily@email.com', 28, 'Female', '456 Oak Ave, Springfield'],
      ['Michael Brown', '555-0103', 'michael@email.com', 45, 'Male', '789 Pine Rd, Springfield'],
      ['Lisa Wilson', '555-0104', 'lisa@email.com', 32, 'Female', '321 Elm St, Springfield'],
      ['Robert Taylor', '555-0105', 'robert@email.com', 50, 'Male', '654 Maple Dr, Springfield'],
    ];

    for (const p of patients) {
      await pool.query(
        'INSERT OR IGNORE INTO patients (name, phone, email, age, gender, address) VALUES (?, ?, ?, ?, ?, ?)',
        p
      );
    }

    const ahmadId = docMap['ahmed@clinic.com'];
    const saraId = docMap['sara@clinic.com'];
    const usmanId = docMap['usman@clinic.com'];
    const fatimaId = docMap['fatima@clinic.com'];

    const allSlots = [
      [ahmadId, 'Mon', '09:00:00', '17:00:00', 20],
      [ahmadId, 'Tue', '09:00:00', '17:00:00', 20],
      [ahmadId, 'Wed', '09:00:00', '17:00:00', 20],
      [ahmadId, 'Thu', '09:00:00', '17:00:00', 20],
      [ahmadId, 'Fri', '09:00:00', '17:00:00', 20],
      [ahmadId, 'Sat', '09:00:00', '13:00:00', 20],
      [saraId, 'Mon', '10:00:00', '16:00:00', 20],
      [saraId, 'Tue', '10:00:00', '16:00:00', 20],
      [saraId, 'Wed', '10:00:00', '16:00:00', 20],
      [saraId, 'Thu', '10:00:00', '16:00:00', 20],
      [saraId, 'Fri', '10:00:00', '16:00:00', 20],
      [saraId, 'Sat', '10:00:00', '14:00:00', 20],
      [usmanId, 'Mon', '11:00:00', '18:00:00', 20],
      [usmanId, 'Tue', '11:00:00', '18:00:00', 20],
      [usmanId, 'Wed', '11:00:00', '18:00:00', 20],
      [usmanId, 'Thu', '11:00:00', '18:00:00', 20],
      [usmanId, 'Fri', '11:00:00', '18:00:00', 20],
      [usmanId, 'Sat', '11:00:00', '15:00:00', 20],
      [fatimaId, 'Mon', '08:00:00', '14:00:00', 20],
      [fatimaId, 'Tue', '08:00:00', '14:00:00', 20],
      [fatimaId, 'Wed', '08:00:00', '14:00:00', 20],
      [fatimaId, 'Thu', '08:00:00', '14:00:00', 20],
      [fatimaId, 'Fri', '08:00:00', '14:00:00', 20],
      [fatimaId, 'Sat', '08:00:00', '12:00:00', 20],
    ];

    for (const s of allSlots) {
      await pool.query(
        'INSERT OR IGNORE INTO time_slots (doctor_id, day_of_week, start_time, end_time, slot_duration_mins) VALUES (?, ?, ?, ?, ?)',
        s
      );
    }

    const today = new Date().toISOString().split('T')[0];
    const day1 = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const day2 = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];
    const day3 = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
    const day4 = new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0];

    const appointments = [
      [ahmadId, 1, today, '09:00:00', 1, 'confirmed', 'Annual checkup'],
      [ahmadId, 2, today, '09:20:00', 2, 'completed', 'Flu symptoms'],
      [ahmadId, 3, today, '09:40:00', 3, 'pending', 'Blood pressure check'],
      [ahmadId, 4, day1, '10:00:00', 1, 'confirmed', 'Skin rash consultation'],
      [ahmadId, 5, day1, '10:20:00', 2, 'pending', 'Follow-up visit'],
      [ahmadId, 1, day2, '11:00:00', 1, 'cancelled', 'Lab results review'],
      [ahmadId, 2, day2, '11:20:00', 2, 'confirmed', 'Vaccination'],
      [ahmadId, 3, day3, '09:00:00', 1, 'pending', 'General consultation'],
      [ahmadId, 4, day3, '09:20:00', 2, 'no_show', 'Allergy follow-up'],
      [ahmadId, 5, day4, '10:00:00', 1, 'completed', 'Diabetes management'],
      [fatimaId, 1, today, '08:00:00', 1, 'confirmed', 'Child vaccination'],
      [fatimaId, 2, today, '08:20:00', 2, 'confirmed', 'Growth checkup'],
      [fatimaId, 3, today, '08:40:00', 3, 'pending', 'Fever consultation'],
    ];

    for (const a of appointments) {
      await pool.query(
        'INSERT OR IGNORE INTO appointments (doctor_id, patient_id, appointment_date, slot_time, token_number, status, reason) VALUES (?, ?, ?, ?, ?, ?, ?)',
        a
      );
    }

    console.log('Database seeded successfully!');
    console.log('Doctor logins:');
    console.log('  ahmed@clinic.com / doctor123 (Dr. Ahmed Khan — General Physician)');
    console.log('  sara@clinic.com / doctor123 (Dr. Sara Malik — Gynecologist)');
    console.log('  usman@clinic.com / doctor123 (Dr. Usman Raza — Dermatologist)');
    console.log('  fatima@clinic.com / doctor123 (Dr. Fatima Zaidi — Pediatrician)');
  } catch (error) {
    console.error('Seed error:', error);
  }
}

seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
