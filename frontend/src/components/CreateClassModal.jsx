import React, { useState } from 'react';
import axios from 'axios';
import './CreateClassModal.css';

const CreateClassModal = ({ onClose, onClassCreated }) => {
  const [formData, setFormData] = useState({
    className: '',
    section: '',
    subject: '',
    room: ''
  });
  const [schedules, setSchedules] = useState([]);
  const [newSchedule, setNewSchedule] = useState({ day: '', time: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdClass, setCreatedClass] = useState(null);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const timeOptions = [
    '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM',
    '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
    '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
    '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM',
    '7:00 PM', '7:30 PM', '8:00 PM'
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAddSchedule = () => {
    if (!newSchedule.day || !newSchedule.time) {
      alert('Please select both day and time');
      return;
    }

    // Check for duplicates
    const duplicate = schedules.find(
      s => s.day === newSchedule.day && s.time === newSchedule.time
    );

    if (duplicate) {
      alert('This schedule time already exists');
      return;
    }

    setSchedules([...schedules, { ...newSchedule }]);
    setNewSchedule({ day: '', time: '' });
  };

  const handleRemoveSchedule = (index) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const handleCopyCode = () => {
    if (createdClass) {
      navigator.clipboard.writeText(createdClass.classCode).then(() => {
        alert(`Class code "${createdClass.classCode}" copied to clipboard!`);
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.className.trim() || !formData.section.trim()) {
      setError('Class name and section are required');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      console.log('Creating class with schedules:', schedules);
      const response = await axios.post(
        'http://localhost:5000/api/classes/create',
        {
          ...formData,
          schedules: schedules.length > 0 ? schedules : []
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      console.log('Class created successfully:', response.data);
      console.log(`Students who join with code "${response.data.class.classCode}" will get ${schedules.length} schedule(s) automatically`);
      setCreatedClass(response.data.class);
      onClassCreated(response.data.class);
      // Don't close immediately - show the success message with code
    } catch (err) {
      console.error('Error creating class:', err);
      setError(err.response?.data?.message || 'Failed to create class');
    } finally {
      setLoading(false);
    }
  };

  if (createdClass) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content success-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>✅ Class Created Successfully!</h2>
            <button className="modal-close" onClick={onClose}>&times;</button>
          </div>

          <div className="success-content">
            <div className="created-class-info">
              <h3>{createdClass.className}</h3>
              <p className="section-info">Section: {createdClass.section}</p>
            </div>

            <div className="class-code-display">
              <p className="code-label">Share this code with your students:</p>
              <div className="code-wrapper">
                <span className="large-class-code">{createdClass.classCode}</span>
                <button className="btn-copy-large" onClick={handleCopyCode}>
                  📋 Copy Code
                </button>
              </div>
              <p className="code-hint">Students can use this code to join your class</p>
            </div>

            <button className="btn-done" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Class</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="create-class-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>
              Class name<span className="required">*</span>
            </label>
            <input
              type="text"
              name="className"
              value={formData.className}
              onChange={handleChange}
              placeholder="Class name"
              required
            />
            <span className="field-required">*Required</span>
          </div>

          <div className="form-group">
            <label>
              Section<span className="required">*</span>
            </label>
            <input
              type="text"
              name="section"
              value={formData.section}
              onChange={handleChange}
              placeholder="Section"
              required
            />
            <span className="field-required">*Required</span>
          </div>

          <div className="form-group">
            <label>Subject</label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="Subject"
            />
          </div>

          <div className="form-group">
            <label>Room</label>
            <input
              type="text"
              name="room"
              value={formData.room}
              onChange={handleChange}
              placeholder="Room"
            />
          </div>

          <div className="form-group schedule-section">
            <label>
              Class Schedule (18 weeks semester) <span className="optional-label">(Optional)</span>
            </label>
            <p className="schedule-hint">Add the days and times when this class meets</p>
            
            <div className="schedule-input-row">
              <select
                value={newSchedule.day}
                onChange={(e) => setNewSchedule({ ...newSchedule, day: e.target.value })}
                className="schedule-select"
              >
                <option value="">Select Day</option>
                {days.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>

              <select
                value={newSchedule.time}
                onChange={(e) => setNewSchedule({ ...newSchedule, time: e.target.value })}
                className="schedule-select"
              >
                <option value="">Select Time</option>
                {timeOptions.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleAddSchedule}
                className="btn-add-schedule"
              >
                + Add
              </button>
            </div>

            {schedules.length > 0 && (
              <div className="schedules-list">
                {schedules.map((schedule, index) => (
                  <div key={index} className="schedule-chip">
                    <span>{schedule.day} at {schedule.time}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSchedule(index)}
                      className="btn-remove-schedule"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {schedules.length === 0 && (
              <p className="schedule-empty">No schedules added yet</p>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-cancel">
              Cancel
            </button>
            <button type="submit" className="btn-create" disabled={loading}>
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateClassModal;
