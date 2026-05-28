import React, { useState, useEffect } from 'react';
import { submissionAPI } from '../../services/api';
import './TeacherModules.css';

const StudentSubmissionView = ({ submission, deadline, onClose, onGraded }) => {
  const [gradeData, setGradeData] = useState({
    grade: submission.grade || '',
    feedback: submission.feedback || ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const formatDate = (dateString) => {
    if (!dateString) return 'Not submitted';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleGradeChange = (e) => {
    const value = e.target.value;
    if (value === '' || (Number(value) >= 0 && Number(value) <= deadline.points)) {
      setGradeData({ ...gradeData, grade: value });
    }
  };

  const handleSubmitGrade = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (gradeData.grade === '') {
      setError('Please enter a grade');
      return;
    }

    try {
      setSaving(true);
      await submissionAPI.gradeSubmission(submission.id, {
        grade: parseInt(gradeData.grade),
        feedback: gradeData.feedback
      });
      setSuccessMessage('Grade submitted successfully!');
      setTimeout(() => {
        onGraded();
      }, 1000);
    } catch (error) {
      console.error('Error grading submission:', error);
      setError(error.response?.data?.message || 'Failed to submit grade');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = () => {
    if (submission.status === 'graded') return '#3b82f6';
    if (submission.status === 'turned_in') return submission.is_late ? '#ef4444' : '#10b981';
    return '#6b7280';
  };

  const getStatusText = () => {
    if (submission.status === 'graded') return '📝 Graded';
    if (submission.status === 'turned_in') return submission.is_late ? '⏰ Submitted Late' : '✅ Submitted';
    return '📋 Not Submitted';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{submission.student_name || 'Student Submission'}</h2>
            <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
              {deadline.title}
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="submission-view-content">
          {/* Status Bar */}
          <div className="status-bar" style={{ background: getStatusColor() }}>
            <span className="status-text">{getStatusText()}</span>
            <span className="submission-date">
              {submission.submitted_at ? formatDate(submission.submitted_at) : 'Not submitted yet'}
            </span>
          </div>

          {/* Assignment Details */}
          <div className="detail-section">
            <h3>Assignment Details</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Due Date:</span>
                <span className="detail-value">{formatDate(deadline.due_date)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Points Possible:</span>
                <span className="detail-value">{deadline.points}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Type:</span>
                <span className="detail-value" style={{ textTransform: 'capitalize' }}>
                  {deadline.type}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Status:</span>
                <span className="detail-value" style={{ color: getStatusColor() }}>
                  {submission.is_late ? 'Late Submission' : 'On Time'}
                </span>
              </div>
            </div>
          </div>

          {/* Student's Work */}
          <div className="detail-section">
            <h3>Student's Work</h3>
            
            {submission.status === 'assigned' ? (
              <div className="empty-state">
                <p>Student has not submitted their work yet.</p>
              </div>
            ) : (
              <>
                {/* Submitted Files */}
                {submission.files && submission.files.length > 0 && (
                  <div className="submitted-files">
                    <h4>Submitted Files ({submission.files.length}):</h4>
                    <div className="files-grid">
                      {submission.files.map((file) => (
                        <a
                          key={file.id}
                          href={`http://localhost:5000${file.file_path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="file-card"
                        >
                          <div className="file-icon">📄</div>
                          <div className="file-info">
                            <div className="file-name">{file.file_name}</div>
                            <div className="file-size">
                              {(file.file_size / 1024).toFixed(1)} KB
                            </div>
                          </div>
                          <div className="download-icon">⬇️</div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Submission Text */}
                {submission.submission_text && (
                  <div className="submission-text-box">
                    <h4>Written Response:</h4>
                    <p>{submission.submission_text}</p>
                  </div>
                )}

                {/* Submission Link */}
                {submission.submission_link && (
                  <div className="submission-link-box">
                    <h4>Submitted Link:</h4>
                    <a 
                      href={submission.submission_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="submission-link"
                    >
                      🔗 {submission.submission_link}
                    </a>
                  </div>
                )}

                {!submission.files?.length && !submission.submission_text && !submission.submission_link && (
                  <div className="empty-state">
                    <p>No files or text submitted (marked as turned in without attachments)</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Grading Section */}
          <div className="detail-section grading-section">
            <h3>Grade This Submission</h3>
            
            {error && (
              <div className="error-message" style={{ marginBottom: '15px' }}>
                {error}
              </div>
            )}

            {successMessage && (
              <div className="success-message" style={{ marginBottom: '15px', padding: '10px', background: '#d1fae5', color: '#065f46', borderRadius: '6px' }}>
                {successMessage}
              </div>
            )}

            <form onSubmit={handleSubmitGrade}>
              <div className="grade-input-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Grade (out of {deadline.points})</label>
                  <input
                    type="number"
                    value={gradeData.grade}
                    onChange={handleGradeChange}
                    min="0"
                    max={deadline.points}
                    placeholder={`Enter grade (0-${deadline.points})`}
                    required
                    disabled={submission.status === 'assigned'}
                  />
                  {gradeData.grade !== '' && (
                    <div className="grade-percentage">
                      {((gradeData.grade / deadline.points) * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Feedback for Student (Optional)</label>
                <textarea
                  value={gradeData.feedback}
                  onChange={(e) => setGradeData({ ...gradeData, feedback: e.target.value })}
                  placeholder="Provide constructive feedback..."
                  rows="4"
                  disabled={submission.status === 'assigned'}
                />
              </div>

              <div className="grade-actions">
                <button 
                  type="button" 
                  className="cancel-btn" 
                  onClick={onClose}
                  disabled={saving}
                >
                  Close
                </button>
                <button 
                  type="submit" 
                  className="submit-btn"
                  disabled={saving || submission.status === 'assigned'}
                >
                  {saving ? 'Saving...' : submission.status === 'graded' ? 'Update Grade' : 'Submit Grade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <style jsx>{`
        .submission-view-content {
          padding: 0;
        }

        .status-bar {
          padding: 12px 20px;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: -20px -20px 20px -20px;
          font-size: 14px;
          font-weight: 600;
        }

        .detail-section {
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
        }

        .detail-section:last-child {
          border-bottom: none;
        }

        .detail-section h3 {
          margin: 0 0 15px 0;
          font-size: 16px;
          color: #111827;
        }

        .detail-section h4 {
          margin: 0 0 10px 0;
          font-size: 14px;
          color: #374151;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .detail-label {
          font-size: 12px;
          color: #6b7280;
          font-weight: 500;
        }

        .detail-value {
          font-size: 14px;
          color: #111827;
          font-weight: 600;
        }

        .submitted-files {
          margin-bottom: 20px;
        }

        .files-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 12px;
          margin-top: 10px;
        }

        .file-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          text-decoration: none;
          color: inherit;
          transition: all 0.2s;
        }

        .file-card:hover {
          background: #eff6ff;
          border-color: #3b82f6;
        }

        .file-icon {
          font-size: 24px;
        }

        .file-info {
          flex: 1;
        }

        .file-name {
          font-size: 13px;
          color: #111827;
          font-weight: 500;
          margin-bottom: 2px;
        }

        .file-size {
          font-size: 11px;
          color: #6b7280;
        }

        .download-icon {
          font-size: 18px;
          opacity: 0.5;
        }

        .submission-text-box, .submission-link-box {
          margin-top: 15px;
          padding: 15px;
          background: #f9fafb;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        }

        .submission-text-box p {
          margin: 0;
          font-size: 14px;
          color: #374151;
          line-height: 1.6;
        }

        .submission-link {
          display: inline-block;
          color: #3b82f6;
          text-decoration: none;
          font-size: 14px;
        }

        .submission-link:hover {
          text-decoration: underline;
        }

        .grading-section {
          background: #f9fafb;
        }

        .grade-input-row {
          display: flex;
          gap: 15px;
          margin-bottom: 15px;
        }

        .grade-percentage {
          margin-top: 6px;
          font-size: 13px;
          color: #059669;
          font-weight: 600;
        }

        .grade-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 20px;
        }

        .cancel-btn, .submit-btn {
          padding: 10px 24px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .cancel-btn {
          background: white;
          border: 1px solid #d1d5db;
          color: #374151;
        }

        .cancel-btn:hover {
          background: #f9fafb;
        }

        .submit-btn {
          background: #3b82f6;
          color: white;
        }

        .submit-btn:hover:not(:disabled) {
          background: #2563eb;
        }

        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .empty-state {
          text-align: center;
          padding: 40px;
          color: #6b7280;
          font-size: 14px;
        }

        .empty-state p {
          margin: 0;
        }

        .error-message {
          padding: 10px;
          background: #fee;
          color: #c00;
          border-radius: 6px;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};

export default StudentSubmissionView;
