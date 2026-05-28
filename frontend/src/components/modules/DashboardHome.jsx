import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { PiGrains } from "react-icons/pi";
import { GiFruitBowl, GiPlantSeed } from "react-icons/gi";
import WelcomeBanner from './WelcomeBanner';
import DashboardWidgets from './DashboardWidgets';
import JoinClass from '../JoinClass';
import './DashboardHome.css';

const DashboardHome = () => {
  const { onClassJoined } = useOutletContext();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleClassJoined = () => {
    if (onClassJoined) {
      onClassJoined();
    }
    // Trigger refresh of dashboard widgets
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="dashboard-home">
      <div className="dashboard-bg-icon dashboard-icon-1"><PiGrains /></div>
      <div className="dashboard-bg-icon dashboard-icon-2"><GiFruitBowl /></div>
      <div className="dashboard-bg-icon dashboard-icon-3"><GiPlantSeed /></div>
      <div className="dashboard-bg-icon dashboard-icon-4"><PiGrains /></div>
      <div className="dashboard-bg-icon dashboard-icon-5"><GiFruitBowl /></div>
      <div className="dashboard-bg-icon dashboard-icon-6"><GiPlantSeed /></div>
      
      <WelcomeBanner />
      <JoinClass onClassJoined={handleClassJoined} />
      <DashboardWidgets key={refreshKey} />
    </div>
  );
};

export default DashboardHome;