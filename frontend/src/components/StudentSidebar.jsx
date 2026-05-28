import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { classAPI, taskAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { IoHomeOutline, IoCalendarOutline, IoTimeOutline, IoStatsChartOutline, IoSchoolOutline, IoCheckboxOutline, IoTimerOutline, IoHeartOutline, IoArchiveOutline, IoSettingsOutline, IoLogOutOutline } from 'react-icons/io5';
import './StudentSidebar.css';

const StudentSidebar = ({ refreshTrigger }) => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasTasks, setHasTasks] = useState(false);
  const [hamsterImage, setHamsterImage] = useState('/images/hamster-task.jpg');
  const navigate = useNavigate();
  const { logout } = useAuth();

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <IoHomeOutline /> },
    { name: 'Schedules', path: '/dashboard/schedules', icon: <IoCalendarOutline /> },
    { name: 'Deadlines', path: '/dashboard/deadlines', icon: <IoTimeOutline /> },
    { name: 'Analytics', path: '/dashboard/analytics', icon: <IoStatsChartOutline /> },
    { name: 'Grades', path: '/dashboard/grades', icon: <IoSchoolOutline /> },
    { name: 'Tasks', path: '/dashboard/tasks', icon: <IoCheckboxOutline /> },
    { name: 'Pomodoro', path: '/dashboard/pomodoro', icon: <IoTimerOutline /> },
    { name: 'Wellness', path: '/dashboard/wellness', icon: <IoHeartOutline /> },
    { name: 'Archive', path: '/dashboard/archive', icon: <IoArchiveOutline /> }
  ];

  const fetchEnrolledClasses = async () => {
    try {
      setLoading(true);
      const response = await classAPI.getEnrolledClasses();
      console.log('Enrolled classes response:', response.data);
      const enrolledClasses = response.data.classes || [];
      setClasses(enrolledClasses);
    } catch (error) {
      console.error('Error fetching enrolled classes:', error);
      console.error('Error details:', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const checkTasks = async () => {
    try {
      const response = await taskAPI.getMyTasks();
      const tasks = response.data.personalTasks || [];
      setHasTasks(tasks.length > 0);
      updateHamsterImage(tasks);
    } catch (error) {
      console.error('Error fetching task status:', error);
      setHasTasks(false);
      setHamsterImage('/images/hamster-task.jpg');
    }
  };

  // Get the appropriate hamster image based on task status
  const updateHamsterImage = (tasks) => {
    if (!tasks || tasks.length === 0) {
      setHamsterImage('/images/hamster-task.jpg'); // Default - no tasks
      return;
    }

    const pendingTasks = tasks.filter(t => !t.is_completed).length;
    
    // Calculate tasks completed this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const completedThisWeek = tasks.filter(task => 
      task.is_completed && 
      task.completed_at && 
      new Date(task.completed_at) >= oneWeekAgo
    ).length;

    // Priority order:
    // 1. If more than 3 pending tasks
    if (pendingTasks > 3) {
      setHamsterImage('/images/hamster-task (have more than 3 tasks).png');
    }
    // 2. If completed more than 1 task this week
    else if (completedThisWeek > 1) {
      setHamsterImage('/images/hamster-task (done more than 1).jpg');
    }
    // 3. If completed exactly 1 task this week
    else if (completedThisWeek === 1) {
      setHamsterImage('/images/hamster-task (done 1 task for the week).jpg');
    }
    // 4. Default - no tasks completed yet
    else {
      setHamsterImage('/images/hamster-task.jpg');
    }
  };

  useEffect(() => {
    fetchEnrolledClasses();
    checkTasks();

    // Check tasks periodically
    const interval = setInterval(checkTasks, 5000);
    return () => clearInterval(interval);
  }, [refreshTrigger]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="student-sidebar">
      <nav className="sidebar-nav">
        {menuItems.map((item, index) => (
          <React.Fragment key={index}>
            <NavLink
              to={item.path}
              end={index === 0}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-text">{item.name}</span>
            </NavLink>
            
            {item.name === 'Tasks' && (
              <div className="empty-tasks-message">
                <img src={hamsterImage} alt="Hamster task status" className="hamster-no-tasks" />
              </div>
            )}
          </React.Fragment>
        ))}
      </nav>

      <div className="subjects-section">
        <h4 className="subjects-title">My Classes</h4>
        {loading ? (
          <div className="loading-text">Loading...</div>
        ) : classes.length === 0 ? (
          <div className="empty-classes">
            <p>No classes yet</p>
          </div>
        ) : (
          <div className="classes-list">
            {classes.slice(0, 3).map((classItem) => (
              <div
                key={classItem.id}
                className="class-item"
                onClick={() => navigate(`/dashboard/class/${classItem.id}`)}
              >
                <div className="class-icon">📚</div>
                <div className="class-info">
                  <div className="class-name">{classItem.className}</div>
                  <div className="class-section">{classItem.section}</div>
                </div>
              </div>
            ))}
            {classes.length > 3 && (
              <div className="view-all">View all ({classes.length})</div>
            )}
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        <NavLink to="/dashboard/profile" className="footer-item">
          <IoSettingsOutline className="footer-icon" />
          <span>Settings</span>
        </NavLink>
        <button onClick={handleLogout} className="footer-item logout-btn">
          <IoLogOutOutline className="footer-icon" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
};

export default StudentSidebar;
