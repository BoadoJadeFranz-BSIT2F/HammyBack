const express = require('express');
const multer = require('multer');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { uploadFileToStorage, removeStorageObjectByUrl } = require('../utils/storage');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// ===============================================
// GET STUDENT'S SUBMISSION FOR A DEADLINE
// ===============================================
router.get('/deadline/:deadlineId', verifyToken, async (req, res) => {
  try {
    const { deadlineId } = req.params;
    const userId = req.userId;

    console.log('📄 Fetching submission for student:', userId, 'deadline:', deadlineId);

    // Get submission
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select('*')
      .eq('deadline_id', deadlineId)
      .eq('student_id', userId)
      .single();

    if (submissionError) {
      console.log('⚠️ No submission found, creating one...');
      
      // Check if deadline exists
      const { data: deadline } = await supabase
        .from('deadlines')
        .select('*')
        .eq('id', deadlineId)
        .single();

      if (!deadline) {
        return res.status(404).json({ message: 'Deadline not found' });
      }

      // Create submission
      const { data: newSubmission, error: createError } = await supabase
        .from('submissions')
        .insert([{
          deadline_id: deadlineId,
          student_id: userId,
          status: 'assigned',
          is_late: false
        }])
        .select()
        .single();

      if (createError) {
        return res.status(500).json({ message: 'Error creating submission' });
      }

      return res.json({ submission: { ...newSubmission, files: [] } });
    }

    // Get files
    const { data: files, error: filesError } = await supabase
      .from('submission_files')
      .select('*')
      .eq('submission_id', submission.id);

    if (filesError) {
      console.error('❌ Error fetching files:', filesError);
    }

    res.json({
      submission: {
        ...submission,
        files: files || []
      }
    });
  } catch (error) {
    console.error('❌ Get submission error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===============================================
// SUBMIT/TURN IN WORK
// ===============================================
router.post('/submit', verifyToken, upload.array('files', 10), async (req, res) => {
  let submission = null;
  try {
    const userId = req.userId;
    const { deadlineId, submissionText, submissionLink } = req.body;

    console.log('📤 Student submitting work:', { userId, deadlineId });

    if (!deadlineId) {
      return res.status(400).json({ message: 'Deadline ID required' });
    }

    // Get or create submission
    const { data: existingSubmission, error: getError } = await supabase
      .from('submissions')
      .select('*')
      .eq('deadline_id', deadlineId)
      .eq('student_id', userId)
      .single();

    submission = existingSubmission;

    if (getError) {
      // Create if doesn't exist
      const { data: newSub, error: createError } = await supabase
        .from('submissions')
        .insert([{
          deadline_id: deadlineId,
          student_id: userId,
          status: 'assigned',
          is_late: false
        }])
        .select()
        .single();

      if (createError) {
        return res.status(500).json({ message: 'Error creating submission' });
      }
      submission = newSub;
    }

    // Get deadline to determine class_id
    const { data: deadline } = await supabase
      .from('deadlines')
      .select('class_id')
      .eq('id', deadlineId)
      .single();

    if (!deadline) {
      return res.status(404).json({ message: 'Deadline not found' });
    }

    // Handle file uploads
    if (req.files && req.files.length > 0) {
      const fileRecords = [];
      const uploadedFileUrls = [];

      for (const file of req.files) {
        const objectPath = `submission-files/class-${deadline.class_id}/deadline-${deadlineId}/student-${userId}/${Date.now()}-${file.originalname}`;
        const { publicUrl } = await uploadFileToStorage(supabaseAdmin, {
          objectPath,
          file
        });
        uploadedFileUrls.push(publicUrl);

        fileRecords.push({
          submission_id: submission.id,
          file_name: file.originalname,
          file_path: publicUrl,
          file_type: file.mimetype,
          file_size: file.size
        });
      }

      // Insert file records
      const { error: filesError } = await supabase
        .from('submission_files')
        .insert(fileRecords);

      if (filesError) {
        console.error('❌ Error saving files:', filesError);
        for (const fileUrl of uploadedFileUrls) {
          try {
            await removeStorageObjectByUrl(supabaseAdmin, fileUrl);
          } catch (cleanupError) {
            console.error('Error cleaning submission file:', cleanupError.message || cleanupError);
          }
        }
      }

      console.log(`✅ Uploaded ${fileRecords.length} files`);
    }

    // Update submission status to turned_in
    const { data: updated, error: updateError } = await supabase
      .from('submissions')
      .update({
        status: 'turned_in',
        submitted_at: new Date().toISOString(),
        submission_text: submissionText || null,
        submission_link: submissionLink || null
      })
      .eq('id', submission.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating submission:', updateError);
      if (req.files && req.files.length > 0) {
        const { data: createdFiles } = await supabase
          .from('submission_files')
          .select('file_path')
          .eq('submission_id', submission.id);

        for (const file of createdFiles || []) {
          try {
            await removeStorageObjectByUrl(supabaseAdmin, file.file_path);
          } catch (cleanupError) {
            console.error('Error cleaning submission file after update failure:', cleanupError.message || cleanupError);
          }
        }

        await supabase
          .from('submission_files')
          .delete()
          .eq('submission_id', submission.id);
      }
      return res.status(500).json({ message: 'Error submitting work' });
    }

    console.log('✅ Submission turned in successfully');

    // Get updated files
    const { data: files } = await supabase
      .from('submission_files')
      .select('*')
      .eq('submission_id', submission.id);

    res.json({
      message: 'Work submitted successfully',
      submission: {
        ...updated,
        files: files || []
      }
    });

  } catch (error) {
    console.error('❌ Submit work error:', error);

    if (req.files && req.files.length > 0) {
      try {
        const { data: createdFiles } = await supabase
          .from('submission_files')
          .select('file_path')
          .eq('submission_id', submission?.id || null);

        for (const file of createdFiles || []) {
          try {
            await removeStorageObjectByUrl(supabaseAdmin, file.file_path);
          } catch (cleanupError) {
            console.error('Error cleaning submission file after exception:', cleanupError.message || cleanupError);
          }
        }
      } catch (_) {}
    }

    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===============================================
// UNSUBMIT WORK
// ===============================================
router.post('/unsubmit/:submissionId', verifyToken, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const userId = req.userId;

    console.log('↩️ Unsubmitting work:', submissionId);

    // Verify ownership
    const { data: submission, error: checkError } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .eq('student_id', userId)
      .single();

    if (checkError || !submission) {
      return res.status(403).json({ message: 'Submission not found or unauthorized' });
    }

    // Cannot unsubmit if already graded
    if (submission.status === 'graded') {
      return res.status(400).json({ message: 'Cannot unsubmit graded work' });
    }

    // Update status back to assigned
    const { data: updated, error: updateError } = await supabase
      .from('submissions')
      .update({
        status: 'assigned',
        submitted_at: null,
        is_late: false
      })
      .eq('id', submissionId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ message: 'Error unsubmitting work' });
    }

    res.json({ message: 'Work unsubmitted successfully', submission: updated });
  } catch (error) {
    console.error('❌ Unsubmit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===============================================
// GRADE SUBMISSION (TEACHER)
// ===============================================
router.put('/:submissionId/grade', verifyToken, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const userId = req.userId;
    const { grade, feedback } = req.body;

    console.log('📝 Grading submission:', submissionId, 'grade:', grade);

    // Get submission with deadline info
    const { data: submission, error: getError } = await supabase
      .from('submissions')
      .select(`
        *,
        deadlines!inner(teacher_id)
      `)
      .eq('id', submissionId)
      .single();

    if (getError || !submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Verify teacher owns the deadline
    if (submission.deadlines.teacher_id !== userId) {
      return res.status(403).json({ message: 'Unauthorized to grade this submission' });
    }

    // Update grade
    const { data: updated, error: updateError } = await supabase
      .from('submissions')
      .update({
        grade: grade ? parseInt(grade) : null,
        feedback: feedback || null,
        status: 'graded'
      })
      .eq('id', submissionId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ message: 'Error grading submission' });
    }

    console.log('✅ Submission graded successfully');

    res.json({ message: 'Submission graded successfully', submission: updated });
  } catch (error) {
    console.error('❌ Grade submission error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===============================================
// GET ALL SUBMISSIONS FOR CURRENT STUDENT
// ===============================================
router.get('/student/all', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    console.log('📚 Fetching all submissions for student:', userId);

    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select('class_id')
      .eq('user_id', userId);

    if (enrollmentsError) {
      console.error('❌ Error fetching enrollments for submissions:', enrollmentsError);
      return res.status(500).json({ message: 'Error fetching enrolled classes' });
    }

    const classIds = (enrollments || []).map((enrollment) => enrollment.class_id);

    if (classIds.length === 0) {
      return res.json({ submissions: [] });
    }

    const { data: deadlines, error: deadlinesError } = await supabase
      .from('deadlines')
      .select('id, class_id')
      .in('class_id', classIds);

    if (deadlinesError) {
      console.error('❌ Error fetching deadlines for submissions:', deadlinesError);
      return res.status(500).json({ message: 'Error fetching deadlines' });
    }

    const deadlineIds = (deadlines || []).map((deadline) => deadline.id);

    if (deadlineIds.length === 0) {
      return res.json({ submissions: [] });
    }

    const { data: existingSubmissionRows, error: existingSubmissionsError } = await supabase
      .from('submissions')
      .select('id, deadline_id')
      .eq('student_id', userId)
      .in('deadline_id', deadlineIds);

    if (existingSubmissionsError) {
      console.error('❌ Error fetching existing submissions:', existingSubmissionsError);
      return res.status(500).json({ message: 'Error fetching submissions' });
    }

    const existingDeadlineIds = new Set((existingSubmissionRows || []).map((submission) => submission.deadline_id));
    const missingSubmissions = (deadlines || [])
      .filter((deadline) => !existingDeadlineIds.has(deadline.id))
      .map((deadline) => ({
        deadline_id: deadline.id,
        student_id: userId,
        status: 'assigned',
        is_late: false
      }));

    if (missingSubmissions.length > 0) {
      const { error: insertMissingError } = await supabase
        .from('submissions')
        .insert(missingSubmissions);

      if (insertMissingError) {
        console.error('❌ Error creating missing submissions:', insertMissingError);
      }
    }

    // Get all submissions with deadline and class info
    const { data: submissions, error: submissionsError } = await supabase
      .from('submissions')
      .select(`
        *,
        deadlines!inner(
          *,
          classes!inner(*)
        )
      `)
      .eq('student_id', userId)
      .order('deadlines(due_date)', { ascending: true });

    if (submissionsError) {
      console.error('❌ Error fetching submissions:', submissionsError);
      return res.status(500).json({ message: 'Error fetching submissions' });
    }

    // Get file counts for each submission
    const submissionsWithFiles = await Promise.all(
      submissions.map(async (submission) => {
        const { count } = await supabase
          .from('submission_files')
          .select('*', { count: 'exact', head: true })
          .eq('submission_id', submission.id);

        const { count: teacherFilesCount } = await supabase
          .from('deadline_files')
          .select('*', { count: 'exact', head: true })
          .eq('deadline_id', submission.deadline_id);

        return {
          ...submission,
          files_count: count || 0,
          teacher_files_count: teacherFilesCount || 0,
          className: submission.deadlines.classes.class_name
        };
      })
    );

    console.log(`✅ Found ${submissions.length} submissions`);

    res.json({ submissions: submissionsWithFiles });
  } catch (error) {
    console.error('❌ Get student submissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===============================================
// DELETE SUBMISSION FILE
// ===============================================
router.delete('/file/:fileId', verifyToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.userId;

    // Get file with submission info
    const { data: file, error: getError } = await supabase
      .from('submission_files')
      .select(`
        *,
        submissions!inner(student_id, status)
      `)
      .eq('id', fileId)
      .single();

    if (getError || !file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Verify ownership and not graded
    if (file.submissions.student_id !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (file.submissions.status === 'graded') {
      return res.status(400).json({ message: 'Cannot delete files from graded submission' });
    }

    try {
      await removeStorageObjectByUrl(supabaseAdmin, file.file_path);
    } catch (storageError) {
      console.error('Warning: Could not delete file from storage:', storageError.message || storageError);
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('submission_files')
      .delete()
      .eq('id', fileId);

    if (deleteError) {
      return res.status(500).json({ message: 'Error deleting file' });
    }

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('❌ Delete file error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
