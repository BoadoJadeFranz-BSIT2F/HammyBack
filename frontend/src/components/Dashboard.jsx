import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import StudentSidebar from './StudentSidebar';
import './Dashboard.css';

const Dashboard = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const location = useLocation();

  const handleClassJoined = () => {
    // Increment to trigger refresh of StudentSidebar
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="dashboard-container">
      <Navbar />
      <StudentSidebar refreshTrigger={refreshTrigger} />
      <div className="dashboard-content">
        <div className="dashboard-main">
          {/* Outlet renders the nested route components */}
          <Outlet context={{ onClassJoined: handleClassJoined, refreshTrigger }} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
