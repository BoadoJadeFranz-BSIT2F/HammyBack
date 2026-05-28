import React from 'react';
import './TeacherModules.css';

const TeacherStudents = () => {
  return (
    <div className="teacher-module-container">
      <div className="teacher-module-header">
        <h2>Students</h2>
      </div>

      <div className="teacher-files-content">
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <p>No students enrolled yet</p>
        </div>
      </div>
    </div>
  );
};

export default TeacherStudents;
