
import React from 'react';
import { useNavigate } from 'react-router-dom';
import AuthForm from '../components/AuthForm';

const Signup: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 py-12">
      <AuthForm 
        type="SIGNUP"
        onSuccess={() => navigate('/')}
        onSwitchMode={() => navigate('/login')}
        switchModeText="Already have an account?"
        switchModeLinkText="Log In"
      />
    </div>
  );
};

export default Signup;
