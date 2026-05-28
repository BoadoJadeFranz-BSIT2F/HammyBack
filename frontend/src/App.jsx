import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import TeacherDashboard from './components/TeacherDashboard';
import CompleteProfile from './components/CompleteProfile';
import ResetPassword from './components/ResetPassword';
import Profile from './components/Profile';
import ClassDetail from './components/ClassDetail';
import ArchiveDashboard from './components/ArchiveDashboard';
import AccessibilityPanel from './components/AccessibilityPanel';

// Student Module components
import DashboardHome from './components/modules/DashboardHome';
import Schedules from './components/modules/Schedules';
import StudentDeadlines from './components/modules/StudentDeadlines';
import Analytics from './components/modules/Analytics';
import Grades from './components/modules/Grades';
import Tasks from './components/modules/Tasks';
import Pomodoro from './components/modules/Pomodoro';
import Wellness from './components/modules/Wellness';

// Teacher Module components
import TeacherDashboardHome from './components/teacher-modules/TeacherDashboardHome';
import TeacherSchedule from './components/teacher-modules/TeacherSchedule';
import TeacherClassDetail from './components/teacher-modules/TeacherClassDetail';
import TeacherClassFiles from './components/teacher-modules/TeacherClassFiles';
import TeacherClassDeadlines from './components/teacher-modules/TeacherClassDeadlines';
import TeacherClassStudents from './components/teacher-modules/TeacherClassStudents';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#667eea'
      }}>
        Loading...
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

// Public Route Component (redirect to appropriate dashboard based on role)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#667eea'
      }}>
        Loading...
      </div>
    );
  }

  if (user) {
    return <Navigate to={user.role === 'teacher' ? '/teacher-dashboard' : '/dashboard'} />;
  }

  return children;
};

function AppRoutes() {
  const { user } = useAuth();
  
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } 
      />
      <Route 
        path="/signup" 
        element={
          <PublicRoute>
            <Signup />
          </PublicRoute>
        } 
      />
      <Route 
        path="/reset-password" 
        element={
          <PublicRoute>
            <ResetPassword />
          </PublicRoute>
        } 
      />
      <Route 
        path="/complete-profile" 
        element={
          <ProtectedRoute>
            <CompleteProfile />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            {user?.role === 'teacher' ? <Navigate to="/teacher-dashboard" /> : <Dashboard />}
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardHome />} />
        <Route path="class/:classId" element={<ClassDetail />} />
        <Route path="schedules" element={<Schedules />} />
        <Route path="deadlines" element={<StudentDeadlines />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="grades" element={<Grades />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="pomodoro" element={<Pomodoro />} />
        <Route path="wellness" element={<Wellness />} />
        <Route path="archive" element={<ArchiveDashboard />} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route 
        path="/teacher-dashboard" 
        element={
          <ProtectedRoute>
            {user?.role === 'student' ? <Navigate to="/dashboard" /> : <TeacherDashboard />}
          </ProtectedRoute>
        }
      >
        <Route index element={<TeacherDashboardHome />} />
        <Route path="profile" element={<Profile />} />
        <Route path="schedule" element={<TeacherSchedule />} />
        <Route path="archive" element={<ArchiveDashboard />} />
        
        {/* Class-specific nested routes */}
        <Route path="class/:classId" element={<TeacherClassDetail />}>
          <Route path="files" element={<TeacherClassFiles />} />
          <Route path="deadlines" element={<TeacherClassDeadlines />} />
          <Route path="students" element={<TeacherClassStudents />} />
        </Route>
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <ThemeProvider>
          <AuthProvider>
            <AppRoutes />
            <AccessibilityPanel />
          </AuthProvider>
        </ThemeProvider>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
