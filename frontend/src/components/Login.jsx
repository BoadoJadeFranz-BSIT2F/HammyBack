import React from 'react';
import { useNavigate } from 'react-router-dom';
import Signup from './Signup';

const Login = () => {
  const navigate = useNavigate();
  
  // Just redirect to signup page which now has both login and register tabs
  React.useEffect(() => {
    navigate('/signup');
  }, [navigate]);

  return null;
};

export default Login;
