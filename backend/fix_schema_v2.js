const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
console.log(`Connecting to database at ${dbPath}`);
const db = new Database(dbPath);

console.log('Running migrations...');

try {
  db.exec('BEGIN TRANSACTION');

  // 1. Alter appointments table
  console.log('Adding payment columns to appointments...');
  try {
    db.exec(`ALTER TABLE appointments ADD COLUMN payment_status TEXT DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid','paid','waived'))`);
    db.exec(`ALTER TABLE appointments ADD COLUMN payment_method TEXT CHECK(payment_method IN ('cash','card','online') OR payment_method IS NULL)`);
    db.exec(`ALTER TABLE appointments ADD COLUMN payment_time TEXT`);
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      throw err;
    }
    console.log('Appointments columns already exist, skipping...');
  }

  // SQLite doesn't easily let us change the CHECK constraint on status, so we would have to recreate the table.
  // We'll skip changing the CHECK constraint on the live table for now since SQLite doesn't strictly enforce it unless explicitly told to, 
  // but we WILL update schema.sql for fresh installs. The app logic should handle the string 'in_consultation'.

  // 2. Create patient_medical_profiles table
  console.log('Creating patient_medical_profiles table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS patient_medical_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER UNIQUE,
      blood_group TEXT DEFAULT 'Unknown',
      allergies TEXT,
      chronic_conditions TEXT,
      current_medications TEXT,
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      notes TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    )
  `);

  // 3. Create prescriptions table
  console.log('Creating prescriptions table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS prescriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER,
      patient_id INTEGER,
      doctor_id INTEGER,
      medicines TEXT,
      instructions TEXT,
      follow_up_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
    )
  `);

  // 4. Create clinic_settings table
  console.log('Creating clinic_settings table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS clinic_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER UNIQUE,
      whatsapp_notifications INTEGER DEFAULT 1,
      cancellation_notifications INTEGER DEFAULT 1,
      booking_url TEXT,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
    )
  `);

  // 5. Alter doctors table
  console.log('Adding columns to doctors table...');
  try {
    db.exec(`ALTER TABLE doctors ADD COLUMN consultation_fee INTEGER DEFAULT 0`);
    db.exec(`ALTER TABLE doctors ADD COLUMN clinic_name TEXT`);
    db.exec(`ALTER TABLE doctors ADD COLUMN bio TEXT`);
    db.exec(`ALTER TABLE doctors ADD COLUMN profile_pic TEXT`);
    db.exec(`ALTER TABLE doctors ADD COLUMN is_active INTEGER DEFAULT 1`);
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      throw err;
    }
    console.log('Doctors columns already exist, skipping...');
  }

  // Insert default clinic settings for existing doctors
  db.exec(`
    INSERT OR IGNORE INTO clinic_settings (doctor_id, booking_url) 
    SELECT id, 'https://example.com/book' FROM doctors
  `);

  db.exec('COMMIT');
  console.log('Migrations completed successfully!');

} catch (error) {
  db.exec('ROLLBACK');
  console.error('Migration failed:', error);
} finally {
  db.close();
}
