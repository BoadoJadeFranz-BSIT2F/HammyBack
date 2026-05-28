import React, { useState, useEffect } from 'react';
import { deadlineAPI, submissionAPI } from '../../services/api';
import { isMaterialArchived, onArchiveChange } from '../../services/archive';
import '../modules/Module.css';

const StudentDeadlineView = ({ deadline, onClose, onSubmitted }) => {
  const [deadlineDetails, setDeadlineDetails] = useState(deadline);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionLink, setSubmissionLink] = useState('');
  const [, setArchiveTick] = useState(0);
  const currentDeadline = deadlineDetails || deadline;

  useEffect(() => {
    fetchDeadlineAndSubmission();
  }, [deadline.id]);

  useEffect(() => {
    const unsubscribe = onArchiveChange(() => setArchiveTick((v) => v + 1));
    return unsubscribe;
  }, []);

  const fetchDeadlineAndSubmission = async () => {
    try {
      setLoading(true);
      const [deadlineResponse, submissionResponse] = await Promise.all([
        deadlineAPI.getDeadline(deadline.id),
        submissionAPI.getSubmission(deadline.id)
      ]);

      const fullDeadline = deadlineResponse?.data?.deadline || deadline;
      const submissionData = submissionResponse?.data?.submission || null;

      setDeadlineDetails(fullDeadline);
      setSubmission(submissionData);

      if (submissionData?.submission_text) {
        setSubmissionText(submissionData.submission_text);
      }
      if (submissionData?.submission_link) {
        setSubmissionLink(submissionData.submission_link);
      }
    } catch (error) {
      console.error('Error fetching deadline/submission:', error);
      setError('Failed to load assignment details');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
    setError('');
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedFiles.length === 0 && !submissionText && !submissionLink) {
      setError('Please attach files, enter text, or provide a link');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const formData = new FormData();
      formData.append('deadlineId', deadline.id);
      if (submissionText) formData.append('submissionText', submissionText);
      if (submissionLink) formData.append('submissionLink', submissionLink);
      
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      await submissionAPI.submit(formData);
      setSuccess('Work submitted successfully!');
      setTimeout(() => {
        onSubmitted();
      }, 1500);
    } catch (error) {
      console.error('Submission error:', error);
      setError(error.response?.data?.message || 'Failed to submit work');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnsubmit = async () => {
    if (!window.confirm('Are you sure you want to unsubmit? You can resubmit later.')) {
      return;
    }

    try {
      setSubmitting(true);
      await submissionAPI.unsubmit(submission.id);
      setSuccess('Work unsubmitted');
      setTimeout(() => {
        onSubmitted();
      }, 1000);
    } catch (error) {
      console.error('Unsubmit error:', error);
      setError('Failed to unsubmit work');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOverdue = () => {
    return new Date() > new Date(currentDeadline.due_date) && submission?.status === 'assigned';
  };

  const canUnsubmit = () => {
    return submission?.status === 'turned_in' && submission?.grade === null;
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="loading-state">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{deadline.title}</h2>
            <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
              {(currentDeadline.class_name || currentDeadline.classes?.class_name || 'Class')} • Due: {formatDate(currentDeadline.due_date)}
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="deadline-student-content">
          {/* Status Banner */}
          {submission?.status === 'graded' && (
            <div className="status-banner graded">
              <span className="status-icon">📝</span>
              <div>
                <div className="status-title">Graded</div>
                <div className="status-desc">
                  Grade: {submission.grade}/{currentDeadline.points} ({((submission.grade / currentDeadline.points) * 100).toFixed(1)}%)
                </div>
              </div>
            </div>
          )}
          {submission?.status === 'turned_in' && (
            <div className={`status-banner ${submission.is_late ? 'late' : 'submitted'}`}>
              <span className="status-icon">{submission.is_late ? '⏰' : '✅'}</span>
              <div>
                <div className="status-title">{submission.is_late ? 'Submitted Late' : 'Submitted'}</div>
                <div className="status-desc">Turned in {formatDate(submission.submitted_at)}</div>
              </div>
            </div>
          )}
          {isOverdue() && (
            <div className="status-banner missing">
              <span className="status-icon">❌</span>
              <div>
                <div className="status-title">Missing</div>
                <div className="status-desc">This assignment is overdue</div>
              </div>
            </div>
          )}

          {/* Assignment Details */}
          <div className="detail-section">
            <h3>Assignment Details</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Points:</span>
                <span className="detail-value">{currentDeadline.points}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Type:</span>
                <span className="detail-value" style={{ textTransform: 'capitalize' }}>{currentDeadline.type}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Due Date:</span>
                <span className="detail-value">{formatDate(currentDeadline.due_date)}</span>
              </div>
            </div>

            {currentDeadline.instructions && (
              <div className="instructions-box">
                <h4>Instructions:</h4>
                <p>{currentDeadline.instructions}</p>
              </div>
            )}

            {/* Teacher's Materials */}
            {currentDeadline.files && currentDeadline.files.filter((f) => !isMaterialArchived({ source_type: 'deadline_attachment', source_id: f.id })).length > 0 && (
              <div className="teacher-materials">
                <h4>Materials from Teacher ({currentDeadline.files.filter((f) => !isMaterialArchived({ source_type: 'deadline_attachment', source_id: f.id })).length}):</h4>
                <div className="files-list">
                  {currentDeadline.files.filter((f) => !isMaterialArchived({ source_type: 'deadline_attachment', source_id: f.id })).map((file) => (
                    <a
                      key={file.id}
                      href={`http://localhost:5000${file.file_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="file-chip"
                    >
                      📎 {file.file_name}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Student's Work Section */}
          <div className="detail-section">
            <h3>Your Work</h3>

            {submission?.status === 'graded' && (
              <>
                {/* Show submitted work */}
                {submission.files && submission.files.length > 0 && (
                  <div className="submitted-files-view">
                    <h4>Submitted Files:</h4>
                    <div className="files-grid">
                      {submission.files.map((file) => (
                        <a
                          key={file.id}
                          href={`http://localhost:5000${file.file_path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="file-card-mini"
                        >
                          📄 {file.file_name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                
                {submission.submission_text && (
                  <div className="submission-content">
                    <h4>Your Response:</h4>
                    <p>{submission.submission_text}</p>
                  </div>
                )}

                {submission.feedback && (
                  <div className="feedback-box">
                    <h4>Teacher Feedback:</h4>
                    <p>{submission.feedback}</p>
                  </div>
                )}
              </>
            )}

            {submission?.status === 'turned_in' && (
              <>
                {/* Show submitted work with unsubmit option */}
                {submission.files && submission.files.length > 0 && (
                  <div className="submitted-files-view">
                    <h4>Submitted Files:</h4>
                    <div className="files-grid">
                      {submission.files.map((file) => (
                        <a
                          key={file.id}
                          href={`http://localhost:5000${file.file_path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="file-card-mini"
                        >
                          📄 {file.file_name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                
                {submission.submission_text && (
                  <div className="submission-content">
                    <h4>Your Response:</h4>
                    <p>{submission.submission_text}</p>
                  </div>
                )}

                {canUnsubmit() && (
                  <button
                    onClick={handleUnsubmit}
                    disabled={submitting}
                    className="btn-unsubmit"
                    style={{ marginTop: '15px' }}
                  >
                    {submitting ? 'Unsubmitting...' : 'Unsubmit'}
                  </button>
                )}
              </>
            )}

            {submission?.status === 'assigned' && (
              <>
                {/* Submission Form */}
                {error && (
                  <div className="error-message" style={{ marginBottom: '15px' }}>
                    {error}
                  </div>
                )}
                {success && (
                  <div className="success-message" style={{ marginBottom: '15px' }}>
                    {success}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  {/* File Upload */}
                  <div className="form-group">
                    <label>Attach Files (Optional)</label>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.png,.zip,.xls,.xlsx"
                      onChange={handleFileSelect}
                      disabled={submitting}
                      style={{
                        padding: '8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        width: '100%',
                        cursor: 'pointer'
                      }}
                    />
                    {selectedFiles.length > 0 && (
                      <div style={{ marginTop: '10px' }}>
                        {selectedFiles.map((file, index) => (
                          <div
                            key={index}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px',
                              background: '#f9fafb',
                              borderRadius: '4px',
                              marginBottom: '4px'
                            }}
                          >
                            <span style={{ fontSize: '13px' }}>📎 {file.name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(index)}
                              disabled={submitting}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                fontSize: '16px'
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Text Response */}
                  <div className="form-group">
                    <label>Written Response (Optional)</label>
                    <textarea
                      value={submissionText}
                      onChange={(e) => setSubmissionText(e.target.value)}
                      placeholder="Type your answer here..."
                      rows="5"
                      disabled={submitting}
                    />
                  </div>

                  {/* Link */}
                  <div className="form-group">
                    <label>Link (Optional)</label>
                    <input
                      type="url"
                      value={submissionLink}
                      onChange={(e) => setSubmissionLink(e.target.value)}
                      placeholder="https://..."
                      disabled={submitting}
                    />
                  </div>

                  <div className="form-actions">
                    <button type="button" onClick={onClose} className="btn-secondary" disabled={submitting}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary" disabled={submitting}>
                      {submitting ? 'Submitting...' : 'Turn In'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>

        <style jsx>{`
          .large-modal {
            max-width: 800px;
            max-height: 90vh;
            overflow-y: auto;
          }

          .deadline-student-content {
            padding: 0;
          }

          .status-banner {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 15px 20px;
            margin: -20px -20px 20px -20px;
            color: white;
          }

          .status-banner.graded {
            background: #3b82f6;
          }

          .status-banner.submitted {
            background: #10b981;
          }

          .status-banner.late {
            background: #ef4444;
          }

          .status-banner.missing {
            background: #dc2626;
          }

          .status-icon {
            font-size: 28px;
          }

          .status-title {
            font-weight: 700;
            font-size: 16px;
          }

          .status-desc {
            font-size: 13px;
            opacity: 0.9;
            margin-top: 2px;
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
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 15px;
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

          .instructions-box, .teacher-materials, .submitted-files-view, .submission-content, .feedback-box {
            margin-top: 15px;
            padding: 15px;
            background: #f9fafb;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
          }

          .feedback-box {
            background: #eff6ff;
            border-color: #3b82f6;
          }

          .feedback-box h4 {
            color: #1e40af;
          }

          .instructions-box p, .submission-content p, .feedback-box p {
            margin: 0;
            font-size: 14px;
            color: #374151;
            line-height: 1.6;
          }

          .files-list {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }

          .file-chip {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            font-size: 13px;
            color: #3b82f6;
            text-decoration: none;
            transition: all 0.2s;
          }

          .file-chip:hover {
            background: #eff6ff;
            border-color: #3b82f6;
          }

          .files-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 10px;
          }

          .file-card-mini {
            padding: 10px;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            text-decoration: none;
            color: #374151;
            font-size: 13px;
            transition: all 0.2s;
          }

          .file-card-mini:hover {
            background: #f9fafb;
            border-color: #3b82f6;
          }

          .btn-unsubmit {
            padding: 8px 16px;
            background: #ef4444;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
          }

          .btn-unsubmit:hover:not(:disabled) {
            background: #dc2626;
          }

          .btn-unsubmit:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .form-actions {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            margin-top: 20px;
          }

          .btn-secondary, .btn-primary {
            padding: 10px 24px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
          }

          .btn-secondary {
            background: white;
            border: 1px solid #d1d5db;
            color: #374151;
          }

          .btn-secondary:hover:not(:disabled) {
            background: #f9fafb;
          }

          .btn-primary {
            background: #3b82f6;
            color: white;
          }

          .btn-primary:hover:not(:disabled) {
            background: #2563eb;
          }

          .btn-primary:disabled, .btn-secondary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .error-message {
            padding: 10px;
            background: #fee;
            color: #c00;
            border-radius: 6px;
            font-size: 14px;
          }

          .success-message {
            padding: 10px;
            background: #d1fae5;
            color: #065f46;
            border-radius: 6px;
            font-size: 14px;
          }
        `}</style>
      </div>
    </div>
  );
};

export default StudentDeadlineView;
