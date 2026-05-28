import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const authAPI = {
  signup: (userData) => api.post('/auth/signup', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  verify: () => api.get('/auth/verify'),
  googleLogin: (token) => api.post('/auth/google', { token }),
  completeProfile: (profileData) => api.post('/auth/complete-profile', profileData)
};

export const classAPI = {
  joinClass: (classCode) => api.post('/classes/join', { classCode }),
  getEnrolledClasses: () => api.get('/classes/enrolled'),
  createClass: (classData) => api.post('/classes/create', classData),
  getMyClasses: () => api.get('/classes/my-classes'),
  leaveClass: (classId) => api.delete(`/classes/${classId}/leave`),
  getClassStudents: (classId) => api.get(`/classes/${classId}/students`)
};

export const deadlineAPI = {
  // NEW: Google Classroom-style deadlines
  createWithFiles: (formData) => {
    return axios.post(`${API_URL}/deadlines/create`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
  },
  getClassDeadlines: (classId) => api.get(`/deadlines/class/${classId}`),
  getDeadline: (deadlineId) => api.get(`/deadlines/${deadlineId}`),
  getSubmissions: (deadlineId) => api.get(`/deadlines/${deadlineId}/submissions`),
  deleteAttachment: (fileId) => api.delete(`/deadlines/file/${fileId}`),
  getDeadlineComments: (deadlineId) => api.get(`/deadlines/${deadlineId}/comments`),
  addDeadlineComment: (deadlineId, comment) => api.post(`/deadlines/${deadlineId}/comments`, { comment }),
  deleteDeadlineComment: (commentId) => api.delete(`/deadlines/comments/${commentId}`),
  updateDeadline: (deadlineId, deadlineData) => api.put(`/deadlines/${deadlineId}`, deadlineData),
  deleteDeadline: (deadlineId) => api.delete(`/deadlines/${deadlineId}`),
  
  // Legacy methods (keep for backwards compatibility)
  getMyDeadlines: () => api.get('/deadlines/my-deadlines'),
  getTeacherDeadlines: () => api.get('/deadlines/teacher-deadlines'),
  createDeadline: (deadlineData) => api.post('/deadlines', deadlineData),
  markComplete: (id, isCompleted) => api.patch(`/deadlines/${id}/complete`, { isCompleted })
};

export const submissionAPI = {
  // Student methods
  getSubmission: (deadlineId) => api.get(`/submissions/deadline/${deadlineId}`),
  getAllSubmissions: () => api.get('/submissions/student/all'),
  submit: (formData) => {
    return axios.post(`${API_URL}/submissions/submit`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
  },
  unsubmit: (submissionId) => api.post(`/submissions/unsubmit/${submissionId}`),
  deleteFile: (fileId) => api.delete(`/submissions/file/${fileId}`),
  
  // Teacher methods
  gradeSubmission: (submissionId, gradeData) => api.put(`/submissions/${submissionId}/grade`, gradeData)
};

export const gradeAPI = {
  getMyGrades: () => api.get('/grades/my-grades'),
  getClassGrades: (classId) => api.get(`/grades/class/${classId}`),
  createGrade: (gradeData) => api.post('/grades', gradeData),
  updateGrade: (id, gradeData) => api.put(`/grades/${id}`, gradeData),
  deleteGrade: (id) => api.delete(`/grades/${id}`),
  getAnalytics: () => api.get('/grades/analytics')
};

export const taskAPI = {
  // Personal tasks
  getPersonalTasks: () => api.get('/tasks/personal'),
  createPersonalTask: (taskData) => api.post('/tasks/personal', taskData),
  updatePersonalTask: (id, taskData) => api.put(`/tasks/personal/${id}`, taskData),
  deletePersonalTask: (id) => api.delete(`/tasks/personal/${id}`),
  uploadPersonalAttachment: (formData) => {
    return axios.post(`${API_URL}/tasks/personal/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
  },
  
  // Teacher tasks
  getClassTasks: (classId) => api.get(`/tasks/class/${classId}/teacher`),
  createTeacherTask: (taskData) => api.post('/tasks/teacher', taskData),
  updateTeacherTask: (id, taskData) => api.put(`/tasks/teacher/${id}`, taskData),
  deleteTeacherTask: (id) => api.delete(`/tasks/teacher/${id}`),
  
  // Student view
  getMyTasks: () => api.get('/tasks/my-tasks'),
  submitTask: (taskId, submissionData) => api.post(`/tasks/submit/${taskId}`, submissionData),
  
  // Submissions
  getTaskSubmissions: (taskId) => api.get(`/tasks/${taskId}/submissions`),
  gradeSubmission: (submissionId, gradeData) => api.patch(`/tasks/submission/${submissionId}/grade`, gradeData)
};

export const scheduleAPI = {
  getAll: () => api.get('/schedules'),
  create: (payload) => api.post('/schedules', payload),
  remove: (id) => api.delete(`/schedules/${id}`),
  getOffDays: () => api.get('/schedules/off-days/all'),
  createOffDay: (payload) => api.post('/schedules/off-days', payload),
  removeOffDay: (id) => api.delete(`/schedules/off-days/${id}`)
};

export const wellnessAPI = {
  getEntries: () => api.get('/wellness/entries'),
  createEntry: (payload) => api.post('/wellness/entries', payload),
  deleteEntry: (id) => api.delete(`/wellness/entries/${id}`)
};

export const fileAPI = {
  // Teacher routes
  uploadFile: (formData) => {
    return axios.post(`${API_URL}/files/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
  },
  getMyUploads: () => api.get('/files/my-uploads'),
  getClassFiles: (classId) => api.get(`/files/class/${classId}`),
  deleteFile: (fileId) => api.delete(`/files/${fileId}`),
  
  // Student routes
  getMyFiles: () => api.get('/files/my-files'),
  trackAccess: (fileId) => api.post(`/files/track-access/${fileId}`),
  
  // Comments
  getFileComments: (fileId) => api.get(`/files/${fileId}/comments`),
  addComment: (fileId, comment) => api.post(`/files/${fileId}/comments`, { comment }),
  deleteComment: (commentId) => api.delete(`/files/comments/${commentId}`)
};

export const archiveAPI = {
  getMine: () => api.get('/archive'),
  archiveItem: (item) => api.post('/archive', item),
  unarchiveItem: (archiveKey) => api.delete(`/archive/${encodeURIComponent(archiveKey)}`)
};

export default api;
