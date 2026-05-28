import React, { useState, useEffect } from 'react';
import { deadlineAPI } from '../../services/api';
import StudentSubmissionView from './StudentSubmissionView';
import { isMaterialArchived, archiveMaterial } from '../../services/archive';
import './TeacherModules.css';

const DeadlineDetailModal = ({ deadline, onClose, onRefresh }) => {
  const [submissions, setSubmissions] = useState([]);
  const [stats, setStats] = useState({ total: 0, turned_in: 0, graded: 0, late: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [filter, setFilter] = useState('all'); // all, submitted, not-submitted, graded, late
  const [localArchivedIds, setLocalArchivedIds] = useState(new Set());

  useEffect(() => {
    fetchSubmissions();
  }, [deadline.id]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const response = await deadlineAPI.getSubmissions(deadline.id);
      setSubmissions(response.data.submissions || []);
      setStats(response.data.stats || { total: 0, turned_in: 0, graded: 0, late: 0 });
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
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

  const getStatusBadge = (submission) => {
    if (submission.status === 'graded') {
      return <span className="status-badge graded">📝 Graded ({submission.grade}/{deadline.points})</span>;
    }
    if (submission.status === 'turned_in') {
      if (submission.is_late) {
        return <span className="status-badge late">⏰ Submitted Late</span>;
      }
      return <span className="status-badge submitted">✅ Submitted</span>;
    }
    if (submission.is_late || new Date() > new Date(deadline.due_date)) {
      return <span className="status-badge missing">❌ Missing</span>;
    }
    return <span className="status-badge assigned">📋 Assigned</span>;
  };

  const filteredSubmissions = submissions.filter(sub => {
    if (filter === 'submitted') return sub.status === 'turned_in';
    if (filter === 'not-submitted') return sub.status === 'assigned';
    if (filter === 'graded') return sub.status === 'graded';
    if (filter === 'late') return sub.is_late;
    return true;
  });

  const handleSubmissionClick = (submission) => {
    setSelectedSubmission(submission);
  };

  const handleCloseSubmissionView = () => {
    setSelectedSubmission(null);
    fetchSubmissions(); // Refresh to get updated grades
  };

  const handleArchiveAttachment = (file) => {
    archiveMaterial({
      source_type: 'deadline_attachment',
      source_id: file.id,
      title: deadline.title,
      description: deadline.instructions || 'Attached in deadline',
      file_name: file.file_name,
      file_type: file.file_type,
      file_size: file.file_size,
      file_url: `http://localhost:5000${file.file_path}`,
      file_path: file.file_path,
      class_id: deadline.class_id,
      deadline_id: deadline.id,
      deadline_title: deadline.title
    });
    setLocalArchivedIds((prev) => new Set([...prev, file.id]));
  };

  if (selectedSubmission) {
    return (
      <StudentSubmissionView
        submission={selectedSubmission}
        deadline={deadline}
        onClose={handleCloseSubmissionView}
        onGraded={handleCloseSubmissionView}
      />
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{deadline.title}</h2>
            <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
              {deadline.classes?.class_name} ({deadline.classes?.section})
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="deadline-detail-content">
          {/* Deadline Information */}
          <div className="detail-section">
            <div className="detail-info-grid">
              <div className="info-item">
                <span className="info-label">Due Date:</span>
                <span className="info-value">{formatDate(deadline.due_date)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Type:</span>
                <span className="info-value" style={{ textTransform: 'capitalize' }}>{deadline.type}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Points:</span>
                <span className="info-value">{deadline.points}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Submission Type:</span>
                <span className="info-value" style={{ textTransform: 'capitalize' }}>{deadline.submission_type}</span>
              </div>
            </div>

            {deadline.instructions && (
              <div className="instructions-box">
                <h4>Instructions:</h4>
                <p>{deadline.instructions}</p>
              </div>
            )}

            {deadline.files && deadline.files.filter((f) => !localArchivedIds.has(f.id) && !isMaterialArchived({ source_type: 'deadline_attachment', source_id: f.id })).length > 0 && (
              <div className="attached-files">
                <h4>Attached Materials ({deadline.files.filter((f) => !localArchivedIds.has(f.id) && !isMaterialArchived({ source_type: 'deadline_attachment', source_id: f.id })).length}):</h4>
                <div className="files-list">
                  {deadline.files.filter((f) => !localArchivedIds.has(f.id) && !isMaterialArchived({ source_type: 'deadline_attachment', source_id: f.id })).map((file) => (
                    <div key={file.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <a
                        href={`http://localhost:5000${file.file_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="file-chip"
                      >
                        📎 {file.file_name}
                      </a>
                      <button
                        onClick={() => handleArchiveAttachment(file)}
                        title="Archive this file"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '2px 4px' }}
                      >
                        🗂️
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submission Statistics */}
          <div className="stats-grid-mini">
            <div className="stat-card-mini">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total Students</div>
            </div>
            <div className="stat-card-mini green">
              <div className="stat-value">{stats.turned_in}</div>
              <div className="stat-label">Submitted</div>
            </div>
            <div className="stat-card-mini blue">
              <div className="stat-value">{stats.graded}</div>
              <div className="stat-label">Graded</div>
            </div>
            <div className="stat-card-mini red">
              <div className="stat-value">{stats.late}</div>
              <div className="stat-label">Late</div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="filter-tabs">
            <button 
              className={filter === 'all' ? 'active' : ''} 
              onClick={() => setFilter('all')}
            >
              All ({stats.total})
            </button>
            <button 
              className={filter === 'submitted' ? 'active' : ''} 
              onClick={() => setFilter('submitted')}
            >
              Submitted ({stats.turned_in})
            </button>
            <button 
              className={filter === 'not-submitted' ? 'active' : ''} 
              onClick={() => setFilter('not-submitted')}
            >
              Not Submitted ({stats.total - stats.turned_in})
            </button>
            <button 
              className={filter === 'graded' ? 'active' : ''} 
              onClick={() => setFilter('graded')}
            >
              Graded ({stats.graded})
            </button>
            {stats.late > 0 && (
              <button 
                className={filter === 'late' ? 'active' : ''} 
                onClick={() => setFilter('late')}
              >
                Late ({stats.late})
              </button>
            )}
          </div>

          {/* Student Submissions List */}
          <div className="submissions-section">
            <h3>Student Submissions</h3>
            {loading ? (
              <div className="loading-state">Loading submissions...</div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="empty-state">
                {filter === 'all' 
                  ? 'No students enrolled in this class yet.' 
                  : `No ${filter.replace('-', ' ')} submissions.`}
              </div>
            ) : (
              <div className="submissions-list">
                {filteredSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="submission-card"
                    onClick={() => handleSubmissionClick(submission)}
                  >
                    <div className="submission-student">
                      <div className="student-avatar">
                        {submission.student_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="student-info">
                        <div className="student-name">{submission.student_name || 'Unknown Student'}</div>
                        {submission.submitted_at && (
                          <div className="submission-time">
                            Submitted: {formatDate(submission.submitted_at)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="submission-meta">
                      {submission.file_count > 0 && (
                        <span className="file-count">📎 {submission.file_count} file{submission.file_count > 1 ? 's' : ''}</span>
                      )}
                      {getStatusBadge(submission)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .large-modal {
          max-width: 900px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .deadline-detail-content {
          padding: 20px 0;
        }

        .detail-section {
          background: #f9fafb;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .detail-info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 15px;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .info-label {
          font-size: 12px;
          color: #6b7280;
          font-weight: 500;
        }

        .info-value {
          font-size: 14px;
          color: #111827;
          font-weight: 600;
        }

        .instructions-box {
          margin-top: 15px;
          padding: 15px;
          background: white;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        }

        .instructions-box h4 {
          margin: 0 0 8px 0;
          font-size: 14px;
          color: #374151;
        }

        .instructions-box p {
          margin: 0;
          font-size: 14px;
          color: #6b7280;
          line-height: 1.6;
        }

        .attached-files {
          margin-top: 15px;
        }

        .attached-files h4 {
          margin: 0 0 10px 0;
          font-size: 14px;
          color: #374151;
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

        .stats-grid-mini {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }

        .stat-card-mini {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 15px;
          text-align: center;
        }

        .stat-card-mini.green {
          border-color: #10b981;
          background: #ecfdf5;
        }

        .stat-card-mini.blue {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .stat-card-mini.red {
          border-color: #ef4444;
          background: #fef2f2;
        }

        .stat-card-mini .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 4px;
        }

        .stat-card-mini .stat-label {
          font-size: 12px;
          color: #6b7280;
          font-weight: 500;
        }

        .filter-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .filter-tabs button {
          padding: 8px 16px;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 6px;
          font-size: 13px;
          color: #374151;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-tabs button:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .filter-tabs button.active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .submissions-section h3 {
          margin: 0 0 15px 0;
          font-size: 16px;
          color: #111827;
        }

        .submissions-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .submission-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 15px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .submission-card:hover {
          background: #f9fafb;
          border-color: #3b82f6;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
        }

        .submission-student {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .student-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 16px;
        }

        .student-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .student-name {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
        }

        .submission-time {
          font-size: 12px;
          color: #6b7280;
        }

        .submission-meta {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .file-count {
          font-size: 13px;
          color: #6b7280;
        }

        .status-badge {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }

        .status-badge.assigned {
          background: #f3f4f6;
          color: #6b7280;
        }

        .status-badge.submitted {
          background: #d1fae5;
          color: #065f46;
        }

        .status-badge.graded {
          background: #dbeafe;
          color: #1e40af;
        }

        .status-badge.late {
          background: #fee2e2;
          color: #991b1b;
        }

        .status-badge.missing {
          background: #fef2f2;
          color: #dc2626;
        }

        .loading-state, .empty-state {
          text-align: center;
          padding: 40px;
          color: #6b7280;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};

export default DeadlineDetailModal;
