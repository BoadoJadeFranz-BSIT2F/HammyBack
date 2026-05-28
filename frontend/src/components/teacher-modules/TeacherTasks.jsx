import React, { useState, useEffect } from 'react';
import { taskAPI } from '../../services/api';
import { classAPI } from '../../services/api';
import './TeacherModules.css';

const TeacherTasks = ({ classId: propClassId }) => {
  const [tasks, setTasks] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(propClassId || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    dueTime: '',
    maxScore: ''
  });
  const [gradingData, setGradingData] = useState({
    submissionId: null,
    score: '',
    feedback: ''
  });

  useEffect(() => {
    if (!propClassId) {
      fetchClasses();
    }
  }, [propClassId]);

  useEffect(() => {
    if (selectedClassId) {
      fetchTasks();
    }
  }, [selectedClassId]);

  const fetchClasses = async () => {
    try {
      const response = await classAPI.getTeacherClasses();
      setClasses(response.data);
      if (response.data.length > 0 && !selectedClassId) {
        setSelectedClassId(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      setError('Failed to load classes');
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await taskAPI.getClassTasks(selectedClassId);
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async (taskId) => {
    try {
      const response = await taskAPI.getTaskSubmissions(taskId);
      setSubmissions(response.data);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      setError('Failed to load submissions');
    }
  };

  const handleOpenModal = (task = null) => {
    if (task) {
      const dueDate = new Date(task.due_date);
      setEditingTask(task);
      setFormData({
        title: task.title,
        description: task.description || '',
        dueDate: dueDate.toISOString().split('T')[0],
        dueTime: dueDate.toTimeString().slice(0, 5),
        maxScore: task.max_score || ''
      });
    } else {
      setEditingTask(null);
      setFormData({
        title: '',
        description: '',
        dueDate: '',
        dueTime: '',
        maxScore: ''
      });
    }
    setShowModal(true);
    setError('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      dueDate: '',
      dueTime: '',
      maxScore: ''
    });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title) {
      setError('Title is required');
      return;
    }

    try {
      const dueDateTime = formData.dueDate && formData.dueTime
        ? new Date(`${formData.dueDate}T${formData.dueTime}`).toISOString()
        : null;

      const taskData = {
        classId: selectedClassId,
        title: formData.title,
        description: formData.description,
        dueDate: dueDateTime,
        maxScore: formData.maxScore ? parseFloat(formData.maxScore) : null
      };

      if (editingTask) {
        await taskAPI.updateTeacherTask(editingTask.id, taskData);
      } else {
        await taskAPI.createTeacherTask(taskData);
      }

      await fetchTasks();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving task:', error);
      setError('Failed to save task');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      await taskAPI.deleteTeacherTask(id);
      await fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      setError('Failed to delete task');
    }
  };

  const handleOpenSubmissions = async (task) => {
    setSelectedTask(task);
    setShowSubmissionsModal(true);
    await fetchSubmissions(task.id);
  };

  const handleCloseSubmissions = () => {
    setShowSubmissionsModal(false);
    setSelectedTask(null);
    setSubmissions([]);
    setGradingData({ submissionId: null, score: '', feedback: '' });
  };

  const handleStartGrading = (submission) => {
    setGradingData({
      submissionId: submission.id,
      score: submission.score || '',
      feedback: submission.feedback || ''
    });
  };

  const handleGradeSubmit = async () => {
    if (!gradingData.score) {
      setError('Score is required');
      return;
    }

    try {
      await taskAPI.gradeSubmission(gradingData.submissionId, {
        score: parseFloat(gradingData.score),
        feedback: gradingData.feedback
      });
      await fetchSubmissions(selectedTask.id);
      setGradingData({ submissionId: null, score: '', feedback: '' });
      setError('');
    } catch (error) {
      console.error('Error grading submission:', error);
      setError('Failed to grade submission');
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    };
  };

  if (loading) {
    return (
      <div className="teacher-module-container">
        <div className="loading-state">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="teacher-module-container">
      <div className="teacher-module-header">
        <h2>Tasks Management</h2>
        <button className="upload-btn" onClick={() => handleOpenModal()}>
          <span>+</span> Add Task
        </button>
      </div>

      {!propClassId && classes.length > 0 && (
        <div className="class-selector" style={{ padding: '15px', background: 'white', marginBottom: '15px', borderRadius: '8px' }}>
          <label style={{ marginRight: '10px', fontWeight: '600', color: '#1f2937' }}>Select Class:</label>
          <select 
            value={selectedClassId} 
            onChange={(e) => setSelectedClassId(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '2px solid #d1d5db',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>
                {cls.subject} - {cls.section}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && !showModal && !showSubmissionsModal && (
        <div className="error-message" style={{ margin: '15px', padding: '10px', background: '#fee', color: '#c00', borderRadius: '5px' }}>
          {error}
        </div>
      )}

      <div className="teacher-files-content">
        {tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <p>No tasks created</p>
            <button className="upload-btn" onClick={() => handleOpenModal()}>
              Create Your First Task
            </button>
          </div>
        ) : (
          <div className="tasks-grid">
            {tasks.map(task => {
              const dueDateTime = formatDateTime(task.due_date);
              
              return (
                <div key={task.id} className="task-card">
                  <div className="task-card-header">
                    <h3 className="task-card-title">{task.title}</h3>
                    <div className="task-actions">
                      <button
                        className="icon-btn"
                        onClick={() => handleOpenModal(task)}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        className="icon-btn"
                        onClick={() => handleDelete(task.id)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {task.description && (
                    <p className="task-description">{task.description}</p>
                  )}

                  <div className="task-meta">
                    {dueDateTime && (
                      <div className="meta-item">
                        <span className="meta-icon">📅</span>
                        {dueDateTime.date} at {dueDateTime.time}
                      </div>
                    )}
                    {task.max_score && (
                      <div className="meta-item">
                        <span className="meta-icon">🎯</span>
                        Max Score: {task.max_score} pts
                      </div>
                    )}
                  </div>

                  <div className="task-footer">
                    <button
                      className="view-submissions-btn"
                      onClick={() => handleOpenSubmissions(task)}
                    >
                      📤 View Submissions
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Task Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTask ? 'Edit Task' : 'Add New Task'}</h2>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              {error && (
                <div className="error-message" style={{ margin: '0 0 15px 0', padding: '10px', background: '#fee', color: '#c00', borderRadius: '5px' }}>
                  {error}
                </div>
              )}

              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., Essay Assignment"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Task instructions and requirements..."
                  rows="4"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Due Time</label>
                  <input
                    type="time"
                    name="dueTime"
                    value={formData.dueTime}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Max Score</label>
                  <input
                    type="number"
                    name="maxScore"
                    value={formData.maxScore}
                    onChange={handleChange}
                    placeholder="100"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  {editingTask ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submissions Modal */}
      {showSubmissionsModal && selectedTask && (
        <div className="modal-overlay" onClick={handleCloseSubmissions}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Submissions: {selectedTask.title}</h2>
              <button className="close-btn" onClick={handleCloseSubmissions}>×</button>
            </div>

            <div className="submissions-content">
              {error && (
                <div className="error-message" style={{ margin: '0 0 15px 0', padding: '10px', background: '#fee', color: '#c00', borderRadius: '5px' }}>
                  {error}
                </div>
              )}

              <div className="submissions-stats">
                <div className="stat-item">
                  <span className="stat-value">{submissions.length}</span>
                  <span className="stat-label">Total Submissions</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{submissions.filter(s => s.score !== null).length}</span>
                  <span className="stat-label">Graded</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{submissions.filter(s => s.score === null).length}</span>
                  <span className="stat-label">Pending</span>
                </div>
              </div>

              {submissions.length === 0 ? (
                <div className="no-submissions">
                  <p>No submissions yet</p>
                </div>
              ) : (
                <div className="submissions-list">
                  {submissions.map(submission => {
                    const isGrading = gradingData.submissionId === submission.id;
                    
                    return (
                      <div key={submission.id} className="submission-item">
                        <div className="submission-header">
                          <div className="student-info">
                            <h4>{submission.users?.name}</h4>
                            <p>{submission.users?.email}</p>
                          </div>
                          <div className="submission-date">
                            Submitted: {new Date(submission.submitted_at).toLocaleString()}
                          </div>
                        </div>

                        <div className="submission-content">
                          {submission.submission_text && (
                            <div className="submission-text">
                              <strong>Submission:</strong>
                              <p>{submission.submission_text}</p>
                            </div>
                          )}

                          {submission.file_url && (
                            <div className="submission-file">
                              <strong>File:</strong>
                              <a href={submission.file_url} target="_blank" rel="noopener noreferrer">
                                📎 {submission.file_name || 'View File'}
                              </a>
                            </div>
                          )}
                        </div>

                        {isGrading ? (
                          <div className="grading-form">
                            <div className="grading-inputs">
                              <div className="form-group">
                                <label>Score * (Max: {selectedTask.max_score})</label>
                                <input
                                  type="number"
                                  value={gradingData.score}
                                  onChange={(e) => setGradingData({ ...gradingData, score: e.target.value })}
                                  placeholder={`0-${selectedTask.max_score}`}
                                  min="0"
                                  max={selectedTask.max_score}
                                  step="0.01"
                                />
                              </div>
                              <div className="form-group">
                                <label>Feedback</label>
                                <textarea
                                  value={gradingData.feedback}
                                  onChange={(e) => setGradingData({ ...gradingData, feedback: e.target.value })}
                                  placeholder="Provide feedback to the student..."
                                  rows="3"
                                />
                              </div>
                            </div>
                            <div className="grading-actions">
                              <button
                                className="cancel-grade-btn"
                                onClick={() => setGradingData({ submissionId: null, score: '', feedback: '' })}
                              >
                                Cancel
                              </button>
                              <button
                                className="submit-grade-btn"
                                onClick={handleGradeSubmit}
                              >
                                Submit Grade
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="submission-grade">
                            {submission.score !== null ? (
                              <div className="graded-info">
                                <div className="grade-display">
                                  <span className="grade-score">
                                    Score: {submission.score}/{selectedTask.max_score}
                                  </span>
                                  <span className="grade-percentage">
                                    ({((submission.score / selectedTask.max_score) * 100).toFixed(1)}%)
                                  </span>
                                </div>
                                {submission.feedback && (
                                  <div className="feedback-display">
                                    <strong>Feedback:</strong>
                                    <p>{submission.feedback}</p>
                                  </div>
                                )}
                                <button
                                  className="edit-grade-btn"
                                  onClick={() => handleStartGrading(submission)}
                                >
                                  ✏️ Edit Grade
                                </button>
                              </div>
                            ) : (
                              <button
                                className="grade-btn"
                                onClick={() => handleStartGrading(submission)}
                              >
                                📝 Grade Submission
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .tasks-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          padding: 20px;
        }

        .task-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          border-left: 4px solid #3b82f6;
          transition: all 0.3s;
        }

        .task-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          transform: translateY(-2px);
        }

        .task-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .task-card-title {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
          flex: 1;
        }

        .task-actions {
          display: flex;
          gap: 5px;
        }

        .icon-btn {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          padding: 5px;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .icon-btn:hover {
          opacity: 1;
        }

        .task-description {
          font-size: 14px;
          color: #6b7280;
          margin: 0 0 12px 0;
          line-height: 1.5;
        }

        .task-meta {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 15px;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #4b5563;
        }

        .meta-icon {
          font-size: 16px;
        }

        .task-footer {
          padding-top: 15px;
          border-top: 1px solid #e5e7eb;
        }

        .view-submissions-btn {
          width: 100%;
          padding: 10px;
          background: #f3f4f6;
          border: 2px solid #d1d5db;
          color: #374151;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .view-submissions-btn:hover {
          background: #e5e7eb;
          border-color: #9ca3af;
        }

        .modal-content.large {
          max-width: 800px;
        }

        .submissions-content {
          padding: 24px;
          max-height: 70vh;
          overflow-y: auto;
        }

        .submissions-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 20px;
        }

        .stat-item {
          text-align: center;
          padding: 15px;
          background: #f9fafb;
          border-radius: 8px;
        }

        .stat-value {
          display: block;
          font-size: 28px;
          font-weight: 700;
          color: #1f2937;
        }

        .stat-label {
          display: block;
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
          margin-top: 4px;
        }

        .submissions-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .submission-item {
          background: #f9fafb;
          border-radius: 12px;
          padding: 20px;
          border: 1px solid #e5e7eb;
        }

        .submission-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 15px;
          padding-bottom: 15px;
          border-bottom: 1px solid #e5e7eb;
        }

        .student-info h4 {
          margin: 0 0 5px 0;
          font-size: 16px;
          color: #1f2937;
        }

        .student-info p {
          margin: 0;
          font-size: 13px;
          color: #6b7280;
        }

        .submission-date {
          font-size: 12px;
          color: #9ca3af;
        }

        .submission-content {
          margin-bottom: 15px;
        }

        .submission-text,
        .submission-file {
          margin-bottom: 12px;
        }

        .submission-text strong,
        .submission-file strong {
          display: block;
          margin-bottom: 8px;
          color: #374151;
          font-size: 14px;
        }

        .submission-text p {
          margin: 0;
          color: #6b7280;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .submission-file a {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #3b82f6;
          text-decoration: none;
          font-weight: 500;
        }

        .submission-file a:hover {
          text-decoration: underline;
        }

        .grading-form {
          background: white;
          padding: 15px;
          border-radius: 8px;
          border: 2px solid #3b82f6;
        }

        .grading-inputs {
          margin-bottom: 15px;
        }

        .grading-actions {
          display: flex;
          gap: 10px;
        }

        .cancel-grade-btn,
        .submit-grade-btn {
          flex: 1;
          padding: 10px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cancel-grade-btn {
          background: white;
          border: 2px solid #d1d5db;
          color: #6b7280;
        }

        .cancel-grade-btn:hover {
          border-color: #9ca3af;
        }

        .submit-grade-btn {
          background: #10b981;
          border: 2px solid #10b981;
          color: white;
        }

        .submit-grade-btn:hover {
          background: #059669;
        }

        .graded-info {
          background: white;
          padding: 15px;
          border-radius: 8px;
        }

        .grade-display {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .grade-score {
          font-size: 18px;
          font-weight: 700;
          color: #10b981;
        }

        .grade-percentage {
          font-size: 14px;
          color: #6b7280;
        }

        .feedback-display {
          margin-bottom: 15px;
        }

        .feedback-display strong {
          display: block;
          margin-bottom: 8px;
          color: #374151;
        }

        .feedback-display p {
          margin: 0;
          color: #6b7280;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .edit-grade-btn,
        .grade-btn {
          width: 100%;
          padding: 10px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .edit-grade-btn {
          background: white;
          border: 2px solid #3b82f6;
          color: #3b82f6;
        }

        .edit-grade-btn:hover {
          background: #3b82f6;
          color: white;
        }

        .grade-btn {
          background: #3b82f6;
          border: 2px solid #3b82f6;
          color: white;
        }

        .grade-btn:hover {
          background: #2563eb;
        }

        .no-submissions {
          text-align: center;
          padding: 40px;
          color: #6b7280;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 15px;
        }

        @media (max-width: 768px) {
          .tasks-grid {
            grid-template-columns: 1fr;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .submissions-stats {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default TeacherTasks;