import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { classAPI } from '../services/api';
import { IoArrowBack, IoExitOutline } from 'react-icons/io5';
import StudentClassFiles from './modules/StudentClassFiles';
import StudentDeadlines from './modules/StudentDeadlines';
import './ClassDetail.css';

const ClassDetail = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, files, deadlines
  const [classData, setClassData] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadClass = async () => {
      setPageLoading(true);

      // Fast fallback from local cache while API loads.
      const cached = JSON.parse(localStorage.getItem('enrolledClasses') || '[]');
      const cachedClass = cached.find((c) => String(c.id) === String(classId));
      if (!cancelled && cachedClass) {
        setClassData(cachedClass);
      }

      try {
        const response = await classAPI.getEnrolledClasses();
        const apiClasses = response.data?.classes || [];

        // Normalize shape so the UI always gets consistent field names.
        const normalized = apiClasses.map((c) => ({
          ...c,
          className: c.className || c.class_name,
          classCode: c.classCode || c.class_code,
          enrolledAt: c.enrolledAt || c.enrolled_at
        }));

        localStorage.setItem('enrolledClasses', JSON.stringify(normalized));

        if (!cancelled) {
          const matched = normalized.find((c) => String(c.id) === String(classId)) || null;
          setClassData(matched);
        }
      } catch (error) {
        console.error('Error loading class detail:', error);
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    };

    loadClass();
    return () => {
      cancelled = true;
    };
  }, [classId]);

  const handleLeaveClass = async () => {
    try {
      setLoading(true);
      await classAPI.leaveClass(classId);
      const classes = JSON.parse(localStorage.getItem('enrolledClasses') || '[]');
      const updatedClasses = classes.filter((c) => String(c.id) !== String(classId));
      localStorage.setItem('enrolledClasses', JSON.stringify(updatedClasses));
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Error leaving class:', error);
      alert(error.response?.data?.message || 'Failed to leave class');
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="class-detail-container">
        <div className="class-not-found">
          <h2>Loading class...</h2>
        </div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="class-detail-container">
        <div className="class-not-found">
          <h2>Class not found</h2>
          <button onClick={() => navigate('/dashboard')} className="back-btn">
            <IoArrowBack /> Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="class-detail-container">
      <div className="class-detail-content">
        <div className="class-header-banner">
          <h1>{classData.className}</h1>
          <p className="class-section">Section: {classData.section}</p>
        </div>

        {/* Tabs */}
        <div className="class-detail-tabs">
          <button 
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📋 Overview
          </button>
          <button 
            className={`tab-btn ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            📚 Class Materials
          </button>
          <button 
            className={`tab-btn ${activeTab === 'deadlines' ? 'active' : ''}`}
            onClick={() => setActiveTab('deadlines')}
          >
            ⏰ Deadlines
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' ? (
          <>
            <div className="class-info-grid">
              <div className="info-card">
                <h3>Class Code</h3>
                <p className="class-code-display">{classData.classCode}</p>
              </div>

              {classData.subject && (
                <div className="info-card">
                  <h3>Subject</h3>
                  <p>{classData.subject}</p>
                </div>
              )}

              {classData.room && (
                <div className="info-card">
                  <h3>Room</h3>
                  <p>{classData.room}</p>
                </div>
              )}

              <div className="info-card">
                <h3>Enrolled Date</h3>
                <p>{new Date(classData.enrolledAt).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="class-actions">
              <button 
                onClick={() => setShowConfirm(true)} 
                className="leave-class-btn"
                disabled={loading}
              >
                <IoExitOutline /> Leave Class
              </button>
            </div>
          </>
        ) : activeTab === 'files' ? (
          <StudentClassFiles />
        ) : (
          <StudentDeadlines classId={classId} embedded />
        )}
      </div>

      {showConfirm && (
        <div className="modal-overlay" onClick={() => !loading && setShowConfirm(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Leave Class?</h2>
            <p>Are you sure you want to leave <strong>{classData.className}</strong>?</p>
            <p className="warning-text">You will need the class code to rejoin.</p>
            
            <div className="modal-actions">
              <button 
                onClick={() => setShowConfirm(false)} 
                className="cancel-btn"
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                onClick={handleLeaveClass} 
                className="confirm-leave-btn"
                disabled={loading}
              >
                {loading ? 'Leaving...' : 'Leave Class'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassDetail;
