-- ============================================
-- Doctor Appointment System - Database Schema
-- ============================================

CREATE DATABASE IF NOT EXISTS doctor_appointment;
USE doctor_appointment;

-- Doctors table
CREATE TABLE IF NOT EXISTS doctors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  specialization VARCHAR(100),
  clinic_name VARCHAR(150),
  profile_pic VARCHAR(255),
  bio TEXT,
  is_active TINYINT(1) DEFAULT 1,
  consultation_fee INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(100),
  age INT,
  gender ENUM('Male', 'Female', 'Other'),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_phone (phone)
);

-- Time slots table
CREATE TABLE IF NOT EXISTS time_slots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT NOT NULL,
  day_of_week ENUM('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat') NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_mins INT DEFAULT 20,
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);

-- Blocked dates table
CREATE TABLE IF NOT EXISTS blocked_dates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT NOT NULL,
  blocked_date DATE NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT NOT NULL,
  patient_id INT NOT NULL,
  appointment_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  token_number INT NOT NULL,
  status ENUM('pending', 'confirmed', 'in_consultation', 'completed', 'cancelled', 'no_show') DEFAULT 'pending',
  payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid','paid','waived')),
  payment_method VARCHAR(20) CHECK(payment_method IN ('cash','card','online') OR payment_method IS NULL),
  payment_time TIMESTAMP,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  INDEX idx_appointment_date (appointment_date),
  INDEX idx_patient_phone (patient_id)
);

-- Patient Medical Profiles table
CREATE TABLE IF NOT EXISTS patient_medical_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT UNIQUE,
  blood_group VARCHAR(10) DEFAULT 'Unknown',
  allergies TEXT,
  chronic_conditions TEXT,
  current_medications TEXT,
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  notes TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Prescriptions table
CREATE TABLE IF NOT EXISTS prescriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  appointment_id INT,
  patient_id INT,
  doctor_id INT,
  medicines TEXT,
  instructions TEXT,
  follow_up_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);

-- Clinic Settings table
CREATE TABLE IF NOT EXISTS clinic_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT UNIQUE,
  whatsapp_notifications TINYINT(1) DEFAULT 1,
  cancellation_notifications TINYINT(1) DEFAULT 1,
  booking_url VARCHAR(255),
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);

-- ============================================
-- Seed Data
-- ============================================

-- Doctor (password: doctor123, bcrypt hash)
INSERT INTO doctors (name, email, password_hash, phone, specialization) VALUES
('Dr. Sarah Johnson', 'sarah@clinic.com', '$2a$10$5jd.AL.nr1ivs4BDr0638uIPUe2eW1aSURw78DQ3q86ImGmG/H2UC', '555-0100', 'General Medicine');

-- Patients
INSERT INTO patients (name, phone, email, age, gender, address) VALUES
('John Smith', '555-0101', 'john@email.com', 35, 'Male', '123 Main St, Springfield'),
('Emily Davis', '555-0102', 'emily@email.com', 28, 'Female', '456 Oak Ave, Springfield'),
('Michael Brown', '555-0103', 'michael@email.com', 45, 'Male', '789 Pine Rd, Springfield'),
('Lisa Wilson', '555-0104', 'lisa@email.com', 32, 'Female', '321 Elm St, Springfield'),
('Robert Taylor', '555-0105', 'robert@email.com', 50, 'Male', '654 Maple Dr, Springfield');

-- Time slots (Mon-Sat, 9:00 AM to 5:00 PM, 20 min slots)
INSERT INTO time_slots (doctor_id, day_of_week, start_time, end_time, slot_duration_mins) VALUES
(1, 'Mon', '09:00:00', '17:00:00', 20),
(1, 'Tue', '09:00:00', '17:00:00', 20),
(1, 'Wed', '09:00:00', '17:00:00', 20),
(1, 'Thu', '09:00:00', '17:00:00', 20),
(1, 'Fri', '09:00:00', '17:00:00', 20),
(1, 'Sat', '09:00:00', '13:00:00', 20);

-- Appointments (10 sample appointments with mixed statuses)
INSERT INTO appointments (doctor_id, patient_id, appointment_date, slot_time, token_number, status, reason) VALUES
(1, 1, CURDATE(), '09:00:00', 1, 'confirmed', 'Annual checkup'),
(1, 2, CURDATE(), '09:20:00', 2, 'completed', 'Flu symptoms'),
(1, 3, CURDATE(), '09:40:00', 3, 'pending', 'Blood pressure check'),
(1, 4, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '10:00:00', 1, 'confirmed', 'Skin rash consultation'),
(1, 5, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '10:20:00', 2, 'pending', 'Follow-up visit'),
(1, 1, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '11:00:00', 1, 'cancelled', 'Lab results review'),
(1, 2, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '11:20:00', 2, 'confirmed', 'Vaccination'),
(1, 3, DATE_ADD(CURDATE(), INTERVAL 3 DAY), '09:00:00', 1, 'pending', 'General consultation'),
(1, 4, DATE_ADD(CURDATE(), INTERVAL 3 DAY), '09:20:00', 2, 'no_show', 'Allergy follow-up'),
(1, 5, DATE_ADD(CURDATE(), INTERVAL 4 DAY), '10:00:00', 1, 'completed', 'Diabetes management');
