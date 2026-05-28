import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { taskAPI } from '../../services/api';
import './WelcomeBanner.css';

const WelcomeBanner = () => {
  const { user } = useAuth();
  const [imageError, setImageError] = useState(false);
  const [tasks, setTasks] = useState([]);
  const currentHour = new Date().getHours();
  
  // Load real tasks data
  useEffect(() => {
    const loadTasks = async () => {
      try {
        const response = await taskAPI.getMyTasks();
        setTasks(response.data.personalTasks || []);
      } catch (error) {
        console.error('Failed to load personal tasks:', error);
        setTasks([]);
      }
    };
    
    loadTasks();

    const interval = setInterval(loadTasks, 10000);
    return () => clearInterval(interval);
  }, []);
  
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.is_completed).length;
  const remainingTasks = totalTasks - completedTasks;
  
  const getGreeting = () => {
    if (currentHour < 12) return 'Good morning';
    if (currentHour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getTaskMessage = () => {
    if (totalTasks === 0) {
      return "No tasks for today. Take some time to relax!";
    }
    if (remainingTasks === 0) {
      return "All tasks completed! Great job today!";
    }
    if (remainingTasks === 1) {
      return "You're 1 task away from completing today's goal.";
    }
    return `You're ${remainingTasks} tasks away from completing today's goal.`;
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className="welcome-banner">
      <div className="welcome-content">
        <h2 className="welcome-title">
          {getGreeting()}, {user?.name?.split(' ')[0] || 'Student'}.
        </h2>
        <p className="welcome-message">
          {getTaskMessage()}
        </p>
      </div>
      <div className="profile-box">
        {!imageError && user?.profilePicture ? (
          <img 
            src={user.profilePicture} 
            alt={user?.name || "User"}
            className="profile-picture"
            onError={handleImageError}
          />
        ) : (
          <div className="profile-fallback">
            {user?.name?.charAt(0).toUpperCase() || '👤'}
          </div>
        )}
      </div>
    </div>
  );
};

export default WelcomeBanner;
