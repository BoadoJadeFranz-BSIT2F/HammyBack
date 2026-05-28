import React, { useState, useEffect } from 'react';
import { deadlineAPI } from '../../services/api';
import './Module.css';

const Deadlines = () => {
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, upcoming, overdue, completed

  useEffect(() => {
    fetchDeadlines();
  }, []);

  const fetchDeadlines = async () => {
    try {
      setLoading(true);
      const response = await deadlineAPI.getMyDeadlines();
      setDeadlines(response.data);
    } catch (error) {
      console.error('Error fetching deadlines:', error);
      setError('Failed to load deadlines');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      }),
      full: date.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric', 
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    };
  };

  const getTimeUntil = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due - now;

    if (diff < 0) {
      const overdueDays = Math.floor(Math.abs(diff) / (1000 * 60 * 60 * 24));
      if (overdueDays === 0) {
        const overdueHours = Math.floor(Math.abs(diff) / (1000 * 60 * 60));
        return `${overdueHours} hour${overdueHours !== 1 ? 's' : ''} overdue`;
      }
      return `${overdueDays} day${overdueDays !== 1 ? 's' : ''} overdue`;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''} left`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''} left`;
    } else {
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${minutes} minute${minutes !== 1 ? 's' : ''} left`;
    }
  };

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date();
  };

  const isUpcoming = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due - now;
    const days = diff / (1000 * 60 * 60 * 24);
    return days <= 7 && days > 0;
  };

  const getTypeColor = (type) => {
    const colors = {
      assignment: '#3b82f6',
      project: '#8b5cf6',
      exam: '#ef4444',
      quiz: '#f59e0b',
      other: '#6b7280'
    };
    return colors[type] || colors.other;
  };

  const getTypeIcon = (type) => {
    const icons = {
      assignment: '📝',
      project: '🎯',
      exam: '📚',
      quiz: '📊',
      other: '📌'
    };
    return icons[type] || icons.other;
  };

  const filterDeadlines = (deadlines) => {
    switch (filter) {
      case 'upcoming':
        return deadlines.filter(d => !d.is_completed && isUpcoming(d.due_date));
      case 'overdue':
        return deadlines.filter(d => !d.is_completed && isOverdue(d.due_date));
      case 'completed':
        return deadlines.filter(d => d.is_completed);
      default:
        return deadlines;
    }
  };

  const sortedDeadlines = filterDeadlines([...deadlines]).sort((a, b) => {
    // Sort by completion status first (incomplete first), then by due date
    if (a.is_completed !== b.is_completed) {
      return a.is_completed ? 1 : -1;
    }
    return new Date(a.due_date) - new Date(b.due_date);
  });

  const stats = {
    total: deadlines.length,
    upcoming: deadlines.filter(d => !d.is_completed && isUpcoming(d.due_date)).length,
    overdue: deadlines.filter(d => !d.is_completed && isOverdue(d.due_date)).length,
    completed: deadlines.filter(d => d.is_completed).length
  };

  if (loading) {
    return (
      <div className="module-container">
        <div className="module-header">
          <h1>⏰ Deadlines</h1>
        </div>
        <div className="module-content">
          <div className="loading-state">Loading deadlines...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="module-container">
      <div className="module-header">
        <h1>⏰ Deadlines</h1>
        <p className="module-description">Track all your assignment and project deadlines</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="module-content">
        {/* Stats Cards */}
        <div className="deadline-stats">
          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div className="stat-info">
              <div className="stat-label">Total</div>
              <div className="stat-value">{stats.total}</div>
            </div>
          </div>
          <div className="stat-card upcoming">
            <div className="stat-icon">⏳</div>
            <div className="stat-info">
              <div className="stat-label">Due This Week</div>
              <div className="stat-value">{stats.upcoming}</div>
            </div>
          </div>
          <div className="stat-card overdue">
            <div className="stat-icon">⚠️</div>
            <div className="stat-info">
              <div className="stat-label">Overdue</div>
              <div className="stat-value">{stats.overdue}</div>
            </div>
          </div>
          <div className="stat-card completed">
            <div className="stat-icon">✓</div>
            <div className="stat-info">
              <div className="stat-label">Completed</div>
              <div className="stat-value">{stats.completed}</div>
            </div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="deadline-filters">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({stats.total})
          </button>
          <button 
            className={`filter-btn ${filter === 'upcoming' ? 'active' : ''}`}
            onClick={() => setFilter('upcoming')}
          >
            Due This Week ({stats.upcoming})
          </button>
          <button 
            className={`filter-btn ${filter === 'overdue' ? 'active' : ''}`}
            onClick={() => setFilter('overdue')}
          >
            Overdue ({stats.overdue})
          </button>
          <button 
            className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed ({stats.completed})
          </button>
        </div>

        {/* Deadlines List */}
        {sortedDeadlines.length === 0 ? (
          <div className="empty-deadlines">
            <div className="empty-icon">📅</div>
            <h3>No deadlines found</h3>
            <p>
              {filter === 'all' 
                ? "You don't have any deadlines yet. Check back later!"
                : `No ${filter} deadlines at the moment.`}
            </p>
          </div>
        ) : (
          <div className="deadlines-list">
            {sortedDeadlines.map((deadline) => {
              const { date, time, full } = formatDateTime(deadline.due_date);
              const { date: postedDate, time: postedTime } = deadline.created_at ? formatDateTime(deadline.created_at) : {};
              const overdue = !deadline.is_completed && isOverdue(deadline.due_date);
              const upcoming = !deadline.is_completed && isUpcoming(deadline.due_date);
              const timeUntil = !deadline.is_completed ? getTimeUntil(deadline.due_date) : null;

              return (
                <div 
                  key={deadline.id}
                  className={`deadline-item ${deadline.is_completed ? 'completed' : ''} ${overdue ? 'overdue' : ''} ${upcoming ? 'upcoming' : ''}`}
                >
                  <div className="deadline-item-left">
                    <div 
                      className="deadline-type-icon"
                      style={{ background: getTypeColor(deadline.type) }}
                    >
                      {getTypeIcon(deadline.type)}
                    </div>
                    <div className="deadline-item-content">
                      <div className="deadline-item-header">
                        <h3 className="deadline-item-title">{deadline.title}</h3>
                        <span 
                          className="deadline-type-label"
                          style={{ color: getTypeColor(deadline.type) }}
                        >
                          {deadline.type}
                        </span>
                      </div>
                      
                      {deadline.description && (
                        <p className="deadline-item-description">{deadline.description}</p>
                      )}

                      <div className="deadline-item-meta">
                        <span className="deadline-class">
                          📚 {deadline.classes?.class_name} ({deadline.classes?.section})
                        </span>
                        {postedDate && (
                          <span className="deadline-class">
                            🕒 Posted: {postedDate} at {postedTime}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="deadline-item-right">
                    <div className="deadline-due-info">
                      <div className="due-date">{date}</div>
                      <div className="due-time">{time}</div>
                      {timeUntil && (
                        <div className={`time-until ${overdue ? 'overdue-text' : ''}`}>
                          {timeUntil}
                        </div>
                      )}
                      {deadline.is_completed && (
                        <div className="completed-label">
                          ✓ Completed
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
        .deadline-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: #1a1a1a;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 15px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          border-left: 4px solid #60a5fa;
        }

        .stat-card.upcoming {
          border-left-color: #fb923c;
        }

        .stat-card.overdue {
          border-left-color: #ef5350;
        }

        .stat-card.completed {
          border-left-color: #4ade80;
        }

        .stat-icon {
          font-size: 32px;
        }

        .stat-label {
          font-size: 12px;
          color: #cbd5e1;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #ffffff;
          margin-top: 4px;
        }

        .deadline-filters {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .filter-btn {
          padding: 10px 20px;
          border: 2px solid #e5e7eb;
          background: white;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          color: #1e5a3a;
        }

        .filter-btn:hover {
          border-color: #1e5a3a;
          color: #1e5a3a;
        }

        .filter-btn.active {
          background: #1e5a3a;
          border-color: #1e5a3a;
          color: white;
        }

        .deadlines-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .deadline-item {
          background: white;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          transition: all 0.3s ease;
          border-left: 4px solid #3b82f6;
        }

        .deadline-item:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          transform: translateX(4px);
        }

        .deadline-item.completed {
          opacity: 0.6;
          background: #f9fafb;
        }

        .deadline-item.overdue {
          border-left-color: #ef4444;
          background: #fef2f2;
        }

        .deadline-item.upcoming {
          border-left-color: #f59e0b;
        }

        .deadline-item-left {
          display: flex;
          gap: 15px;
          flex: 1;
        }

        .deadline-type-icon {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          flex-shrink: 0;
        }

        .deadline-item-content {
          flex: 1;
        }

        .deadline-item-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }

        .deadline-item-title {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .deadline-type-label {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .deadline-item-description {
          font-size: 14px;
          color: #6b7280;
          margin: 0 0 10px 0;
          line-height: 1.5;
        }

        .deadline-item-meta {
          display: flex;
          gap: 15px;
          font-size: 13px;
          color: #6b7280;
        }

        .deadline-class {
          font-weight: 500;
        }

        .deadline-item-right {
          text-align: right;
          flex-shrink: 0;
        }

        .deadline-due-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .due-date {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
        }

        .due-time {
          font-size: 14px;
          color: #6b7280;
        }

        .time-until {
          font-size: 13px;
          font-weight: 600;
          color: #f59e0b;
          margin-top: 8px;
          padding: 4px 8px;
          background: #fffbeb;
          border-radius: 6px;
        }

        .time-until.overdue-text {
          color: #dc2626;
          background: #fee2e2;
        }

        .completed-label {
          font-size: 13px;
          font-weight: 600;
          color: #10b981;
          margin-top: 8px;
          padding: 4px 8px;
          background: #d1fae5;
          border-radius: 6px;
        }

        .empty-deadlines {
          text-align: center;
          padding: 60px 20px;
          color: #111827;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 20px;
        }

        .empty-deadlines h3 {
          font-size: 24px;
          color: #111827;
          margin: 0 0 10px 0;
          font-weight: 700;
        }

        .empty-deadlines p {
          font-size: 16px;
          margin: 0;
          font-weight: 600;
        }

        .loading-state {
          text-align: center;
          padding: 60px 20px;
          color: #111827;
          font-size: 16px;
          font-weight: 600;
        }

        .error-message {
          margin: 20px;
          padding: 15px;
          background: #fee;
          color: #c00;
          border-radius: 8px;
          text-align: center;
        }

        @media (max-width: 768px) {
          .deadline-item {
            flex-direction: column;
            gap: 15px;
          }

          .deadline-item-right {
            text-align: left;
            width: 100%;
          }

          .deadline-due-info {
            flex-direction: row;
            gap: 10px;
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
};

export default Deadlines;