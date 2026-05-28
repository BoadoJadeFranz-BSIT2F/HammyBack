const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const supabase = require('../config/supabase');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/temp');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|ppt|pptx|txt|xls|xlsx|zip/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// ===============================================
// CREATE DEADLINE WITH FILE UPLOAD
// ===============================================
router.post('/create', verifyToken, upload.array('files', 10), async (req, res) => {
  try {
    const userId = req.userId;
    const { classId, title, instructions, type, dueDate, dueTime, points, allowLateSubmission, submissionType, postKind } = req.body;
    const materialPaths = [];

    console.log('📝 Creating post:', { classId, title, type, postKind, userId });

    // Validation
    if (!classId || !title) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Verify teacher owns the class
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .eq('teacher_id', userId)
      .single();

    if (classError || !classData) {
      return res.status(403).json({ message: 'You do not have permission to create deadlines for this class' });
    }

    if (postKind === 'material') {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'Please choose at least one file for Files & Materials' });
      }

      const classUploadDir = path.join(__dirname, '../uploads', `class-${classId}`);
      await fs.mkdir(classUploadDir, { recursive: true });

      const fileRecords = [];

      for (const file of req.files) {
        const tempPath = file.path;
        const finalPath = path.join(classUploadDir, file.filename);
        await fs.rename(tempPath, finalPath);
        materialPaths.push(finalPath);

        fileRecords.push({
          class_id: parseInt(classId, 10),
          teacher_id: userId,
          file_name: file.originalname,
          file_url: `${process.env.BACKEND_URL || 'http://localhost:5000'}/uploads/class-${classId}/${file.filename}`,
          file_type: file.mimetype,
          file_size: file.size,
          title,
          description: instructions || null
        });
      }

      const { data: createdFiles, error: filesInsertError } = await supabase
        .from('class_files')
        .insert(fileRecords)
        .select();

      if (filesInsertError) {
        console.error('❌ Error creating material records:', filesInsertError);
        for (const filePath of materialPaths) {
          try {
            await fs.unlink(filePath);
          } catch (unlinkError) {
            console.error('Error cleaning material file:', unlinkError.message);
          }
        }
        return res.status(500).json({ message: 'Error posting materials', error: filesInsertError.message });
      }

      return res.status(201).json({
        message: 'Files and materials posted successfully',
        postKind: 'material',
        files: createdFiles || []
      });
    }

    if (!type) {
      return res.status(400).json({ message: 'Deadline type is required' });
    }

    // Combine date and time
    let combinedDueDate = null;
    if (dueDate && dueTime) {
      combinedDueDate = new Date(`${dueDate}T${dueTime}`).toISOString();
    } else if (dueDate) {
      combinedDueDate = new Date(dueDate).toISOString();
    }

    // Create deadline
    const { data: deadline, error: deadlineError } = await supabase
      .from('deadlines')
      .insert([{
        class_id: classId,
        teacher_id: userId,
        title,
        instructions: instructions || '',
        type,
        due_date: combinedDueDate,
        points: points ? parseInt(points) : 100,
        allow_late_submission: allowLateSubmission !== 'false',
        submission_type: submissionType || 'file'
      }])
      .select()
      .single();

    if (deadlineError) {
      console.error('❌ Error creating deadline:', deadlineError);
      return res.status(500).json({ message: 'Error creating deadline', error: deadlineError.message });
    }

    console.log('✅ Deadline created:', deadline.id);

    // Handle file uploads if any
    if (req.files && req.files.length > 0) {
      const deadlineDir = path.join(__dirname, '../uploads/deadline-files', `class-${classId}`, `deadline-${deadline.id}`);
      await fs.mkdir(deadlineDir, { recursive: true });

      const fileRecords = [];

      for (const file of req.files) {
        const tempPath = file.path;
        const finalPath = path.join(deadlineDir, file.filename);
        
        // Move file from temp to final location
        await fs.rename(tempPath, finalPath);

        fileRecords.push({
          deadline_id: deadline.id,
          file_name: file.originalname,
          file_path: `/uploads/deadline-files/class-${classId}/deadline-${deadline.id}/${file.filename}`,
          file_type: file.mimetype,
          file_size: file.size
        });
      }

      // Insert file records into database
      const { error: filesError } = await supabase
        .from('deadline_files')
        .insert(fileRecords);

      if (filesError) {
        console.error('❌ Error saving file records:', filesError);
      } else {
        console.log(`✅ Uploaded ${fileRecords.length} files for deadline ${deadline.id}`);
      }
    }

    // Note: Submissions are auto-created by database trigger for enrolled students

    res.status(201).json({
      message: 'Deadline created successfully',
      deadline: deadline,
      filesUploaded: req.files ? req.files.length : 0
    });

  } catch (error) {
    console.error('❌ Create deadline error:', error);
    
    // Clean up uploaded files on error
    if (req.files) {
      for (const file of req.files) {
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.error('Error deleting file:', unlinkError);
        }
      }
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===============================================
// GET ALL DEADLINES FOR A CLASS
// ===============================================
router.get('/class/:classId', verifyToken, async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.userId;

    console.log('📋 Fetching deadlines for class:', classId);

    // Get deadlines
    const { data: deadlines, error: deadlinesError } = await supabase
      .from('deadlines')
      .select('*')
      .eq('class_id', classId)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (deadlinesError) {
      console.error('❌ Error fetching deadlines:', deadlinesError);
      return res.status(500).json({ message: 'Error fetching deadlines' });
    }

    // Get file counts for each deadline
    const deadlinesWithFiles = await Promise.all(
      deadlines.map(async (deadline) => {
        const { count } = await supabase
          .from('deadline_files')
          .select('*', { count: 'exact', head: true })
          .eq('deadline_id', deadline.id);

        return {
          ...deadline,
          files_count: count || 0
        };
      })
    );

    console.log(`✅ Found ${deadlines.length} deadlines`);

    res.json({ deadlines: deadlinesWithFiles });
  } catch (error) {
    console.error('❌ Get deadlines error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===============================================
// GET SINGLE DEADLINE WITH FILES
// ===============================================
router.get('/:deadlineId', verifyToken, async (req, res) => {
  try {
    const { deadlineId } = req.params;

    console.log('📄 Fetching deadline:', deadlineId);

    // Get deadline
    const { data: deadline, error: deadlineError } = await supabase
      .from('deadlines')
      .select('*')
      .eq('id', deadlineId)
      .single();

    if (deadlineError || !deadline) {
      return res.status(404).json({ message: 'Deadline not found' });
    }

    // Get files
    const { data: files, error: filesError } = await supabase
      .from('deadline_files')
      .select('*')
      .eq('deadline_id', deadlineId);

    if (filesError) {
      console.error('❌ Error fetching files:', filesError);
    }

    res.json({
      deadline: {
        ...deadline,
        files: files || []
      }
    });
  } catch (error) {
    console.error('❌ Get deadline error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===============================================
// GET SUBMISSIONS FOR A DEADLINE (TEACHER VIEW)
// ===============================================
router.get('/:deadlineId/submissions', verifyToken, async (req, res) => {
  try {
    const { deadlineId } = req.params;
    const userId = req.userId;

    console.log('📊 Fetching submissions for deadline:', deadlineId);

    // Verify teacher owns the deadline
    const { data: deadline, error: deadlineError } = await supabase
      .from('deadlines')
      .select('*, classes!inner(*)')
      .eq('id', deadlineId)
      .eq('teacher_id', userId)
      .single();

    if (deadlineError || !deadline) {
      return res.status(403).json({ message: 'Deadline not found or unauthorized' });
    }

    // Get all submissions with student info
    const { data: submissions, error: submissionsError } = await supabase
      .from('submissions')
      .select(`
        *,
        users:student_id (
          id,
          email,
          name
        )
      `)
      .eq('deadline_id', deadlineId)
      .order('users(name)', { ascending: true });

    if (submissionsError) {
      console.error('❌ Error fetching submissions:', submissionsError);
      return res.status(500).json({ message: 'Error fetching submissions' });
    }

    // Get file counts for each submission
    const submissionsWithFiles = await Promise.all(
      submissions.map(async (submission) => {
        const { data: files } = await supabase
          .from('submission_files')
          .select('*')
          .eq('submission_id', submission.id);

        return {
          ...submission,
          student_name: submission.users?.name || 'Unknown',
          student_email: submission.users?.email || '',
          files: files || [],
          files_count: files?.length || 0
        };
      })
    );

    // Sort alphabetically by student name
    submissionsWithFiles.sort((a, b) => {
      const nameA = a.student_name.toLowerCase();
      const nameB = b.student_name.toLowerCase();
      return nameA.localeCompare(nameB);
    });

    console.log(`✅ Found ${submissions.length} submissions`);

    res.json({
      deadline,
      submissions: submissionsWithFiles,
      stats: {
        total: submissions.length,
        turned_in: submissions.filter(s => s.status === 'turned_in' || s.status === 'graded').length,
        graded: submissions.filter(s => s.status === 'graded').length,
        late: submissions.filter(s => s.is_late).length
      }
    });
  } catch (error) {
    console.error('❌ Get submissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===============================================
// UPDATE DEADLINE
// ===============================================
router.put('/:deadlineId', verifyToken, async (req, res) => {
  try {
    const { deadlineId } = req.params;
    const userId = req.userId;
    const { title, instructions, dueDate, dueTime, points, allowLateSubmission } = req.body;

    // Verify ownership
    const { data: existing, error: checkError } = await supabase
      .from('deadlines')
      .select('*')
      .eq('id', deadlineId)
      .eq('teacher_id', userId)
      .single();

    if (checkError || !existing) {
      return res.status(403).json({ message: 'Deadline not found or unauthorized' });
    }

    // Update deadline
    const updates = {};
    if (title) updates.title = title;
    if (instructions !== undefined) updates.instructions = instructions;
    if (points) updates.points = parseInt(points);
    if (allowLateSubmission !== undefined) updates.allow_late_submission = allowLateSubmission;
    
    if (dueDate && dueTime) {
      updates.due_date = new Date(`${dueDate}T${dueTime}`).toISOString();
    } else if (dueDate) {
      updates.due_date = new Date(dueDate).toISOString();
    }

    const { data: updated, error: updateError } = await supabase
      .from('deadlines')
      .update(updates)
      .eq('id', deadlineId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ message: 'Error updating deadline' });
    }

    res.json({ message: 'Deadline updated successfully', deadline: updated });
  } catch (error) {
    console.error('❌ Update deadline error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===============================================
// DELETE DEADLINE
// ===============================================
router.delete('/:deadlineId', verifyToken, async (req, res) => {
  try {
    const { deadlineId } = req.params;
    const userId = req.userId;

    // Verify ownership
    const { data: deadline, error: checkError } = await supabase
      .from('deadlines')
      .select('*')
      .eq('id', deadlineId)
      .eq('teacher_id', userId)
      .single();

    if (checkError || !deadline) {
      return res.status(403).json({ message: 'Deadline not found or unauthorized' });
    }

    // Delete files from disk
    const deadlineDir = path.join(__dirname, '../uploads/deadline-files', `class-${deadline.class_id}`, `deadline-${deadlineId}`);
    try {
      await fs.rm(deadlineDir, { recursive: true, force: true });
    } catch (fsError) {
      console.error('Warning: Could not delete files:', fsError);
    }

    // Delete from database (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from('deadlines')
      .delete()
      .eq('id', deadlineId);

    if (deleteError) {
      return res.status(500).json({ message: 'Error deleting deadline' });
    }

    res.json({ message: 'Deadline deleted successfully' });
  } catch (error) {
    console.error('❌ Delete deadline error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===============================================
// DELETE SINGLE DEADLINE ATTACHMENT (TEACHER ONLY)
// ===============================================
router.delete('/file/:fileId', verifyToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.userId;

    const { data: fileRecord, error: fileError } = await supabase
      .from('deadline_files')
      .select(`
        *,
        deadlines!inner(id, teacher_id)
      `)
      .eq('id', fileId)
      .single();

    if (fileError || !fileRecord) {
      return res.status(404).json({ message: 'Deadline attachment not found' });
    }

    if (fileRecord.deadlines.teacher_id !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this attachment' });
    }

    if (fileRecord.file_path) {
      const relativePath = fileRecord.file_path.replace(/^\/+/, '');
      const diskPath = path.join(__dirname, '..', relativePath);
      try {
        await fs.unlink(diskPath);
      } catch (unlinkError) {
        console.error('Warning: could not remove attachment from disk:', unlinkError.message);
      }
    }

    const { error: deleteError } = await supabase
      .from('deadline_files')
      .delete()
      .eq('id', fileId);

    if (deleteError) {
      return res.status(500).json({ message: 'Failed to delete attachment' });
    }

    res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('❌ Delete deadline attachment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===============================================
// DEADLINE COMMENTS (for materials attached via deadline)
// ===============================================
router.get('/:deadlineId/comments', verifyToken, async (req, res) => {
  try {
    const { deadlineId } = req.params;
    const userId = req.userId;

    const { data: deadline, error: deadlineError } = await supabase
      .from('deadlines')
      .select('id, class_id, teacher_id')
      .eq('id', deadlineId)
      .single();

    if (deadlineError || !deadline) {
      return res.status(404).json({ message: 'Deadline not found' });
    }

    const isTeacher = deadline.teacher_id === userId;
    let isEnrolled = false;

    if (!isTeacher) {
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('class_id', deadline.class_id)
        .eq('user_id', userId)
        .maybeSingle();
      isEnrolled = !!enrollment;
    }

    if (!isTeacher && !isEnrolled) {
      return res.status(403).json({ message: 'Not authorized to view comments for this deadline' });
    }

    const { data: comments, error: commentsError } = await supabase
      .from('file_comments')
      .select(`
        id,
        comment_text,
        created_at,
        updated_at,
        user_id,
        users!inner(id, name, email, role, profile_picture)
      `)
      .eq('deadline_id', deadlineId)
      .order('created_at', { ascending: true });

    if (commentsError) {
      return res.status(500).json({ message: 'Failed to load comments' });
    }

    const formattedComments = (comments || []).map((comment) => ({
      id: comment.id,
      text: comment.comment_text,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      user: {
        id: comment.users.id,
        name: comment.users.name,
        email: comment.users.email,
        role: comment.users.role,
        profilePicture: comment.users.profile_picture
      }
    }));

    res.json({ comments: formattedComments });
  } catch (error) {
    console.error('❌ Get deadline comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:deadlineId/comments', verifyToken, async (req, res) => {
  try {
    const { deadlineId } = req.params;
    const userId = req.userId;
    const { comment } = req.body;

    if (!comment || !comment.trim()) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const { data: deadline, error: deadlineError } = await supabase
      .from('deadlines')
      .select('id, class_id, teacher_id')
      .eq('id', deadlineId)
      .single();

    if (deadlineError || !deadline) {
      return res.status(404).json({ message: 'Deadline not found' });
    }

    const isTeacher = deadline.teacher_id === userId;
    let isEnrolled = false;

    if (!isTeacher) {
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('class_id', deadline.class_id)
        .eq('user_id', userId)
        .maybeSingle();
      isEnrolled = !!enrollment;
    }

    if (!isTeacher && !isEnrolled) {
      return res.status(403).json({ message: 'Not authorized to comment on this deadline' });
    }

    const { data: newComment, error: insertError } = await supabase
      .from('file_comments')
      .insert({
        deadline_id: parseInt(deadlineId, 10),
        user_id: userId,
        comment_text: comment.trim()
      })
      .select(`
        id,
        comment_text,
        created_at,
        updated_at,
        user_id,
        users!inner(id, name, email, role, profile_picture)
      `)
      .single();

    if (insertError) {
      return res.status(500).json({ message: 'Failed to add comment' });
    }

    const formattedComment = {
      id: newComment.id,
      text: newComment.comment_text,
      createdAt: newComment.created_at,
      updatedAt: newComment.updated_at,
      user: {
        id: newComment.users.id,
        name: newComment.users.name,
        email: newComment.users.email,
        role: newComment.users.role,
        profilePicture: newComment.users.profile_picture
      }
    };

    res.status(201).json({ message: 'Comment added', comment: formattedComment });
  } catch (error) {
    console.error('❌ Add deadline comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/comments/:commentId', verifyToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.userId;

    const { data: comment, error: commentError } = await supabase
      .from('file_comments')
      .select('id, user_id, deadline_id')
      .eq('id', commentId)
      .single();

    if (commentError || !comment || !comment.deadline_id) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const { data: deadline } = await supabase
      .from('deadlines')
      .select('teacher_id')
      .eq('id', comment.deadline_id)
      .single();

    const isOwner = comment.user_id === userId;
    const isTeacher = deadline && deadline.teacher_id === userId;

    if (!isOwner && !isTeacher) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    const { error: deleteError } = await supabase
      .from('file_comments')
      .delete()
      .eq('id', commentId);

    if (deleteError) {
      return res.status(500).json({ message: 'Failed to delete comment' });
    }

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('❌ Delete deadline comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
