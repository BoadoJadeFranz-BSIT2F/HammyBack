import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { classAPI } from '../services/api';
import './SubjectsSidebar.css';

const SubjectsSidebar = ({ refreshTrigger }) => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchEnrolledClasses = async () => {
    try {
      setLoading(true);
      const response = await classAPI.getEnrolledClasses();
      console.log('SubjectsSidebar - Enrolled classes:', response.data);
      const enrolledClasses = response.data.classes || [];
      setClasses(enrolledClasses);
      // Store in localStorage for ClassDetail component
      localStorage.setItem('enrolledClasses', JSON.stringify(enrolledClasses));
    } catch (error) {
      console.error('Error fetching enrolled classes:', error);
      console.error('Error details:', error.response?.data || error.message);
      // Try to load from localStorage as fallback
      const cachedClasses = localStorage.getItem('enrolledClasses');
      if (cachedClasses) {
        console.log('Loading classes from cache');
        setClasses(JSON.parse(cachedClasses));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrolledClasses();
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="subjects-sidebar">
        <h3 className="sidebar-title">Subjects Enrolled</h3>
        <div className="subjects-list">
          <div className="loading-message">Loading classes...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="subjects-sidebar">
      <h3 className="sidebar-title">Subjects Enrolled</h3>
      <div className="subjects-list">
        {classes.length === 0 ? (
          <div className="empty-message">
            <img src="/images/hamster-join.png" alt="Join a class" className="empty-hamster" />
            <p>No classes enrolled yet.</p>
            <p className="hint">Enter a class code to join!</p>
          </div>
        ) : (
          classes.map((classItem, index) => (
            <div 
              key={classItem.id} 
              className="subject-card clickable"
              onClick={() => navigate(`/dashboard/class/${classItem.id}`)}
            >
              {index === 0 && <div className="subject-badge">1</div>}
              <div className="subject-icon">
                <img src="https://via.placeholder.com/60" alt="Subject" />
              </div>
              <div className="subject-info">
                <div className="subject-name">{classItem.className}</div>
                <div className="subject-year">
                  {classItem.section} • {classItem.classCode}
                </div>
                {classItem.subject && <div className="subject-instructor">{classItem.subject}</div>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SubjectsSidebar;
