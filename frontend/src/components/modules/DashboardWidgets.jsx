import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoCheckboxOutline, IoTimeOutline, IoTrendingUpOutline, IoFlameOutline, IoArrowForward, IoCalendarOutline, IoAlertCircleOutline } from 'react-icons/io5';
import { classAPI, scheduleAPI, taskAPI } from '../../services/api';
import './DashboardWidgets.css';

const DashboardWidgets = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [classes, setClasses] = useState([]);

  // Load real data
  useEffect(() => {
    loadTasks();
    loadSchedules();
    loadClasses();
    
    // Update every 30 seconds
    const interval = setInterval(() => {
      loadTasks();
      loadSchedules();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadTasks = () => {
    taskAPI.getMyTasks()
      .then((res) => setTasks(res.data.personalTasks || []))
      .catch((error) => {
        console.error('Error loading tasks:', error);
        setTasks([]);
      });
  };

  const loadSchedules = async () => {
    try {
      const response = await scheduleAPI.getAll();
      setSchedules(response.data);
    } catch (error) {
      console.error('Error loading schedules:', error);
    }
  };

  const loadClasses = async () => {
    try {
      const response = await classAPI.getEnrolledClasses();
      setClasses(response.data.classes || []);
    } catch (error) {
      console.error('Error loading classes:', error);
      setClasses([]);
    }
  };

  // Calculate stats
  const completedTasks = tasks.filter(t => t.is_completed).length;
  const progressPercentage = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  
  // Get today's schedule
  const getTodaySchedule = () => {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = daysOfWeek[new Date().getDay()];
    return schedules
      .filter(s => s.day === today)
      .sort((a, b) => convertTo24Hour(a.time) - convertTo24Hour(b.time))
      .slice(0, 4);
  };

  const convertTo24Hour = (time) => {
    const [timeStr, period] = time.split(' ');
    let [hours, minutes] = timeStr.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  // Get upcoming deadlines
  const getUpcomingDeadlines = () => {
    const now = new Date();
    return tasks
      .filter(t => !t.is_completed && t.due_date)
      .map(t => ({
        ...t,
        title: t.title,
        deadlineDate: new Date(t.due_date),
        daysUntil: Math.ceil((new Date(t.due_date) - now) / (1000 * 60 * 60 * 24))
      }))
      .sort((a, b) => a.deadlineDate - b.deadlineDate)
      .slice(0, 3);
  };

  // Calculate streak (days with completed tasks)
  const calculateStreak = () => {
    if (tasks.length === 0) return 0;
    let streak = 0;
    let currentDate = new Date();
    
    for (let i = 0; i < 30; i++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const hasCompletedTask = tasks.some(t => 
        t.is_completed && t.completed_at && String(t.completed_at).startsWith(dateStr)
      );
      
      if (hasCompletedTask) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (i > 0) {
        break;
      } else {
        currentDate.setDate(currentDate.getDate() - 1);
      }
    }
    
    return streak;
  };

  // Get tasks completed this week
  const getTasksCompletedThisWeek = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    return tasks.filter(task => 
      task.is_completed && 
      task.completed_at && 
      new Date(task.completed_at) >= oneWeekAgo
    ).length;
  };

  const todaySchedule = getTodaySchedule();
  const upcomingDeadlines = getUpcomingDeadlines();
  const weeklyCompleted = getTasksCompletedThisWeek();
  const streak = calculateStreak();

  const statsCards = [
    { 
      icon: <IoCheckboxOutline />, 
      value: tasks.length > 0 ? `${completedTasks}/${tasks.length}` : '0/0', 
      label: 'Tasks Done', 
      color: '#10b981',
      onClick: () => navigate('/dashboard/tasks')
    },
    { 
      icon: <IoCalendarOutline />, 
      value: todaySchedule.length.toString(), 
      label: 'Classes Today', 
      color: '#3b82f6',
      onClick: () => navigate('/dashboard/schedules')
    },
    { 
      icon: <IoTrendingUpOutline />, 
      value: weeklyCompleted.toString(), 
      label: 'This Week', 
      color: '#8b5cf6',
      onClick: () => navigate('/dashboard/tasks')
    },
    { 
      icon: <IoFlameOutline />, 
      value: streak.toString(), 
      label: 'Day Streak', 
      color: '#f59e0b',
      onClick: () => navigate('/dashboard/tasks')
    }
  ];

  const formatDeadline = (daysUntil) => {
    if (daysUntil < 0) return `Overdue by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''}`;
    if (daysUntil === 0) return 'Due today';
    if (daysUntil === 1) return 'Due tomorrow';
    return `Due in ${daysUntil} days`;
  };

  return (
    <div className="dashboard-widgets">
      {/* Stats Cards */}
      <div className="stats-grid">
        {statsCards.map((stat, index) => (
          <div 
            key={index} 
            className="stat-card clickable"
            onClick={stat.onClick}
          >
            <div className="stat-icon" style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
              {stat.icon}
            </div>
            <div className="stat-content">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Widgets */}
      <div className="widgets-grid">
        {/* Today's Schedule */}
        <div className="widget-card">
          <div className="widget-header">
            <div className="widget-title-group">
              <IoCalendarOutline className="widget-icon" style={{ color: '#3b82f6' }} />
              <h3>Today's Schedule</h3>
            </div>
            <button 
              className="view-all-btn"
              onClick={() => navigate('/dashboard/schedules')}
            >
              View All <IoArrowForward />
            </button>
          </div>
          <div className="schedule-list">
            {todaySchedule.length > 0 ? (
              todaySchedule.map((item, index) => (
                <div key={index} className="schedule-item">
                  <div className="time-dot" style={{ backgroundColor: item.color || '#3b82f6' }}></div>
                  <span className="schedule-time">{item.time}</span>
                  <span className="schedule-title">{item.className}</span>
                </div>
              ))
            ) : (
              <div className="empty-widget-message">
                <p>No classes scheduled for today 🎉</p>
                <button 
                  className="add-widget-btn"
                  onClick={() => navigate('/dashboard/schedules')}
                >
                  Add Schedule
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tasks */}
        <div className="widget-card">
          <div className="widget-header">
            <div className="widget-title-group">
              <IoCheckboxOutline className="widget-icon" style={{ color: '#10b981' }} />
              <h3>Tasks</h3>
            </div>
            <button 
              className="view-all-btn"
              onClick={() => navigate('/dashboard/tasks')}
            >
              View All <IoArrowForward />
            </button>
          </div>
          {tasks.length > 0 ? (
            <>
              <div className="tasks-progress">
                <span className="progress-text">{completedTasks} of {tasks.length} completed</span>
                <span className="progress-percentage">{progressPercentage}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progressPercentage}%` }}></div>
              </div>
              <div className="tasks-list">
                {tasks.slice(0, 5).map(task => (
                  <div key={task.id} className="task-item">
                    <input type="checkbox" checked={task.is_completed} readOnly />
                    <span className={task.is_completed ? 'completed' : ''}>{task.title}</span>
                  </div>
                ))}
                {tasks.length > 5 && (
                  <div className="more-items">+{tasks.length - 5} more tasks</div>
                )}
              </div>
            </>
          ) : (
            <div className="empty-widget-message">
              <p>No tasks yet! Stay organized 📝</p>
              <button 
                className="add-widget-btn"
                onClick={() => navigate('/dashboard/tasks')}
              >
                Add Task
              </button>
            </div>
          )}
        </div>

        {/* Upcoming Deadlines */}
        <div className="widget-card">
          <div className="widget-header">
            <div className="widget-title-group">
              <IoAlertCircleOutline className="widget-icon" style={{ color: '#ef4444' }} />
              <h3>Upcoming Deadlines</h3>
            </div>
            <button 
              className="view-all-btn"
              onClick={() => navigate('/dashboard/tasks')}
            >
              View All <IoArrowForward />
            </button>
          </div>
          <div className="deadlines-list">
            {upcomingDeadlines.length > 0 ? (
              upcomingDeadlines.map((deadline, index) => (
                <div key={index} className="deadline-item">
                  <div className="deadline-info">
                    <div className="deadline-title">{deadline.title}</div>
                    <div className={`deadline-due ${deadline.daysUntil <= 1 ? 'urgent' : ''}`}>
                      {formatDeadline(deadline.daysUntil)}
                    </div>
                  </div>
                  {deadline.daysUntil <= 1 && <span className="urgent-badge">Urgent</span>}
                </div>
              ))
            ) : (
              <div className="empty-widget-message">
                <p>No upcoming deadlines! 🎯</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Wellness Tip */}
      <div className="wellness-tip">
        <div className="wellness-icon">🌿</div>
        <div className="wellness-content">
          <strong>Wellness Tip</strong>
          <p>Remember to take a 5-minute break every 25 minutes. Stretch, hydrate, and give your eyes a rest!</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardWidgets;
