import React, { useState, useEffect } from 'react';
import { submissionAPI, deadlineAPI } from '../../services/api';
import StudentDeadlineView from './StudentDeadlineView';
import { isDeadlineArchived, onArchiveChange } from '../../services/archive';
import './Module.css';

const StudentDeadlines = ({ classId = null, embedded = false }) => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, to-do, submitted, graded, missing
  const [selectedDeadline, setSelectedDeadline] = useState(null);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  useEffect(() => {
    const unsubscribe = onArchiveChange(() => fetchSubmissions());
    return unsubscribe;
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const response = await submissionAPI.getAllSubmissions();
      const normalized = (response.data.submissions || []).map((item) => ({
        ...item,
        deadline: item.deadline || item.deadlines
      }));
      setSubmissions(normalized);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      setError('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays > 0 && diffDays <= 7) return `Due in ${diffDays} days`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOverdue = (dueDate, status) => {
    return new Date() > new Date(dueDate) && status === 'assigned';
  };

  const getStatusBadge = (submission) => {
    if (submission.status === 'graded') {
      return <span className="badge graded">📝 Graded</span>;
    }
    if (submission.status === 'turned_in') {
      if (submission.is_late) {
        return <span className="badge late">⏰ Late</span>;
      }
      return <span className="badge submitted">✅ Submitted</span>;
    }
    if (isOverdue(submission.deadline?.due_date, submission.status)) {
      return <span className="badge missing">❌ Missing</span>;
    }
    return <span className="badge todo">📋 To Do</span>;
  };

  const getDeadlineClassLabel = (deadline) => {
    return (
      deadline?.class_name ||
      deadline?.className ||
      deadline?.classes?.class_name ||
      deadline?.classes?.className ||
      'Unknown Class'
    );
  };

  const classFilteredSubmissions = (classId
    ? submissions.filter((sub) => String(sub.deadline?.class_id || sub.deadline?.classes?.id) === String(classId))
    : submissions
  ).filter((sub) => !isDeadlineArchived(sub.deadline?.id));

  const filteredSubmissions = classFilteredSubmissions.filter(sub => {
    if (filter === 'to-do') return sub.status === 'assigned' && !isOverdue(sub.deadline?.due_date, sub.status);
    if (filter === 'submitted') return sub.status === 'turned_in';
    if (filter === 'graded') return sub.status === 'graded';
    if (filter === 'missing') return isOverdue(sub.deadline?.due_date, sub.status);
    return true;
  });

  const stats = {
    total: classFilteredSubmissions.length,
    toDo: classFilteredSubmissions.filter(s => s.status === 'assigned' && !isOverdue(s.deadline?.due_date, s.status)).length,
    submitted: classFilteredSubmissions.filter(s => s.status === 'turned_in').length,
    graded: classFilteredSubmissions.filter(s => s.status === 'graded').length,
    missing: classFilteredSubmissions.filter(s => isOverdue(s.deadline?.due_date, s.status)).length
  };

  const handleDeadlineClick = (submission) => {
    // Merge submission data into deadline for the modal
    const deadlineWithDetails = {
      ...submission.deadline,
      submission_id: submission.id,
      submission_status: submission.status
    };
    setSelectedDeadline(deadlineWithDetails);
  };

  const handleCloseModal = () => {
    setSelectedDeadline(null);
    fetchSubmissions(); // Refresh after submission
  };

  if (selectedDeadline) {
    return (
      <StudentDeadlineView
        deadline={selectedDeadline}
        onClose={handleCloseModal}
        onSubmitted={handleCloseModal}
      />
    );
  }

  if (loading) {
    return (
      <div className="module-container">
        <div className="module-header">
          <h1>{embedded ? '⏰ Class Deadlines' : '📚 My Assignments'}</h1>
        </div>
        <div className="loading-state">Loading assignments...</div>
      </div>
    );
  }

  return (
    <div className="module-container">
      <div className="module-header">
        <div>
          <h1>{embedded ? '⏰ Class Deadlines' : '📚 My Assignments'}</h1>
          <p className="module-description">
            {embedded ? 'Track and submit activities for this class' : 'View and submit your assignments'}
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dbeafe', color: '#3b82f6' }}>📋</div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Assignments</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7', color: '#f59e0b' }}>⏳</div>
          <div className="stat-content">
            <div className="stat-value">{stats.toDo}</div>
            <div className="stat-label">To Do</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#d1fae5', color: '#059669' }}>✓</div>
          <div className="stat-content">
            <div className="stat-value">{stats.submitted}</div>
            <div className="stat-label">Submitted</div>
          </div>
        </div>
        <div className="stat-card missing-card">
          <div className="stat-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>❌</div>
          <div className="stat-content">
            <div className="stat-value">{stats.missing}</div>
            <div className="stat-label">Missing</div>
          </div>
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
          className={filter === 'to-do' ? 'active' : ''} 
          onClick={() => setFilter('to-do')}
        >
          To Do ({stats.toDo})
        </button>
        <button 
          className={filter === 'submitted' ? 'active' : ''} 
          onClick={() => setFilter('submitted')}
        >
          Submitted ({stats.submitted})
        </button>
        <button 
          className={filter === 'graded' ? 'active' : ''} 
          onClick={() => setFilter('graded')}
        >
          Graded ({stats.graded})
        </button>
        {stats.missing > 0 && (
          <button 
            className={filter === 'missing' ? 'active' : ''} 
            onClick={() => setFilter('missing')}
          >
            Missing ({stats.missing})
          </button>
        )}
      </div>

      {/* Assignments List */}
      <div className="assignments-container">
        {filteredSubmissions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <p>
              {filter === 'all' 
                ? 'No assignments yet. Join a class to see assignments.' 
                : `No ${filter.replace('-', ' ')} assignments.`}
            </p>
          </div>
        ) : (
          <div className="assignments-list">
            {filteredSubmissions
              .sort((a, b) => new Date(a.deadline?.due_date) - new Date(b.deadline?.due_date))
              .map((submission) => {
                const deadline = submission.deadline;
                if (!deadline) return null;

                const overdue = isOverdue(deadline.due_date, submission.status);
                
                return (
                  <div
                    key={submission.id}
                    className={`assignment-card ${overdue ? 'overdue' : ''}`}
                    onClick={() => handleDeadlineClick(submission)}
                  >
                    <div className="assignment-main">
                      <div className="assignment-type-icon" style={{ 
                        background: submission.status === 'graded' ? '#3b82f6' : 
                                   submission.status === 'turned_in' ? '#10b981' : 
                                   overdue ? '#ef4444' : '#f59e0b'
                      }}>
                        {submission.status === 'graded' ? '📝' : 
                         submission.status === 'turned_in' ? '✅' : 
                         overdue ? '❌' : '📋'}
                      </div>
                      
                      <div className="assignment-content">
                        <div className="assignment-header">
                          <h3 className="assignment-title">{deadline.title}</h3>
                          {getStatusBadge(submission)}
                        </div>
                        
                        <div className="assignment-meta">
                          <span className="assignment-class">
                            📚 {getDeadlineClassLabel(deadline)}
                          </span>
                          <span className="assignment-separator">•</span>
                          <span className="assignment-type" style={{ textTransform: 'capitalize' }}>
                            {deadline.type}
                          </span>
                          <span className="assignment-separator">•</span>
                          <span className="assignment-points">
                            🎯 {deadline.points} pts
                          </span>
                        </div>

                        {submission.status === 'graded' && (
                          <div className="grade-display">
                            Grade: {submission.grade}/{deadline.points} ({((submission.grade / deadline.points) * 100).toFixed(1)}%)
                          </div>
                        )}
                      </div>

                      <div className="assignment-due">
                        <div className={`due-label ${overdue ? 'overdue' : ''}`}>
                          {formatDate(deadline.due_date)}
                        </div>
                        {submission.submitted_at && (
                          <div className="submitted-label">
                            Submitted {new Date(submission.submitted_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      <style jsx>{`
        .stats-grid .stat-card {
          background: #1e5a3a;
          border: 1px solid #14532d;
        }

        .stats-grid .stat-card .stat-value {
          color: #ffffff;
        }

        .stats-grid .stat-card .stat-label {
          color: #e8f5e9;
        }

        .stats-grid .stat-card.missing-card {
          background: white;
          border: 1px solid #e5e7eb;
        }

        .stats-grid .stat-card.missing-card .stat-value {
          color: #1f2937;
        }

        .stats-grid .stat-card.missing-card .stat-label {
          color: #6b7280;
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
          color: #1e5a3a;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-tabs button:hover {
          background: #f0fdf4;
          border-color: #1e5a3a;
        }

        .filter-tabs button.active {
          background: #1e5a3a;
          color: white;
          border-color: #1e5a3a;
        }

        .assignments-container {
          padding: 20px 0;
        }

        .assignments-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .assignment-card {
          background: white;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .assignment-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border-color: #3b82f6;
        }

        .assignment-card.overdue {
          border-left: 4px solid #ef4444;
        }

        .assignment-main {
          display: flex;
          gap: 15px;
          align-items: center;
        }

        .assignment-type-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          flex-shrink: 0;
        }

        .assignment-content {
          flex: 1;
        }

        .assignment-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }

        .assignment-title {
          margin: 0;
          font-size: 16px;
          color: #111827;
          font-weight: 600;
        }

        .badge {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }

        .badge.todo {
          background: #fef3c7;
          color: #92400e;
        }

        .badge.submitted {
          background: #d1fae5;
          color: #065f46;
        }

        .badge.graded {
          background: #dbeafe;
          color: #1e40af;
        }

        .badge.late {
          background: #fee2e2;
          color: #991b1b;
        }

        .badge.missing {
          background: #fef2f2;
          color: #dc2626;
        }

        .assignment-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #6b7280;
          flex-wrap: wrap;
        }

        .assignment-separator {
          color: #d1d5db;
        }

        .grade-display {
          margin-top: 8px;
          padding: 6px 12px;
          background: #eff6ff;
          border-radius: 6px;
          font-size: 13px;
          color: #1e40af;
          font-weight: 600;
          display: inline-block;
        }

        .assignment-due {
          text-align: right;
          flex-shrink: 0;
        }

        .due-label {
          font-size: 13px;
          font-weight: 600;
          color: #6b7280;
        }

        .due-label.overdue {
          color: #ef4444;
        }

        .submitted-label {
          font-size: 12px;
          color: #10b981;
          margin-top: 4px;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #6b7280;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }

        .empty-state p {
          font-size: 16px;
          margin: 0;
        }

        .loading-state {
          text-align: center;
          padding: 40px;
          color: #6b7280;
        }

        .alert {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .alert-error {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }
      `}</style>
    </div>
  );
};

export default StudentDeadlines;
