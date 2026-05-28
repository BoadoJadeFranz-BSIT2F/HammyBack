import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import ForgotPassword from './ForgotPassword';
import { PiBooksThin, PiStudentFill } from 'react-icons/pi';
import { SlChemistry } from 'react-icons/sl';
import { IoPawSharp, IoEyeOutline, IoEyeOffOutline } from 'react-icons/io5';
import { GiBookmarklet, GiTeacher } from 'react-icons/gi';
import './Auth.css';

const Signup = () => {
  const [activeTab, setActiveTab] = useState('login');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [majorError, setMajorError] = useState('');
  const [academicYearError, setAcademicYearError] = useState('');
  const [targetGPAError, setTargetGPAError] = useState('');
  const [loginEmailError, setLoginEmailError] = useState('');
  const [loginPasswordError, setLoginPasswordError] = useState('');
  const [role, setRole] = useState('student');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    major: '',
    academicYear: '',
    targetGPA: '',
    department: '',
    subjects: ''
  });
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signup, login, googleLogin } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);

    try {
      const result = await googleLogin(credentialResponse);
      
      // Check if profile needs to be completed
      if (!result.user.profileCompleted) {
        navigate('/complete-profile');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-in failed. Please try again.');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Validate and filter first name and last name
    if (name === 'firstName' || name === 'lastName') {
      // Only allow letters and spaces
      const filteredValue = value.replace(/[^a-zA-Z\s]/g, '');
      setFormData({
        ...formData,
        [name]: filteredValue
      });
      
      // Validate name
      if (name === 'firstName') {
        validateName(filteredValue, setFirstNameError, 'First name');
      } else {
        validateName(filteredValue, setLastNameError, 'Last name');
      }
    } else if (name === 'email') {
      setFormData({
        ...formData,
        [name]: value
      });
      validateEmail(value);
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }

    // Validate password
    if (name === 'password') {
      validatePassword(value);
    }
  };

  const validateName = (name, setError, fieldName) => {
    const hasNumber = /\d/.test(name);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(name);
    const isLettersOnly = /^[a-zA-Z\s]*$/.test(name);

    if (!name) {
      setError('');
    } else if (!isLettersOnly || hasNumber || hasSpecialChar) {
      setError(`${fieldName} can only contain letters`);
    } else {
      setError('');
    }
  };

  const validatePassword = (password) => {
    const hasNumber = /\d/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);
    const isLengthValid = password.length >= 8;

    if (!password) {
      setPasswordError('');
    } else if (!isLengthValid) {
      setPasswordError('Password must be at least 8 characters long');
    } else if (!hasUppercase) {
      setPasswordError('Add at least 1 uppercase letter');
    } else if (!hasNumber) {
      setPasswordError('Add at least 1 number');
    } else if (!hasSymbol) {
      setPasswordError('Add at least 1 symbol, such as ! @ # or $');
    } else {
      setPasswordError('');
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('');
    } else if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const getPasswordStrength = (password) => {
    const checks = [
      password.length >= 8,
      /[A-Z]/.test(password),
      /\d/.test(password),
      /[^A-Za-z0-9]/.test(password)
    ];

    const score = checks.filter(Boolean).length;

    if (score <= 1) {
      return { score, label: 'Weak', color: '#dc3545' };
    }

    if (score === 2) {
      return { score, label: 'Fair', color: '#fd7e14' };
    }

    if (score === 3) {
      return { score, label: 'Good', color: '#ffc107' };
    }

    return { score, label: 'Strong', color: '#28a745' };
  };

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginData({
      ...loginData,
      [name]: value
    });

    // Validate login fields
    if (name === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!value) {
        setLoginEmailError('');
      } else if (!emailRegex.test(value)) {
        setLoginEmailError('Please enter a valid email address');
      } else {
        setLoginEmailError('');
      }
    }

    if (name === 'password') {
      if (!value) {
        setLoginPasswordError('');
      } else {
        setLoginPasswordError('');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Reset all errors
    setFirstNameError('');
    setLastNameError('');
    setEmailError('');
    setPasswordError('');
    setMajorError('');
    setAcademicYearError('');
    setTargetGPAError('');

    let hasErrors = false;

    // Validate first name
    if (!formData.firstName.trim()) {
      setFirstNameError('First name is required');
      hasErrors = true;
    } else {
      const nameRegex = /^[a-zA-Z\s]*$/;
      if (!nameRegex.test(formData.firstName) || /\d/.test(formData.firstName)) {
        setFirstNameError('First name can only contain letters');
        hasErrors = true;
      }
    }

    // Validate last name
    if (!formData.lastName.trim()) {
      setLastNameError('Last name is required');
      hasErrors = true;
    } else {
      const nameRegex = /^[a-zA-Z\s]*$/;
      if (!nameRegex.test(formData.lastName) || /\d/.test(formData.lastName)) {
        setLastNameError('Last name can only contain letters');
        hasErrors = true;
      }
    }

    // Validate email
    if (!formData.email.trim()) {
      setEmailError('Email is required');
      hasErrors = true;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setEmailError('Please enter a valid email address');
        hasErrors = true;
      }
    }

    // Validate password
    if (!formData.password) {
      setPasswordError('Password is required');
      hasErrors = true;
    } else {
      const hasNumber = /\d/.test(formData.password);
      const hasUppercase = /[A-Z]/.test(formData.password);
      const hasSymbol = /[^A-Za-z0-9]/.test(formData.password);
      const isLengthValid = formData.password.length >= 8;

      if (!isLengthValid || !hasNumber || !hasUppercase || !hasSymbol) {
        setPasswordError('Password must be at least 8 characters with 1 uppercase letter, 1 number, and 1 symbol');
        hasErrors = true;
      }
    }

    // Validate major
    if (!formData.major.trim()) {
      setMajorError('Major is required');
      hasErrors = true;
    }

    // Validate teacher email domain
    if (role === 'teacher' && formData.email && !formData.email.endsWith('@cvsu.edu.ph')) {
      setEmailError('Teachers must use a @cvsu.edu.ph email address');
      hasErrors = true;
    }

    // Validate student-specific fields
    if (role === 'student') {
      if (!formData.academicYear) {
        setAcademicYearError('Academic year is required');
        hasErrors = true;
      }

      if (!formData.targetGPA) {
        setTargetGPAError('Target GPA is required');
        hasErrors = true;
      }
    }

    if (hasErrors) {
      setError('Please fill in all required fields correctly');
      return;
    }

    setLoading(true);

    try {
      // Combine firstName and lastName into name for backend
      const { firstName, lastName, ...rest } = formData;
      const signupData = { 
        ...rest, 
        name: `${firstName} ${lastName}`.trim(),
        role 
      };
      await signup(signupData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Reset login errors
    setLoginEmailError('');
    setLoginPasswordError('');

    let hasErrors = false;

    // Validate email
    if (!loginData.email.trim()) {
      setLoginEmailError('Email is required');
      hasErrors = true;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(loginData.email)) {
        setLoginEmailError('Please enter a valid email address');
        hasErrors = true;
      }
    }

    // Validate password
    if (!loginData.password) {
      setLoginPasswordError('Password is required');
      hasErrors = true;
    }

    if (hasErrors) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      await login(loginData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show forgot password view
  if (showForgotPassword) {
    return <ForgotPassword onBackToLogin={() => setShowForgotPassword(false)} />;
  }

  return (
    <div className="auth-container">
      <div className="background-decorations">
        <PiBooksThin className="deco-icon book-icon-1" />
        <SlChemistry className="deco-icon flask-icon-1" />
        <PiBooksThin className="deco-icon book-icon-2" />
        <SlChemistry className="deco-icon flask-icon-2" />
        <PiBooksThin className="deco-icon book-icon-3" />
        <SlChemistry className="deco-icon flask-icon-3" />
        <PiBooksThin className="deco-icon book-icon-4" />
        <SlChemistry className="deco-icon flask-icon-4" />
        <PiBooksThin className="deco-icon book-icon-5" />
        <SlChemistry className="deco-icon flask-icon-5" />
        <PiBooksThin className="deco-icon book-icon-6" />
        <SlChemistry className="deco-icon flask-icon-6" />
        <GiBookmarklet className="deco-icon bookmark-icon-1" />
        <GiBookmarklet className="deco-icon bookmark-icon-2" />
        <GiBookmarklet className="deco-icon bookmark-icon-3" />
        <GiBookmarklet className="deco-icon bookmark-icon-4" />
      </div>

      <div className="brand-center">
        <img src="/images/header-banner.png" alt="HamLearning" className="brand-logo-center" />
        <p className="brand-tagline-center">Your Academic Success Companion</p>
      </div>

      <div className="auth-form-wrapper">
        <div className="hamster-corner">
          <img src="/images/hamster-top-form.png" alt="Hamster" className="hamster-image" />
        </div>
        
        <div className="auth-form-card">
          <div className="welcome-section">
            <h2>Welcome</h2>
            <p>Login or create an account to get started</p>
          </div>

          <div className="tab-container">
            <button 
              className={`tab ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => setActiveTab('login')}
            >
              Login
            </button>
          <button 
            className={`tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            Register
          </button>
        </div>

        {activeTab === 'register' ? (
          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="error-message">{error}</div>}
            
            <div className="role-section">
              <label className="section-label">I am a...</label>
              <div className="role-selector">
                <div 
                  className={`role-option ${role === 'student' ? 'selected' : ''}`}
                  onClick={() => setRole('student')}
                >
                  <PiStudentFill className="role-icon" />
                  <span>Student</span>
                </div>
                <div 
                  className={`role-option ${role === 'teacher' ? 'selected' : ''}`}
                  onClick={() => setRole('teacher')}
                >
                  <GiTeacher className="role-icon" />
                  <span>Teacher</span>
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="John"
                  required
                  className={firstNameError ? 'error' : ''}
                />
                {firstNameError && <span className="field-error">{firstNameError}</span>}
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Doe"
                  required
                  className={lastNameError ? 'error' : ''}
                />
                {lastNameError && <span className="field-error">{lastNameError}</span>}
              </div>
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="example@gmail.com"
                required
                className={emailError ? 'error' : ''}
              />
              {emailError && <span className="field-error">{emailError}</span>}
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showRegisterPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••"
                  required
                  className={passwordError ? 'error' : ''}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowRegisterPassword((prev) => !prev)}
                  aria-label={showRegisterPassword ? 'Hide password' : 'Show password'}
                  title={showRegisterPassword ? 'Hide password' : 'Show password'}
                >
                  {showRegisterPassword ? <IoEyeOffOutline /> : <IoEyeOutline />}
                </button>
              </div>
              {formData.password && (
                <div className="password-strength-container" aria-live="polite">
                  <div className="password-strength-track" aria-hidden="true">
                    <div
                      className="password-strength-fill"
                      style={{
                        width: `${Math.max(12, (getPasswordStrength(formData.password).score / 4) * 100)}%`,
                        background: getPasswordStrength(formData.password).color
                      }}
                    />
                  </div>
                  <div className="password-strength-meta">
                    <span>Password strength</span>
                    <strong style={{ color: getPasswordStrength(formData.password).color }}>
                      {getPasswordStrength(formData.password).label}
                    </strong>
                  </div>
                  <p className="password-guidance">
                    Use at least 8 characters with 1 uppercase letter, 1 number, and 1 symbol.
                  </p>
                </div>
              )}
              {passwordError && <span className="field-error">{passwordError}</span>}
              {!passwordError && formData.password && (
                <span className="field-success">✓ Password is valid</span>
              )}
            </div>

            <div className="form-group">
              <label>Major</label>
              <input
                type="text"
                name="major"
                value={formData.major}
                onChange={handleChange}
                placeholder="e.g., Computer Science"
                className={majorError ? 'error' : ''}
              />
              {majorError && <span className="field-error">{majorError}</span>}
            </div>

            {role === 'student' && (
              <>
                <div className="form-group">
                  <label>Academic Year</label>
                  <select
                    name="academicYear"
                    value={formData.academicYear}
                    onChange={handleChange}
                    required
                    className={academicYearError ? 'error' : ''}
                  >
                    <option value="">Select year</option>
                    <option value="1st year">1st year</option>
                    <option value="2nd year">2nd year</option>
                    <option value="3rd year">3rd year</option>
                    <option value="4th year">4th year</option>
                  </select>
                  {academicYearError && <span className="field-error">{academicYearError}</span>}
                </div>

                <div className="form-group">
                  <label>Target GPA</label>
                  <select
                    name="targetGPA"
                    value={formData.targetGPA}
                    onChange={handleChange}
                    required
                    className={targetGPAError ? 'error' : ''}
                  >
                    <option value="">Select target GPA</option>
                    <option value="1.00">1.00 (Highest)</option>
                    <option value="1.25">1.25</option>
                    <option value="1.50">1.50</option>
                    <option value="1.75">1.75</option>
                    <option value="2.00">2.00</option>
                    <option value="2.25">2.25</option>
                    <option value="2.50">2.50</option>
                    <option value="2.75">2.75</option>
                    <option value="3.00">3.00</option>
                  </select>
                  {targetGPAError && <span className="field-error">{targetGPAError}</span>}
                </div>
              </>
            )}

            {role === 'teacher' && (
              <>
                <div className="form-group">
                  <label>Department</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    placeholder=""
                  />
                </div>

                <div className="form-group">
                  <label>Subjects</label>
                  <input
                    type="text"
                    name="subjects"
                    value={formData.subjects}
                    onChange={handleChange}
                    placeholder=""
                  />
                </div>
              </>
            )}

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Creating...' : `Create ${role === 'student' ? 'Student' : 'Teachers'} Account`}
              <IoPawSharp style={{ marginLeft: '8px' }} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleLoginSubmit} className="auth-form">
            {error && <div className="error-message">{error}</div>}
            
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={loginData.email}
                onChange={handleLoginChange}
                placeholder="your.email@university.edu"
                required
                className={loginEmailError ? 'error' : ''}
              />
              {loginEmailError && <span className="field-error">{loginEmailError}</span>}
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  name="password"
                  value={loginData.password}
                  onChange={handleLoginChange}
                  placeholder="••••••"
                  required
                  className={loginPasswordError ? 'error' : ''}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowLoginPassword((prev) => !prev)}
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  title={showLoginPassword ? 'Hide password' : 'Show password'}
                >
                  {showLoginPassword ? <IoEyeOffOutline /> : <IoEyeOutline />}
                </button>
              </div>
              {loginPasswordError && <span className="field-error">{loginPasswordError}</span>}
            </div>

            <div className="forgot-password">
              <a href="#" onClick={(e) => { e.preventDefault(); setShowForgotPassword(true); }}>
                Forgot password?
              </a>
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
              <IoPawSharp style={{ marginLeft: '8px' }} />
            </button>

            <div className="divider">
              <span>or</span>
            </div>

            <div className="google-login-wrapper">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap
                theme="outline"
                size="large"
                text="continue_with"
                shape="rectangular"
              />
            </div>
          </form>
        )}
        </div>
      </div>
    </div>
  );
};

export default Signup;
