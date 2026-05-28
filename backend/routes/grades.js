const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const supabase = require('../config/supabase');
const router = express.Router();

const isSchemaCompatibilityError = (error) => {
  if (!error) return false;

  const message = String(error.message || '').toLowerCase();
  const details = String(error.details || '').toLowerCase();

  return (
    ['42P01', '42703', 'PGRST200', 'PGRST204'].includes(error.code) ||
    message.includes('does not exist') ||
    details.includes('does not exist') ||
    message.includes('relationship') ||
    details.includes('relationship') ||
    message.includes('schema cache') ||
    details.includes('schema cache')
  );
};

const toPercent = (score, maxScore) => {
  const s = Number(score);
  const m = Number(maxScore);
  if (!Number.isFinite(s) || !Number.isFinite(m) || m <= 0) {
    return null;
  }
  return (s / m) * 100;
};

const averageOf = (values) => {
  if (!values || values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const stdDev = (values) => {
  if (!values || values.length < 2) return 0;
  const mean = averageOf(values);
  const variance = averageOf(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
};

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

// Get all grades for a student
router.get('/my-grades', verifyToken, async (req, res) => {
  try {
    const { data: gradesWithClass, error: gradesWithClassError } = await supabase
      .from('grades')
      .select(`
        *,
        classes:class_id (
          class_name,
          section,
          class_code
        )
      `)
      .eq('user_id', req.user.id)
      .order('date_taken', { ascending: false });

    if (gradesWithClassError) {
      if (isSchemaCompatibilityError(gradesWithClassError)) {
        console.warn('grades relation mismatch, retrying /my-grades without classes join');
        const { data: plainGrades, error: plainError } = await supabase
          .from('grades')
          .select('*')
          .eq('user_id', req.user.id)
          .order('date_taken', { ascending: false });

        if (plainError) {
          console.error('Supabase error (fallback my-grades):', plainError);
          return res.json([]);
        }

        return res.json(plainGrades || []);
      }
      console.error('Supabase error:', gradesWithClassError);
      return res.json([]);
    }

    res.json(gradesWithClass || []);
  } catch (error) {
    console.error(error);
    res.json([]);
  }
});

// Get grades for a specific class
router.get('/class/:classId', verifyToken, async (req, res) => {
  try {
    const { classId } = req.params;

    const { data: grades, error } = await supabase
      .from('grades')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('class_id', classId)
      .order('date_taken', { ascending: false });

    if (error) {
      if (isSchemaCompatibilityError(error)) {
        console.warn('grades table missing, returning empty class grades list');
        return res.json([]);
      }
      console.error('Supabase error:', error);
      return res.status(500).json({ message: 'Error fetching grades' });
    }

    res.json(grades || []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a new grade entry
router.post('/', verifyToken, async (req, res) => {
  try {
    const { classId, title, score, maxScore, type, dateTaken, notes } = req.body;
    const normalizedClassId = classId === undefined || classId === null || classId === '' || classId === 'null' || classId === 'undefined'
      ? null
      : classId;
    const normalizedTitle = String(title || '').trim() || 'General';
    const normalizedType = String(type || 'other').trim() || 'other';
    const parsedScore = Number(score);
    const parsedMaxScore = Number(maxScore);
    let parsedDate = dateTaken ? new Date(dateTaken) : new Date();
    let normalizedScore = Number.isFinite(parsedScore) ? parsedScore : 0;
    let normalizedMaxScore = Number.isFinite(parsedMaxScore) && parsedMaxScore > 0 ? parsedMaxScore : 100;

    // Normalize score inputs so UI submissions do not fail on minor input issues.
    if (normalizedScore < 0) {
      normalizedScore = 0;
    }

    if (Number.isNaN(parsedDate.getTime())) {
      parsedDate = new Date();
    }

    if (normalizedScore > normalizedMaxScore) {
      normalizedMaxScore = normalizedScore;
    }

    // Verify user is enrolled only when class-linked grade is provided
    if (normalizedClassId) {
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('*')
        .eq('user_id', req.user.id)
        .eq('class_id', normalizedClassId)
        .maybeSingle();

      if (enrollmentError || !enrollment) {
        return res.status(403).json({ message: 'Not enrolled in this class' });
      }
    }

    // Create grade entry
    const { data: newGrade, error } = await supabase
      .from('grades')
      .insert([
        {
          user_id: req.user.id,
          class_id: normalizedClassId,
          title: normalizedTitle,
          score: normalizedScore,
          max_score: normalizedMaxScore,
          type: normalizedType,
          date_taken: parsedDate.toISOString(),
          notes
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ message: 'Error creating grade entry' });
    }

    res.status(201).json(newGrade);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a grade entry
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, score, maxScore, type, dateTaken, notes } = req.body;

    // Verify user owns this grade entry
    const { data: grade } = await supabase
      .from('grades')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!grade) {
      return res.status(403).json({ message: 'Not authorized to update this grade' });
    }

    // Validate score is not greater than max score
    if (score && maxScore && parseFloat(score) > parseFloat(maxScore)) {
      return res.status(400).json({ message: 'Score cannot be greater than max score' });
    }

    // Prepare update data
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (score !== undefined) updateData.score = parseFloat(score);
    if (maxScore !== undefined) updateData.max_score = parseFloat(maxScore);
    if (type !== undefined) updateData.type = type;
    if (dateTaken !== undefined) updateData.date_taken = dateTaken;
    if (notes !== undefined) updateData.notes = notes;

    // Update grade
    const { data: updatedGrade, error } = await supabase
      .from('grades')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ message: 'Error updating grade' });
    }

    res.json(updatedGrade);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a grade entry
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user owns this grade entry
    const { data: grade } = await supabase
      .from('grades')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!grade) {
      return res.status(403).json({ message: 'Not authorized to delete this grade' });
    }

    // Delete grade
    const { error } = await supabase
      .from('grades')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ message: 'Error deleting grade' });
    }

    res.json({ message: 'Grade deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get analytics data (averages, trends, etc.)
router.get('/analytics', verifyToken, async (req, res) => {
  try {
    const requestedClassId = req.query.classId || null;

    // Get all manual grades for the user (when grades table exists)
    const { data: gradesWithClass, error: gradesWithClassError } = await supabase
      .from('grades')
      .select(`
        *,
        classes:class_id (
          class_name,
          section,
          class_code
        )
      `)
      .eq('user_id', req.user.id)
      .order('date_taken', { ascending: true });

    let manualGrades = gradesWithClass || [];
    if (gradesWithClassError) {
      if (isSchemaCompatibilityError(gradesWithClassError)) {
        const { data: plainGrades, error: plainError } = await supabase
          .from('grades')
          .select('*')
          .eq('user_id', req.user.id)
          .order('date_taken', { ascending: true });

        if (plainError) {
          if (!isSchemaCompatibilityError(plainError)) {
            console.error('Supabase error (fallback grades query):', plainError);
          }
          manualGrades = [];
        } else {
          manualGrades = plainGrades || [];
        }
      } else {
        console.error('Supabase error:', gradesWithClassError);
        manualGrades = [];
      }
    }

    // Legacy task system scores (may not exist in all deployments)
    const { data: legacyTaskScores, error: legacyTaskError } = await supabase
      .from('task_submissions')
      .select(`
        score,
        graded_at,
        tasks!inner(
          title,
          max_score,
          class_id,
          classes:class_id (
            class_name,
            section,
            class_code
          )
        )
      `)
      .eq('student_id', req.user.id)
      .not('score', 'is', null)
      .order('graded_at', { ascending: true });

    if (legacyTaskError && !isSchemaCompatibilityError(legacyTaskError)) {
      console.error('Supabase error (legacy task scores):', legacyTaskError);
    }

    // New deadline submission system scores
    const { data: submissionScores, error: submissionScoreError } = await supabase
      .from('submissions')
      .select(`
        grade,
        graded_at,
        deadlines!inner(
          title,
          points,
          class_id,
          classes:class_id (
            class_name,
            section,
            class_code
          )
        )
      `)
      .eq('student_id', req.user.id)
      .not('grade', 'is', null)
      .order('graded_at', { ascending: true });

    if (submissionScoreError && !isSchemaCompatibilityError(submissionScoreError)) {
      console.error('Supabase error (submission scores):', submissionScoreError);
    }

    // Enrolled classes for class-based monitoring
    const { data: enrolledClasses, error: enrolledClassesError } = await supabase
      .from('enrollments')
      .select(`
        class_id,
        classes:class_id (
          id,
          class_name,
          section,
          class_code
        )
      `)
      .eq('user_id', req.user.id);

    if (enrolledClassesError && !isSchemaCompatibilityError(enrolledClassesError)) {
      console.error('Supabase error (enrolled classes):', enrolledClassesError);
    }

    const normalizedLegacyTaskScores = (legacyTaskScores || []).map((row) => ({
      classId: row.tasks?.class_id || null,
      title: row.tasks?.title || 'Task',
      className: row.tasks?.classes?.class_name || 'Unknown',
      section: row.tasks?.classes?.section || '',
      classCode: row.tasks?.classes?.class_code || '',
      score: Number(row.score),
      maxScore: Number(row.tasks?.max_score),
      gradedAt: row.graded_at,
      source: 'task_submissions'
    }));

    const normalizedSubmissionScores = (submissionScores || []).map((row) => ({
      classId: row.deadlines?.class_id || null,
      title: row.deadlines?.title || 'Deadline',
      className: row.deadlines?.classes?.class_name || 'Unknown',
      section: row.deadlines?.classes?.section || '',
      classCode: row.deadlines?.classes?.class_code || '',
      score: Number(row.grade),
      maxScore: Number(row.deadlines?.points),
      gradedAt: row.graded_at,
      source: 'submissions'
    }));

    const taskScores = [...normalizedLegacyTaskScores, ...normalizedSubmissionScores]
      .map((entry) => ({
        ...entry,
        percentage: toPercent(entry.score, entry.maxScore)
      }))
      .filter((entry) => entry.percentage !== null);

    // Calculate analytics using both manual grades and graded submissions
    const manualTimeline = manualGrades
      .map((grade) => ({
        classId: grade.class_id || null,
        date: grade.date_taken,
        percentage: toPercent(grade.score, grade.max_score),
        title: grade.title,
        type: grade.type,
        className: grade.classes?.class_name,
        source: 'grades'
      }))
      .filter((entry) => entry.percentage !== null);

    const scoreTimeline = taskScores.map((entry) => ({
      classId: entry.classId || null,
      date: entry.gradedAt,
      percentage: entry.percentage,
      title: entry.title,
      type: 'teacher_graded',
      className: entry.className,
      source: entry.source
    }));

    let combinedTimeline = [...manualTimeline, ...scoreTimeline]
      .filter((entry) => !!entry.date)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (requestedClassId) {
      combinedTimeline = combinedTimeline.filter((entry) => String(entry.classId) === String(requestedClassId));
    }

    const combinedPercentages = combinedTimeline.map((entry) => entry.percentage);

    const classBuckets = {};

    // Seed with enrolled classes so monitoring shows classes with zero graded entries too.
    (enrolledClasses || []).forEach((row) => {
      const key = String(row.class_id);
      classBuckets[key] = {
        classId: row.class_id,
        className: row.classes?.class_name || 'Unknown',
        section: row.classes?.section || '',
        classCode: row.classes?.class_code || '',
        grades: [],
        average: 0,
        latestScore: null,
        trend: 0,
        consistency: 0,
        status: 'no_data'
      };
    });

    combinedTimeline.forEach((entry) => {
      const key = entry.classId ? String(entry.classId) : `name:${entry.className || 'Unknown'}`;
      if (!classBuckets[key]) {
        classBuckets[key] = {
          classId: entry.classId || null,
          className: entry.className || 'Unknown',
          section: '',
          classCode: '',
          grades: [],
          average: 0,
          latestScore: null,
          trend: 0,
          consistency: 0,
          status: 'no_data'
        };
      }
      classBuckets[key].grades.push(entry);
    });

    const classMetrics = Object.values(classBuckets).map((bucket) => {
      const sortedGrades = [...bucket.grades].sort((a, b) => new Date(a.date) - new Date(b.date));
      const percentages = sortedGrades.map((g) => g.percentage);
      const average = percentages.length > 0 ? averageOf(percentages) : 0;
      const latestScore = percentages.length > 0 ? percentages[percentages.length - 1] : null;

      const recent = percentages.slice(-3);
      const previous = percentages.slice(-6, -3);
      const trend = previous.length > 0 ? averageOf(recent) - averageOf(previous) : 0;
      const consistency = stdDev(percentages);

      let status = 'good';
      if (percentages.length === 0) {
        status = 'no_data';
      } else if (average < 70 || trend < -7) {
        status = 'at_risk';
      } else if (average < 80 || consistency > 15) {
        status = 'watch';
      }

      return {
        ...bucket,
        grades: sortedGrades,
        average,
        latestScore,
        trend,
        consistency,
        status
      };
    });

    // Month-over-month trend (easy to chart as line/bar)
    const monthlyMap = {};
    combinedTimeline.forEach((entry) => {
      const monthKey = new Date(entry.date).toISOString().slice(0, 7);
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = [];
      }
      monthlyMap[monthKey].push(entry.percentage);
    });

    const monthlyTrend = Object.keys(monthlyMap)
      .sort()
      .map((month) => ({
        month,
        average: averageOf(monthlyMap[month]),
        count: monthlyMap[month].length
      }));

    const atRiskClasses = classMetrics.filter((item) => item.status === 'at_risk');
    const watchClasses = classMetrics.filter((item) => item.status === 'watch');
    const goodClasses = classMetrics.filter((item) => item.status === 'good');

    const strongestClass = [...classMetrics]
      .filter((item) => item.grades.length > 0)
      .sort((a, b) => b.average - a.average)[0] || null;

    const improvingClasses = classMetrics
      .filter((item) => item.trend >= 5 && item.grades.length >= 3)
      .map((item) => item.className);

    const analytics = {
      totalEntries: combinedTimeline.length,
      averageScore: 0,
      byType: {},
      byClass: {},
      timeline: combinedTimeline,
      taskScores,
      classMetrics,
      monthlyTrend,
      overview: {
        entriesCount: combinedTimeline.length,
        manualEntries: manualTimeline.length,
        teacherGradedEntries: scoreTimeline.length,
        enrolledClasses: (enrolledClasses || []).length
      },
      monitoring: {
        atRiskCount: atRiskClasses.length,
        watchCount: watchClasses.length,
        goodCount: goodClasses.length
      },
      insights: {
        strongestClass: strongestClass ? strongestClass.className : null,
        improvingClasses,
        atRiskClasses: atRiskClasses.map((item) => item.className)
      }
    };

    if (combinedPercentages.length > 0) {
      analytics.averageScore = combinedPercentages.reduce((sum, value) => sum + value, 0) / combinedPercentages.length;

      combinedTimeline.forEach((entry) => {
        const typeKey = entry.type || 'other';
        if (!analytics.byType[typeKey]) {
          analytics.byType[typeKey] = { grades: [], average: 0 };
        }
        analytics.byType[typeKey].grades.push(entry);

        const classKey = entry.classId ? String(entry.classId) : entry.className || 'Unknown';
        if (!analytics.byClass[classKey]) {
          analytics.byClass[classKey] = {
            classId: entry.classId || null,
            className: entry.className || 'Unknown',
            section: '',
            grades: [],
            average: 0
          };
        }
        analytics.byClass[classKey].grades.push(entry);
      });

      Object.keys(analytics.byType).forEach((type) => {
        const items = analytics.byType[type].grades;
        analytics.byType[type].average = items.reduce((sum, item) => sum + item.percentage, 0) / items.length;
      });

      Object.keys(analytics.byClass).forEach((classKey) => {
        const items = analytics.byClass[classKey].grades;
        analytics.byClass[classKey].average = items.reduce((sum, item) => sum + item.percentage, 0) / items.length;
      });
    }

    res.json(analytics);
  } catch (error) {
    console.error(error);
    res.json({
      totalEntries: 0,
      averageScore: 0,
      byType: {},
      byClass: {},
      timeline: [],
      taskScores: []
    });
  }
});

module.exports = router;
