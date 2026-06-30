const express = require('express');
const pool = require('../db');
const authenticate = require('../middleware/auth');

const router = express.Router();

const DAY_MAP = {
  0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed',
  4: 'Thu', 5: 'Fri', 6: 'Sat',
};

function generateTimeSlots(startTime, endTime, durationMins) {
  const slots = [];
  const start = new Date(`1970-01-01T${startTime}`);
  const end = new Date(`1970-01-01T${endTime}`);

  let current = new Date(start);
  while (current < end) {
    const next = new Date(current.getTime() + durationMins * 60000);
    if (next > end) break;

    const hh = String(current.getHours()).padStart(2, '0');
    const mm = String(current.getMinutes()).padStart(2, '0');
    slots.push(`${hh}:${mm}:00`);

    current = next;
  }

  return slots;
}

router.get('/available', async (req, res) => {
  try {
    const { date, doctor_id } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Date query parameter is required (YYYY-MM-DD).',
      });
    }

    const dateObj = new Date(date + 'T00:00:00');
    const dayIndex = dateObj.getDay();
    const dayOfWeek = DAY_MAP[dayIndex];

    if (!dayOfWeek || dayOfWeek === 'Sun') {
      return res.json({ success: true, data: [], message: 'No appointments on Sundays.' });
    }

    const params = [dayOfWeek];
    let doctorFilter = '';
    if (doctor_id) {
      doctorFilter = ' AND doctor_id = ?';
      params.push(doctor_id);
    }

    const [configSlots] = await pool.query(
      `SELECT * FROM time_slots WHERE day_of_week = ? AND is_active = TRUE${doctorFilter}`,
      params
    );

    if (configSlots.length === 0) {
      return res.json({ success: true, data: [], message: 'No slots configured for this day.' });
    }

    const blockedParams = [date];
    let blockedDoctorFilter = '';
    if (doctor_id) {
      blockedDoctorFilter = ' AND doctor_id = ?';
      blockedParams.push(doctor_id);
    }

    const [blockedDates] = await pool.query(
      `SELECT id FROM blocked_dates WHERE blocked_date = ?${blockedDoctorFilter}`,
      blockedParams
    );
    if (blockedDates.length > 0) {
      return res.json({ success: true, data: [], message: 'This date is blocked.' });
    }

    const bookedParams = [date];
    let bookedDoctorFilter = '';
    if (doctor_id) {
      bookedDoctorFilter = ' AND doctor_id = ?';
      bookedParams.push(doctor_id);
    }

    const [bookedSlots] = await pool.query(
      `SELECT slot_time FROM appointments
       WHERE appointment_date = ? AND status NOT IN ('cancelled', 'no_show')${bookedDoctorFilter}`,
      bookedParams
    );
    const bookedTimes = new Set(bookedSlots.map((b) => b.slot_time.substring(0, 8)));

    const allAvailable = [];

    for (const slot of configSlots) {
      const generated = generateTimeSlots(slot.start_time, slot.end_time, slot.slot_duration_mins);
      for (const time of generated) {
        if (!bookedTimes.has(time)) {
          allAvailable.push({
            time,
            label: new Date(`1970-01-01T${time}`).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            }),
          });
        }
      }
    }

    res.json({ success: true, data: allAvailable, message: 'Available slots retrieved.' });
  } catch (error) {
    console.error('Get available slots error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM time_slots WHERE doctor_id = ? ORDER BY CASE day_of_week WHEN 'Mon' THEN 1 WHEN 'Tue' THEN 2 WHEN 'Wed' THEN 3 WHEN 'Thu' THEN 4 WHEN 'Fri' THEN 5 WHEN 'Sat' THEN 6 END, start_time",
      [req.doctor.id]
    );
    res.json({ success: true, data: rows, message: 'Time slots retrieved.' });
  } catch (error) {
    console.error('Get slots error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { day_of_week, start_time, end_time, slot_duration_mins } = req.body;
    const VALID_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    if (!day_of_week || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'day_of_week, start_time, and end_time are required.',
      });
    }

    if (!VALID_DAYS.includes(day_of_week)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'day_of_week must be one of: Mon, Tue, Wed, Thu, Fri, Sat.',
      });
    }

    const [existing] = await pool.query(
      'SELECT id FROM time_slots WHERE doctor_id = ? AND day_of_week = ? AND start_time = ? AND end_time = ?',
      [req.doctor.id, day_of_week, start_time, end_time]
    );
    if (existing.length > 0) {
      return res.json({
        success: true,
        data: existing[0],
        message: 'This slot configuration already exists.',
      });
    }

    const [result] = await pool.query(
      'INSERT INTO time_slots (doctor_id, day_of_week, start_time, end_time, slot_duration_mins) VALUES (?, ?, ?, ?, ?)',
      [req.doctor.id, day_of_week, start_time, end_time, slot_duration_mins || 20]
    );

    const [slot] = await pool.query('SELECT * FROM time_slots WHERE id = ?', [result.insertId]);

    res.status(201).json({ success: true, data: slot[0], message: 'Time slot created.' });
  } catch (error) {
    console.error('Create slot error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.put('/:id/toggle', authenticate, async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT * FROM time_slots WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, data: null, message: 'Time slot not found.' });
    }

    if (existing[0].doctor_id !== req.doctor.id) {
      return res.status(403).json({ success: false, data: null, message: 'Access denied. This slot does not belong to you.' });
    }

    const newActive = !existing[0].is_active;
    await pool.query('UPDATE time_slots SET is_active = ? WHERE id = ?', [newActive, req.params.id]);

    res.json({
      success: true,
      data: { id: parseInt(req.params.id), is_active: newActive },
      message: `Slot ${newActive ? 'activated' : 'deactivated'}.`,
    });
  } catch (error) {
    console.error('Toggle slot error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT * FROM time_slots WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, data: null, message: 'Time slot not found.' });
    }

    if (existing[0].doctor_id !== req.doctor.id) {
      return res.status(403).json({ success: false, data: null, message: 'Access denied. This slot does not belong to you.' });
    }

    await pool.query('DELETE FROM time_slots WHERE id = ?', [req.params.id]);

    res.json({ success: true, data: null, message: 'Time slot deleted.' });
  } catch (error) {
    console.error('Delete slot error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.post('/blocked-dates', authenticate, async (req, res) => {
  try {
    const { blocked_date, reason } = req.body;
    const doctorId = req.doctor.id;

    if (!blocked_date) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'blocked_date is required.',
      });
    }

    const [existing] = await pool.query(
      'SELECT id FROM blocked_dates WHERE doctor_id = ? AND blocked_date = ?',
      [doctorId, blocked_date]
    );
    if (existing.length > 0) {
      return res.json({
        success: true,
        data: existing[0],
        message: 'This date is already blocked.',
      });
    }

    const [result] = await pool.query(
      'INSERT INTO blocked_dates (doctor_id, blocked_date, reason) VALUES (?, ?, ?)',
      [doctorId, blocked_date, reason || null]
    );

    const [blocked] = await pool.query('SELECT * FROM blocked_dates WHERE id = ?', [result.insertId]);

    res.status(201).json({ success: true, data: blocked[0], message: 'Date blocked.' });
  } catch (error) {
    console.error('Block date error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.get('/blocked-dates', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM blocked_dates WHERE doctor_id = ? ORDER BY blocked_date DESC',
      [req.doctor.id]
    );
    res.json({ success: true, data: rows, message: 'Blocked dates retrieved.' });
  } catch (error) {
    console.error('Get blocked dates error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.delete('/blocked-dates/:id', authenticate, async (req, res) => {
  try {
    const [existing] = await pool.query(
      'SELECT * FROM blocked_dates WHERE id = ?',
      [req.params.id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ success: false, data: null, message: 'Blocked date not found.' });
    }

    if (existing[0].doctor_id !== req.doctor.id) {
      return res.status(403).json({ success: false, data: null, message: 'Access denied.' });
    }

    await pool.query('DELETE FROM blocked_dates WHERE id = ?', [req.params.id]);

    res.json({ success: true, data: null, message: 'Date unblocked.' });
  } catch (error) {
    console.error('Delete blocked date error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

module.exports = router;
