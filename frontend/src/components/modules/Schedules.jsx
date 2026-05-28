import React, { useState, useEffect } from 'react';
import { IoCalendarOutline, IoAdd, IoTrash, IoClose } from 'react-icons/io5';
import { scheduleAPI, taskAPI } from '../../services/api';
import './Schedules.css';

const Schedules = () => {
  const [schedules, setSchedules] = useState([]);
  const [offDays, setOffDays] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showOffDayModal, setShowOffDayModal] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    day: '',
    time: '',
    className: '',
    color: '#ccefe1'
  });
  const [newOffDay, setNewOffDay] = useState({
    day: '',
    reason: '',
    color: '#ffebee'
  });

  const colors = ['#ccefe1', '#d4e6e0', '#dff1e6', '#d1e0dc', '#e8f6e5'];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // All available time options for dropdown
  const allTimeOptions = [
    '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM',
    '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
    '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
    '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM'
  ];

  // Get unique times from schedules and sort them
  const getScheduleTimes = () => {
    const uniqueTimes = [...new Set(schedules.map(s => s.time))];
    return uniqueTimes.sort((a, b) => {
      const timeA = convertTo24Hour(a);
      const timeB = convertTo24Hour(b);
      return timeA - timeB;
    });
  };

  const convertTo24Hour = (time) => {
    const [timeStr, period] = time.split(' ');
    let [hours, minutes] = timeStr.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const times = getScheduleTimes();

  useEffect(() => {
    fetchSchedules();
    loadOffDays();
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await taskAPI.getMyTasks();
      const personalTasks = response.data.personalTasks || [];
      setTasks(personalTasks.filter((t) => t.due_date && !t.is_completed));
    } catch (error) {
      console.error('Error loading tasks for schedules:', error);
      setTasks([]);
    }
  };

  const loadOffDays = async () => {
    try {
      const response = await scheduleAPI.getOffDays();
      setOffDays(response.data || []);
    } catch (error) {
      console.error('Error loading off days:', error);
      setOffDays([]);
    }
  };

  const fetchSchedules = async () => {
    try {
      const response = await scheduleAPI.getAll();
      
      // Map the response to include isClassSchedule field
      const mappedSchedules = response.data.map(schedule => ({
        ...schedule,
        isClassSchedule: schedule.isClassSchedule || schedule.is_class_schedule || false,
        room: schedule.room || null,
        subject: schedule.subject || null,
        section: schedule.section || null
      }));
      
      console.log('Fetched schedules:', mappedSchedules);
      setSchedules(mappedSchedules);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      setLoading(false);
    }
  };

  const handleAddSchedule = async () => {
    if (!newSchedule.day || !newSchedule.time || !newSchedule.className) {
      alert('Please fill in all fields');
      return;
    }

    try {
      await scheduleAPI.create(newSchedule);
      
      setShowModal(false);
      setNewSchedule({ day: '', time: '', className: '', color: '#ccefe1' });
      fetchSchedules();
    } catch (error) {
      console.error('Error adding schedule:', error);
      alert(error.response?.data?.message || 'Error adding schedule');
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm('Are you sure you want to delete this class?')) return;

    try {
      await scheduleAPI.remove(id);
      fetchSchedules();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Error deleting schedule');
    }
  };

  const handleAddOffDay = async () => {
    if (!newOffDay.day || !newOffDay.reason) {
      alert('Please fill in all fields');
      return;
    }

    try {
      await scheduleAPI.createOffDay(newOffDay);
      await loadOffDays();
      setShowOffDayModal(false);
      setNewOffDay({ day: '', reason: '', color: '#ffebee' });
    } catch (error) {
      console.error('Error creating off day:', error);
      alert(error.response?.data?.message || 'Error creating off day');
    }
  };

  const handleDeleteOffDay = async (id) => {
    if (!window.confirm('Are you sure you want to remove this off day?')) return;
    try {
      await scheduleAPI.removeOffDay(id);
      await loadOffDays();
    } catch (error) {
      console.error('Error deleting off day:', error);
      alert(error.response?.data?.message || 'Error deleting off day');
    }
  };

  const getOffDayForDay = (day) => {
    return offDays.find(od => od.day === day);
  };

  const getTasksForDay = (day) => {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const dayIndex = daysOfWeek.indexOf(day);
    const todayIndex = today.getDay();
    
    // Calculate the date for this day
    const daysToAdd = dayIndex - todayIndex;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysToAdd);
    const targetDateStr = targetDate.toISOString().split('T')[0];
    
    return tasks.filter(task => {
      const taskDate = String(task.due_date).split('T')[0];
      return taskDate === targetDateStr;
    });
  };

  const getScheduleForSlot = (day, time) => {
    return schedules.find(s => s.day === day && s.time === time);
  };

  if (loading) {
    return <div className="schedules-container">Loading...</div>;
  }

  return (
    <div className="schedules-container">
      <div className="schedules-header">
        <div>
          <h1>Weekly Schedule</h1>
          <p className="schedules-subtitle">Your classes and activities at a glance</p>
        </div>
        <div className="header-buttons">
          <button className="add-schedule-btn" onClick={() => setShowModal(true)}>
            <IoAdd /> Add Class
          </button>
          <button className="mark-off-day-btn" onClick={() => setShowOffDayModal(true)}>
            <IoCalendarOutline /> Mark Off Day
          </button>
        </div>
      </div>

      <div className="schedule-card">
        <div className="schedule-week-indicator">
          <IoCalendarOutline className="calendar-icon" />
          <span>This Week</span>
        </div>

        <div className="schedule-legend">
          <div className="legend-item">
            <div className="legend-box class-schedule-box">📚</div>
            <span>Class Schedule (18 weeks)</span>
          </div>
          <div className="legend-item">
            <div className="legend-box personal-schedule-box"></div>
            <span>Personal Schedule</span>
          </div>
          <div className="legend-item">
            <div className="legend-box off-day-box"></div>
            <span>Off Day</span>
          </div>
          <div className="legend-item">
            <span className="task-deadline-badge-example">📌</span>
            <span>Task Deadline</span>
          </div>
        </div>

        <div className="schedule-table">
          <div className="schedule-header-row">
            <div className="time-header">Time</div>
            {days.map(day => {
              const dayTasks = getTasksForDay(day);
              const offDay = getOffDayForDay(day);
              return (
                <div key={day} className="day-header">
                  <div className="day-name">{day}</div>
                  {dayTasks.length > 0 && (
                    <div className="day-tasks">
                      {dayTasks.map((task, idx) => (
                        <span key={idx} className="task-deadline-badge" title={task.title}>
                          📌 {task.title.substring(0, 15)}{task.title.length > 15 ? '...' : ''}
                        </span>
                      ))}
                    </div>
                  )}
                  {offDay && (
                    <div className="off-day-indicator" title={offDay.reason}>
                      🚫 OFF
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {times.length === 0 ? (
            <div className="empty-schedule">
              <p>No classes scheduled yet. Click "Add Class" to get started!</p>
            </div>
          ) : (
            times.map((time) => (
              <div key={time} className="schedule-row">
                <div className="time-cell">{time}</div>
                {days.map(day => {
                  const schedule = getScheduleForSlot(day, time);
                  const offDay = getOffDayForDay(day);
                  return (
                    <div key={day} className="schedule-cell">
                      {offDay ? (
                        <div 
                          className="off-day-overlay" 
                          style={{ backgroundColor: offDay.color }}
                          title={offDay.reason}
                        >
                          <span className="off-day-reason">{offDay.reason}</span>
                        </div>
                      ) : schedule ? (
                        <div 
                          className={`class-block ${schedule.isClassSchedule ? 'class-schedule' : 'personal-schedule'}`} 
                          style={{ backgroundColor: schedule.color }}
                          title={schedule.isClassSchedule ? `From class - Cannot delete here` : 'Personal schedule'}
                        >
                          <div className="class-block-content">
                            <div className="class-header">
                              <span className="class-name">{schedule.className}</span>
                              {schedule.isClassSchedule && (
                                <span className="class-badge" title="Class Schedule">📚</span>
                              )}
                            </div>
                            {schedule.room && (
                              <div className="class-details">
                                <span className="class-room">📍 {schedule.room}</span>
                              </div>
                            )}
                            {schedule.section && (
                              <div className="class-section">{schedule.section}</div>
                            )}
                          </div>
                          {!schedule.isClassSchedule && (
                            <button 
                              className="delete-class-btn"
                              onClick={() => handleDeleteSchedule(schedule.id)}
                              title="Delete personal schedule"
                            >
                              <IoTrash />
                            </button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Schedule Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="schedule-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Class</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <IoClose />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Class Name</label>
                <input
                  type="text"
                  value={newSchedule.className}
                  onChange={(e) => setNewSchedule({...newSchedule, className: e.target.value})}
                  placeholder="e.g., Calculus"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Day</label>
                  <select
                    value={newSchedule.day}
                    onChange={(e) => setNewSchedule({...newSchedule, day: e.target.value})}
                  >
                    <option value="">Select day</option>
                    {days.map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Time</label>
                  <select
                    value={newSchedule.time}
                    onChange={(e) => setNewSchedule({...newSchedule, time: e.target.value})}
                  >
                    <option value="">Select time</option>
                    {allTimeOptions.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Color</label>
                <div className="color-picker">
                  {colors.map(color => (
                    <div
                      key={color}
                      className={`color-option ${newSchedule.color === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewSchedule({...newSchedule, color})}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="submit-btn" onClick={handleAddSchedule}>
                Add Class
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Off Day Modal */}
      {showOffDayModal && (
        <div className="modal-overlay" onClick={() => setShowOffDayModal(false)}>
          <div className="schedule-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Mark Off Day</h2>
              <button className="close-btn" onClick={() => setShowOffDayModal(false)}>
                <IoClose />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Day</label>
                <select
                  value={newOffDay.day}
                  onChange={(e) => setNewOffDay({...newOffDay, day: e.target.value})}
                >
                  <option value="">Select day</option>
                  {days.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Reason</label>
                <input
                  type="text"
                  value={newOffDay.reason}
                  onChange={(e) => setNewOffDay({...newOffDay, reason: e.target.value})}
                  placeholder="e.g., Holiday, No Classes, Break"
                />
              </div>

              <div className="form-group">
                <label>Color</label>
                <div className="color-picker">
                  {['#ffebee', '#ffcdd2', '#ef9a9a', '#fce4ec', '#f8bbd0'].map(color => (
                    <div
                      key={color}
                      className={`color-option ${newOffDay.color === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewOffDay({...newOffDay, color})}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowOffDayModal(false)}>
                Cancel
              </button>
              <button className="submit-btn" onClick={handleAddOffDay}>
                Mark Off Day
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Off Days List */}
      {offDays.length > 0 && (
        <div className="off-days-list">
          <h3>Off Days</h3>
          <div className="off-days-grid">
            {offDays.map(offDay => (
              <div key={offDay.id} className="off-day-item" style={{ backgroundColor: offDay.color }}>
                <div className="off-day-info">
                  <strong>{offDay.day}</strong>
                  <span>{offDay.reason}</span>
                </div>
                <button 
                  className="delete-off-day-btn"
                  onClick={() => handleDeleteOffDay(offDay.id)}
                  title="Remove off day"
                >
                  <IoTrash />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedules;