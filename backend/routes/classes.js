const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const supabase = require('../config/supabase');
const router = express.Router();

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Join a class
router.post('/join', verifyToken, async (req, res) => {
  try {
    const { classCode } = req.body;
    const userId = req.userId;

    if (!classCode) {
      return res.status(400).json({ message: 'Class code is required' });
    }

    // Find the class by code
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('*')
      .eq('class_code', classCode.toUpperCase())
      .single();

    if (classError || !classData) {
      return res.status(404).json({ message: 'Invalid class code' });
    }

    // Check if already enrolled
    const { data: existingEnrollment } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', userId)
      .eq('class_id', classData.id)
      .single();

    if (existingEnrollment) {
      return res.status(400).json({ message: 'Already enrolled in this class' });
    }

    // Create enrollment
    const { data: enrollment, error: enrollError } = await supabase
      .from('enrollments')
      .insert([
        {
          user_id: userId,
          class_id: classData.id
        }
      ])
      .select()
      .single();

    if (enrollError) {
      console.error('Enrollment error:', enrollError);
      return res.status(500).json({ message: 'Error enrolling in class' });
    }

    // Get class schedules
    console.log(`Fetching schedules for class ${classData.class_name} (ID: ${classData.id})`);
    const { data: classSchedules, error: scheduleError } = await supabase
      .from('class_schedules')
      .select('*')
      .eq('class_id', classData.id);

    if (scheduleError) {
      console.error('Fetch class schedules error:', scheduleError);
      // Don't fail enrollment if schedules table doesn't exist
      console.log('Note: class_schedules table may not exist yet. Skipping schedule copy.');
    }

    // Copy class schedules to student's personal schedule (if any exist)
    if (classSchedules && classSchedules.length > 0) {
      console.log(`Found ${classSchedules.length} class schedules to copy to student (${userId})`);
      const studentSchedules = classSchedules.map(schedule => ({
        user_id: userId,
        class_id: classData.id,
        day: schedule.day,
        time: schedule.time,
        class_name: classData.class_name,
        color: '#ccefe1',
        is_class_schedule: true
      }));

      console.log('Copying schedules to student:', studentSchedules);
      const { data: copiedSchedules, error: insertScheduleError } = await supabase
        .from('schedules')
        .insert(studentSchedules)
        .select();

      if (insertScheduleError) {
        console.error('Error copying schedules to student:', insertScheduleError);
        // Don't fail the enrollment, just log the error
      } else {
        console.log(`✓ Successfully copied ${copiedSchedules.length} schedules to student's calendar`);
      }
    } else {
      console.log('No class schedules found to copy');
    }

    res.json({
      message: 'Successfully joined class',
      class: {
        id: classData.id,
        classCode: classData.class_code,
        className: classData.class_name,
        section: classData.section,
        subject: classData.subject,
        room: classData.room
      }
    });
  } catch (error) {
    console.error('Join class error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get enrolled classes
router.get('/enrolled', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    console.log('Fetching enrolled classes for user:', userId);

    // Get all enrollments for the user
    const { data: enrollments, error: enrollError } = await supabase
      .from('enrollments')
      .select('class_id, enrolled_at')
      .eq('user_id', userId)
      .order('enrolled_at', { ascending: false });

    if (enrollError) {
      console.error('Fetch enrollments error:', enrollError);
      return res.status(500).json({ message: 'Error fetching enrolled classes' });
    }

    console.log('Found enrollments:', enrollments);

    if (!enrollments || enrollments.length === 0) {
      console.log('No enrollments found for user');
      return res.json({ classes: [] });
    }

    // Get class details for each enrollment
    const classIds = enrollments.map(e => e.class_id);
    console.log('Fetching class details for IDs:', classIds);
    
    const { data: classesData, error } = await supabase
      .from('classes')
      .select('*')
      .in('id', classIds);

    if (error) {
      console.error('Fetch classes error:', error);
      return res.status(500).json({ message: 'Error fetching enrolled classes' });
    }

    console.log('Found classes:', classesData);

    // Map enrollments with their class data, filtering out deleted classes
    const classes = enrollments
      .map(enrollment => {
        const classData = classesData.find(c => c.id === enrollment.class_id);
        if (!classData) {
          console.warn('No class data found for class_id:', enrollment.class_id, '- Class may have been deleted');
          return null;
        }
        return {
          id: classData.id,
          classCode: classData.class_code,
          className: classData.class_name,
          section: classData.section,
          subject: classData.subject,
          room: classData.room,
          enrolledAt: enrollment.enrolled_at
        };
      })
      .filter(c => c !== null); // Remove any null entries

    // Clean up orphaned enrollments (enrollments with no class)
    const orphanedEnrollments = enrollments.filter(
      e => !classesData.find(c => c.id === e.class_id)
    );
    
    if (orphanedEnrollments.length > 0) {
      console.log(`Found ${orphanedEnrollments.length} orphaned enrollments, cleaning up...`);
      for (const orphaned of orphanedEnrollments) {
        await supabase
          .from('enrollments')
          .delete()
          .eq('user_id', userId)
          .eq('class_id', orphaned.class_id);
      }
      console.log('✓ Cleaned up orphaned enrollments');
    }

    console.log('Returning classes:', classes);
    res.json({ classes });
  } catch (error) {
    console.error('Get enrolled classes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new class (for teachers)
router.post('/create', verifyToken, async (req, res) => {
  try {
    const { className, section, subject, room, schedules } = req.body;
    const userId = req.userId;

    // Validate required fields
    if (!className || !section) {
      return res.status(400).json({ message: 'Class name and section are required' });
    }

    // Generate a unique class code
    const classCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Create the class
    const { data: newClass, error } = await supabase
      .from('classes')
      .insert([
        {
          class_name: className,
          section: section,
          subject: subject || null,
          room: room || null,
          class_code: classCode,
          teacher_id: userId
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Create class error:', error);
      return res.status(500).json({ message: 'Error creating class' });
    }

    // Insert class schedules if provided
    if (schedules && schedules.length > 0) {
      console.log(`Creating ${schedules.length} schedules for class ${newClass.class_name}:`, schedules);
      const scheduleRecords = schedules.map(schedule => ({
        class_id: newClass.id,
        day: schedule.day,
        time: schedule.time,
        duration_minutes: 60
      }));

      const { data: insertedSchedules, error: scheduleError } = await supabase
        .from('class_schedules')
        .insert(scheduleRecords)
        .select();

      if (scheduleError) {
        console.error('Create class schedules error:', scheduleError);
        // Don't rollback - class creation succeeded, just log the schedule error
        console.log('Class created but schedules could not be added. You may need to run the database migration.');
      } else {
        console.log(`✓ Successfully created ${insertedSchedules.length} schedules for class`);
      }
    } else {
      console.log('No schedules provided for this class');
    }

    res.status(201).json({
      message: 'Class created successfully',
      class: {
        id: newClass.id,
        className: newClass.class_name,
        section: newClass.section,
        subject: newClass.subject,
        room: newClass.room,
        classCode: newClass.class_code,
        createdAt: newClass.created_at
      }
    });
  } catch (error) {
    console.error('Create class error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all classes for a teacher
router.get('/my-classes', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    const { data: classes, error } = await supabase
      .from('classes')
      .select('*')
      .eq('teacher_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching classes:', error);
      return res.status(500).json({ message: 'Error fetching classes' });
    }

    res.json({
      classes: classes.map(cls => ({
        id: cls.id,
        className: cls.class_name,
        section: cls.section,
        subject: cls.subject,
        room: cls.room,
        classCode: cls.class_code,
        createdAt: cls.created_at
      }))
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Leave a class (delete enrollment)
router.delete('/:classId/leave', verifyToken, async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.userId;

    // Delete the student's schedules for this class
    const { error: scheduleDeleteError } = await supabase
      .from('schedules')
      .delete()
      .eq('user_id', userId)
      .eq('class_id', classId);

    if (scheduleDeleteError) {
      console.error('Error deleting schedules:', scheduleDeleteError);
      // Continue with enrollment deletion even if schedule deletion fails
    }

    // Delete the enrollment
    const { error } = await supabase
      .from('enrollments')
      .delete()
      .eq('user_id', userId)
      .eq('class_id', classId);

    if (error) {
      console.error('Leave class error:', error);
      return res.status(500).json({ message: 'Error leaving class' });
    }

    res.json({ message: 'Successfully left the class' });
  } catch (error) {
    console.error('Leave class error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get class schedules (for viewing class details)
router.get('/:classId/schedules', verifyToken, async (req, res) => {
  try {
    const { classId } = req.params;

    const { data: schedules, error } = await supabase
      .from('class_schedules')
      .select('*')
      .eq('class_id', classId)
      .order('day', { ascending: true })
      .order('time', { ascending: true });

    if (error) {
      console.error('Error fetching class schedules:', error);
      return res.status(500).json({ message: 'Error fetching class schedules' });
    }

    res.json({ schedules });
  } catch (error) {
    console.error('Get class schedules error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a class (for teachers only)
router.delete('/:classId', verifyToken, async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.userId;

    // Verify the teacher owns this class
    const { data: classData, error: fetchError } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .eq('teacher_id', userId)
      .single();

    if (fetchError || !classData) {
      return res.status(404).json({ message: 'Class not found or you do not have permission to delete it' });
    }

    // Delete the class (cascading deletes will handle enrollments, schedules, etc.)
    const { error: deleteError } = await supabase
      .from('classes')
      .delete()
      .eq('id', classId)
      .eq('teacher_id', userId);

    if (deleteError) {
      console.error('Delete class error:', deleteError);
      return res.status(500).json({ message: 'Error deleting class' });
    }

    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get students enrolled in a class (for teachers)
router.get('/:classId/students', verifyToken, async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.userId;

    console.log('📊 Fetching students for class:', classId, 'by teacher:', userId);

    // Verify the teacher owns this class
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .eq('teacher_id', userId)
      .single();

    if (classError) {
      console.error('❌ Class verification error:', classError);
      return res.status(404).json({ message: 'Class not found or you do not have permission to view it' });
    }

    if (!classData) {
      console.error('❌ No class data found');
      return res.status(404).json({ message: 'Class not found or you do not have permission to view it' });
    }

    console.log('✅ Class verified:', classData.class_name);

    // Get all enrollments for this class with user details
    const { data: enrollments, error: enrollError } = await supabase
      .from('enrollments')
      .select(`
        user_id,
        enrolled_at,
        users:user_id (
          id,
          email,
          name
        )
      `)
      .eq('class_id', classId)
      .order('enrolled_at', { ascending: false });

    if (enrollError) {
      console.error('❌ Enrollments query error:', enrollError);
      console.error('❌ Full error details:', JSON.stringify(enrollError, null, 2));
      return res.status(500).json({ message: 'Error fetching students', error: enrollError.message });
    }

    console.log('📥 Raw enrollments data:', enrollments);
    console.log('👥 Number of enrollments:', enrollments?.length || 0);

    // Format the response
    const students = enrollments.map(enrollment => ({
      user_id: enrollment.user_id,
      email: enrollment.users?.email,
      full_name: enrollment.users?.name,  // Map 'name' to 'full_name' for frontend
      enrolled_at: enrollment.enrolled_at
    }));

    console.log('✅ Formatted students:', students);
    res.json({ students });
  } catch (error) {
    console.error('❌ Get class students error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
