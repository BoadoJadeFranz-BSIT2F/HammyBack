import React, { useState, useEffect } from 'react';
import { useParams, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { classAPI } from '../../services/api';
import { archiveMaterial } from '../../services/archive';
import './TeacherModules.css';

const TeacherClassDetail = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    fetchClassData();
  }, [classId]);

  const fetchClassData = async () => {
    try {
      setLoading(true);
      const response = await classAPI.getMyClasses();
      const foundClass = response.data.classes.find(c => c.id === parseInt(classId));
      if (!foundClass) {
        setClassData(null);
        return;
      }

      // Normalize legacy/new field names so nested modules work consistently.
      setClassData({
        ...foundClass,
        className: foundClass.className || foundClass.class_name,
        classCode: foundClass.classCode || foundClass.class_code
      });
    } catch (error) {
      console.error('Error fetching class data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyClassCode = () => {
    if (classData?.classCode) {
      navigator.clipboard.writeText(classData.classCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleArchiveClass = () => {
    if (!window.confirm('Archive this class? You can manage it later in Archive.')) return;

    archiveMaterial({
      source_type: 'class',
      source_id: classData.id,
      title: classData.className,
      class_id: classData.id,
      class_name: classData.className,
      description: `Section: ${classData.section || 'N/A'}`
    });

    navigate('/teacher-dashboard/archive');
  };

  if (loading) {
    return (
      <div className="teacher-module-container">
        <div className="loading-state">Loading class details...</div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="teacher-module-container">
        <div className="error-state">Class not found</div>
      </div>
    );
  }

  return (
    <div className="teacher-class-detail-container">
      {/* Breadcrumb Navigation */}
      <div className="breadcrumb-nav">
        <button className="breadcrumb-link" onClick={() => navigate('/teacher-dashboard')}>
          🏠 Dashboard
        </button>
        <span className="breadcrumb-separator">›</span>
        <span className="breadcrumb-current">{classData.className}</span>
      </div>

      {/* Class Header */}
      <div className="class-detail-header">
        <div className="class-header-actions">
          <button
            className="archive-class-btn"
            onClick={handleArchiveClass}
            title="Archive class"
          >
            🗂️ Archive Class
          </button>
        </div>
        <div className="class-header-info">
          <h1>{classData.className}</h1>
          <div className="class-meta">
            <span className="class-section">{classData.section}</span>
            <span className="class-separator">•</span>
            <span className="class-code">
              Code: {classData.classCode}
              <button 
                onClick={copyClassCode}
                className="copy-code-btn"
                title="Copy class code"
              >
                {copiedCode ? '✓ Copied!' : '📋 Copy'}
              </button>
            </span>
            {classData.subject && (
              <>
                <span className="class-separator">•</span>
                <span className="class-subject">{classData.subject}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Class Sub-Navigation */}
      <div className="class-subnav">
        <NavLink
          to={`/teacher-dashboard/class/${classId}/files`}
          className={({ isActive }) => `class-subnav-item ${isActive ? 'active' : ''}`}
        >
          📁 Files & Materials
        </NavLink>
        <NavLink
          to={`/teacher-dashboard/class/${classId}/deadlines`}
          className={({ isActive }) => `class-subnav-item ${isActive ? 'active' : ''}`}
        >
          📅 Deadlines
        </NavLink>
        <NavLink
          to={`/teacher-dashboard/class/${classId}/students`}
          className={({ isActive }) => `class-subnav-item ${isActive ? 'active' : ''}`}
        >
          👥 Students
        </NavLink>
      </div>

      {/* Content Area */}
      <div className="class-detail-content">
        <Outlet context={{ classData }} />
      </div>
    </div>
  );
};

export default TeacherClassDetail;
