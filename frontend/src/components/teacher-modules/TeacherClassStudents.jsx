import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { classAPI } from '../../services/api';
import './TeacherModules.css';

const TeacherClassStudents = () => {
  const { classData } = useOutletContext();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (classData) {
      fetchStudents();
    }
  }, [classData]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('📊 Fetching students for class:', classData.id);
      console.log('📊 Class name:', classData.className);
      console.log('📊 Full classData:', classData);
      
      const response = await classAPI.getClassStudents(classData.id);
      console.log('✅ Students data received:', response.data);
      const studentsList = response.data.students || [];
      // Sort alphabetically by full_name
      const sortedStudents = studentsList.sort((a, b) => {
        const nameA = (a.full_name || '').toLowerCase();
        const nameB = (b.full_name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      setStudents(sortedStudents);
      console.log(`👥 Total enrolled students: ${sortedStudents.length}`);
      if (sortedStudents.length > 0) {
        console.log('Student names:', sortedStudents.map(s => s.full_name).join(', '));
      }
    } catch (error) {
      console.error('❌ Error fetching students:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error data:', error.response?.data);
      console.error('❌ Error message:', error.message);
      
      // More specific error messages
      if (error.response?.status === 404) {
        setError('Class not found or you do not have permission to view students.');
      } else if (error.response?.status === 401) {
        setError('Authentication required. Please log in again.');
      } else if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('Failed to load students. Please try refreshing.');
      }
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

  const formatEnrollmentDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="class-section-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="class-section-container">
      <div className="section-header">
        <div>
          <h2>Enrolled Students</h2>
          <p className="section-subtitle">Managing students in {classData.className}</p>
        </div>
        <div className="header-actions">
          <div className="student-count-badge">
            👥 {students.length} {students.length === 1 ? 'Student' : 'Students'}
          </div>
          <button 
            onClick={fetchStudents} 
            className="btn-refresh"
            disabled={loading}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={fetchStudents} className="btn-retry">Try Again</button>
        </div>
      )}

      {students.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <h3>No students enrolled yet</h3>
          <p className="empty-description">Share the class code with your students to get started</p>
          <div className="class-code-display">
            <div className="code-label">Class Code:</div>
            <div className="code-value">{classData.classCode}</div>
            <button 
              onClick={copyClassCode}
              className="copy-code-btn-inline"
              title="Copy class code"
            >
              {copiedCode ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>
          <p className="empty-hint">Students can join by entering this code on their dashboard</p>
        </div>
      ) : (
        <div className="students-table-container">
          <table className="students-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Full Name</th>
                <th>Enrollment Date</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => (
                <tr key={student.user_id || index}>
                  <td className="student-number-cell">{index + 1}</td>
                  <td>
                    <div className="student-name-cell">
                      <div className="student-avatar-small">
                        {getInitials(student.full_name)}
                      </div>
                      <span className="student-name">{student.full_name || 'Unknown'}</span>
                    </div>
                  </td>
                    <td className="student-date-cell">
                      <span title={new Date(student.enrolled_at).toLocaleString()}>
                        {formatEnrollmentDate(student.enrolled_at)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      )}
    </div>
  );
};

export default TeacherClassStudents;
