const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const supabase = require('../config/supabase');
const router = express.Router();

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Get all deadlines for a specific class
router.get('/class/:classId', verifyToken, async (req, res) => {
  try {
    const { classId } = req.params;

    // Verify user is enrolled in the class or is the teacher
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('class_id', classId)
      .single();

    const { data: classData } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .eq('teacher_id', req.user.id)
      .single();

    if (!enrollment && !classData) {
      return res.status(403).json({ message: 'Not authorized to view these deadlines' });
    }

    // Get deadlines for the class
    const { data: deadlines, error } = await supabase
      .from('deadlines')
      .select('*')
      .eq('class_id', classId)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ message: 'Error fetching deadlines' });
    }

    res.json(deadlines);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all deadlines for the current user (student view - all enrolled classes)
router.get('/my-deadlines', verifyToken, async (req, res) => {
  try {
    // Get all classes the user is enrolled in
    const { data: enrollments, error: enrollError } = await supabase
      .from('enrollments')
      .select('class_id')
      .eq('user_id', req.user.id);

    if (enrollError) {
      console.error('Supabase error:', enrollError);
      return res.status(500).json({ message: 'Error fetching enrollments' });
    }

    const classIds = enrollments.map(e => e.class_id);

    if (classIds.length === 0) {
      return res.json([]);
    }

    // Get all deadlines for enrolled classes
    const { data: deadlines, error } = await supabase
      .from('deadlines')
      .select(`
        *,
        classes:class_id (
          class_name,
          section,
          class_code
        )
      `)
      .in('class_id', classIds)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ message: 'Error fetching deadlines' });
    }

    res.json(deadlines);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new deadline (teachers only)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { classId, title, description, type, dueDate } = req.body;

    // Validate required fields
    if (!classId || !title || !type || !dueDate) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Verify user is the teacher of the class
    const { data: classData } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .eq('teacher_id', req.user.id)
      .single();

    if (!classData) {
      return res.status(403).json({ message: 'Not authorized to create deadlines for this class' });
    }

    // Create deadline
    const { data: newDeadline, error } = await supabase
      .from('deadlines')
      .insert([
        {
          class_id: classId,
          teacher_id: req.user.id,
          title,
          description,
          type,
          due_date: dueDate,
          is_completed: false
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ message: 'Error creating deadline' });
    }

    res.status(201).json(newDeadline);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a deadline (teachers only)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, type, dueDate, isCompleted } = req.body;

    // Verify user is the teacher who created the deadline
    const { data: deadline } = await supabase
      .from('deadlines')
      .select('*')
      .eq('id', id)
      .eq('teacher_id', req.user.id)
      .single();

    if (!deadline) {
      return res.status(403).json({ message: 'Not authorized to update this deadline' });
    }

    // Prepare update data
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (dueDate !== undefined) updateData.due_date = dueDate;
    if (isCompleted !== undefined) {
      updateData.is_completed = isCompleted;
      if (isCompleted) {
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_at = null;
      }
    }

    // Update deadline
    const { data: updatedDeadline, error } = await supabase
      .from('deadlines')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ message: 'Error updating deadline' });
    }

    res.json(updatedDeadline);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a deadline (teachers only)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user is the teacher who created the deadline
    const { data: deadline } = await supabase
      .from('deadlines')
      .select('*')
      .eq('id', id)
      .eq('teacher_id', req.user.id)
      .single();

    if (!deadline) {
      return res.status(403).json({ message: 'Not authorized to delete this deadline' });
    }

    // Delete deadline
    const { error } = await supabase
      .from('deadlines')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ message: 'Error deleting deadline' });
    }

    res.json({ message: 'Deadline deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark deadline as complete/incomplete (teachers only)
router.patch('/:id/complete', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { isCompleted } = req.body;

    // Verify user is the teacher who created the deadline
    const { data: deadline } = await supabase
      .from('deadlines')
      .select('*')
      .eq('id', id)
      .eq('teacher_id', req.user.id)
      .single();

    if (!deadline) {
      return res.status(403).json({ message: 'Not authorized to update this deadline' });
    }

    // Update completion status
    const { data: updatedDeadline, error } = await supabase
      .from('deadlines')
      .update({
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ message: 'Error updating deadline' });
    }

    res.json(updatedDeadline);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all deadlines created by the teacher (all their classes)
router.get('/teacher-deadlines', verifyToken, async (req, res) => {
  try {
    // Get all deadlines created by this teacher
    const { data: deadlines, error } = await supabase
      .from('deadlines')
      .select(`
        *,
        classes:class_id (
          class_name,
          section,
          class_code
        )
      `)
      .eq('teacher_id', req.user.id)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ message: 'Error fetching deadlines' });
    }

    res.json(deadlines);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
