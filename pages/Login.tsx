
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthForm from '../components/AuthForm';

const Login: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 py-12">
      <AuthForm 
        type="LOGIN"
        onSuccess={() => navigate('/')}
        onSwitchMode={() => navigate('/signup')}
        switchModeText="Don't have a hustle yet?"
        switchModeLinkText="Create Account"
      />
      <div className="mt-8">
        <Link to="/" className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider">
          Skip for now, just browsing
        </Link>
      </div>
    </div>
  );
};

export default Login;
