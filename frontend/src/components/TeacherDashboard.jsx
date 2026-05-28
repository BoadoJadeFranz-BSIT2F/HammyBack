import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import TeacherSidebar from './TeacherSidebar';
import './TeacherDashboard.css';

const TeacherDashboard = () => {
  const [classCreatedTrigger, setClassCreatedTrigger] = useState(0);

  const handleClassCreated = () => {
    setClassCreatedTrigger((prev) => prev + 1);
  };

  return (
    <div className="teacher-dashboard-container">
      <Navbar />
      <TeacherSidebar onClassCreated={classCreatedTrigger} />
      <div className="teacher-dashboard-content">
        <div className="teacher-dashboard-main">
          <Outlet context={{ onClassCreated: handleClassCreated }} />
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
