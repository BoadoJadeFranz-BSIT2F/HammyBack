const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const supabase = require('../config/supabase');

const isSchemaMissingError = (error) => {
  const code = error?.code;
  // 42P01: undefined_table, 42703: undefined_column, PGRST2xx: relation metadata issues
  return code === '42P01' || code === '42703' || String(code || '').startsWith('PGRST');
};

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = { id: decoded.id };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Get all schedules for current user
router.get('/', verifyToken, async (req, res) => {
  try {
    // Keep this query schema-safe: some DB setups do not have class_id FK in schedules.
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('user_id', req.user.id)
      .order('day', { ascending: true })
      .order('time', { ascending: true });

    if (error) {
      if (isSchemaMissingError(error)) {
        return res.json([]);
      }
      throw error;
    }

    const rows = data || [];

    // Optional class metadata enrichment when class_id is present.
    const classIds = [...new Set(
      rows
        .map((s) => s.class_id)
        .filter((id) => id !== null && id !== undefined)
    )];

    let classMap = new Map();
    if (classIds.length > 0) {
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, room, subject, section')
        .in('id', classIds);

      classMap = new Map((classesData || []).map((c) => [c.id, c]));
    }

    const schedules = rows.map(schedule => {
      const cls = classMap.get(schedule.class_id) || null;
      return {
      id: schedule.id,
      day: schedule.day,
      time: schedule.time,
      className: schedule.class_name,
      color: schedule.color,
      isClassSchedule: schedule.is_class_schedule || false,
      classId: schedule.class_id || null,
      room: cls?.room || null,
      subject: cls?.subject || null,
      section: cls?.section || null,
      createdAt: schedule.created_at,
      updatedAt: schedule.updated_at
    }});

    res.json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ message: 'Error fetching schedules' });
  }
});

// Create new schedule entry
router.post('/', verifyToken, async (req, res) => {
  const { day, time, className, color } = req.body;

  if (!day || !time || !className) {
    return res.status(400).json({ message: 'Day, time, and class name are required' });
  }

  try {
    // Check if schedule already exists for this time slot
    const { data: existingSchedule } = await supabase
      .from('schedules')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('day', day)
      .eq('time', time)
      .single();

    if (existingSchedule) {
      return res.status(400).json({ message: 'A class already exists at this time slot' });
    }

    const { data, error } = await supabase
      .from('schedules')
      .insert([{
        user_id: req.user.id,
        day,
        time,
        class_name: className,
        color: color || '#ccefe1'
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      id: data.id,
      day: data.day,
      time: data.time,
      className: data.class_name,
      color: data.color,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    });
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ message: 'Error creating schedule' });
  }
});

// Update schedule entry
router.put('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { className, color } = req.body;

  try {
    const { data, error } = await supabase
      .from('schedules')
      .update({
        class_name: className,
        color: color,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    res.json({
      id: data.id,
      day: data.day,
      time: data.time,
      className: data.class_name,
      color: data.color,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ message: 'Error updating schedule' });
  }
});

// Delete schedule entry
router.delete('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ message: 'Error deleting schedule' });
  }
});

// Get off days for current user
router.get('/off-days/all', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('student_off_days')
      .select('*')
      .eq('user_id', req.user.id)
      .order('day', { ascending: true });

    if (error) {
      if (isSchemaMissingError(error)) {
        return res.json([]);
      }
      throw error;
    }
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching off days:', error);
    res.status(500).json({ message: 'Error fetching off days' });
  }
});

// Create an off day
router.post('/off-days', verifyToken, async (req, res) => {
  try {
    const { day, reason, color } = req.body;
    if (!day || !reason) {
      return res.status(400).json({ message: 'Day and reason are required' });
    }

    const { data, error } = await supabase
      .from('student_off_days')
      .insert([
        {
          user_id: req.user.id,
          day,
          reason,
          color: color || '#ffebee'
        }
      ])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating off day:', error);
    res.status(500).json({ message: 'Error creating off day' });
  }
});

// Delete an off day
router.delete('/off-days/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('student_off_days')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'Off day not found' });
    }

    res.json({ message: 'Off day deleted successfully' });
  } catch (error) {
    console.error('Error deleting off day:', error);
    res.status(500).json({ message: 'Error deleting off day' });
  }
});

module.exports = router;
