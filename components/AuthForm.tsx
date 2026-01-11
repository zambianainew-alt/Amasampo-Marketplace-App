
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface AuthFormProps {
  type: 'LOGIN' | 'SIGNUP';
  onSuccess: () => void;
  onSwitchMode: () => void;
  switchModeText: string;
  switchModeLinkText: string;
}

type AuthMode = 'EMAIL' | 'PHONE';
type PhoneStep = 'INPUT' | 'OTP';

const COUNTRIES = [
  { code: '+260', name: 'Zambia', flag: '🇿🇲' },
  { code: '+233', name: 'Ghana', flag: '🇬🇭' },
  { code: '+234', name: 'Nigeria', flag: '🇳🇬' },
  { code: '+254', name: 'Kenya', flag: '🇰🇪' },
  { code: '+27', name: 'South Africa', flag: '🇿🇦' },
  { code: '+1', name: 'USA/Canada', flag: '🇺🇸' },
];

const AuthForm: React.FC<AuthFormProps> = ({ type, onSuccess, onSwitchMode, switchModeText, switchModeLinkText }) => {
  const { simulateGoogleLogin, loginEmail, signupEmail, requestOTP, verifyOTP, error, clearError } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>('PHONE');
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('INPUT');
  const [countryCode, setCountryCode] = useState(COUNTRIES[0].code);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [showSmsNotification, setShowSmsNotification] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    otp: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    let timer: number;
    if (resendTimer > 0) {
      timer = window.setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  const getFullPhone = () => countryCode + formData.phone;

  const handleGoogleClick = () => {
    setLoading(true);
    // Simulate a brief "Connecting to Google" delay
    setTimeout(() => {
      simulateGoogleLogin();
      onSuccess();
      setLoading(false);
    }, 800);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setLoading(true);

    if (mode === 'EMAIL') {
      let result = false;
      if (type === 'SIGNUP') {
        if (formData.password !== formData.confirmPassword) {
          setValidationError("Passwords do not match.");
          setLoading(false);
          return;
        }
        result = await signupEmail(formData.name, formData.email, formData.password);
      } else {
        result = await loginEmail(formData.email, formData.password);
      }
      if (result) onSuccess();
    } else {
      if (phoneStep === 'INPUT') {
        if (type === 'SIGNUP' && !formData.name) {
          setValidationError("Please enter your name.");
          setLoading(false);
          return;
        }
        const success = await requestOTP(getFullPhone());
        if (success) {
          setPhoneStep('OTP');
          setResendTimer(30);
          setShowSmsNotification(true);
          setTimeout(() => setShowSmsNotification(false), 10000);
        }
      } else {
        const result = await verifyOTP(getFullPhone(), formData.otp, type === 'SIGNUP' ? formData.name : undefined);
        if (result) onSuccess();
      }
    }
    setLoading(false);
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    const result = await requestOTP(getFullPhone());
    if (result) {
      setResendTimer(30);
      setFormData({ ...formData, otp: '' });
      setShowSmsNotification(true);
      setTimeout(() => setShowSmsNotification(false), 10000);
      clearError();
    }
    setLoading(false);
  };

  const inputClasses = "w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:bg-white outline-none transition-all text-sm font-medium";
  const labelClasses = "block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="w-full max-w-md bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-50 relative overflow-hidden">
      
      {/* SMS Notification Overlay */}
      <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[95%] max-w-sm transition-all duration-700 transform ${showSmsNotification ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-32 opacity-0 scale-95 pointer-events-none'}`}>
        <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-5 flex items-start gap-4 ring-1 ring-white/20">
          <div className="w-12 h-12 bg-green-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg animate-pulse">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mesh Gateway • Now</p>
            </div>
            <p className="text-sm font-bold text-white">Verification code: <span className="text-green-400 font-black underline decoration-2 underline-offset-4">123456</span></p>
          </div>
        </div>
      </div>

      <div className="mb-8 text-center">
        <div className="w-20 h-20 rounded-[2.2rem] flex items-center justify-center mx-auto mb-6 shadow-xl transform transition-all active:scale-95 bg-slate-900">
          <span className="text-4xl font-black text-white tracking-tighter">A</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">
          {type === 'LOGIN' ? 'Welcome Back' : 'Join the Mesh'}
        </h1>
        <p className="text-sm text-slate-500 font-medium">Access your global marketplace node.</p>
      </div>

      {/* FIXED Google Login Path: Simulated for Development Resilience */}
      <div className="space-y-4 mb-10">
        <button 
          onClick={handleGoogleClick}
          disabled={loading}
          className="w-full py-4 bg-slate-900 text-white font-black rounded-3xl text-[11px] uppercase tracking-widest hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl disabled:opacity-50"
        >
          {loading ? (
             <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          )}
          {type === 'SIGNUP' ? "Sign up with Google" : "Continue with Google"}
        </button>
      </div>

      <div className="my-8 relative">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100"></span></div>
        <div className="relative flex justify-center text-[9px] uppercase"><span className="bg-white px-4 text-slate-300 font-black tracking-widest">Or Manual Method</span></div>
      </div>

      <div className="flex p-1.5 bg-slate-100 rounded-[1.4rem] mb-6">
        <button 
          type="button"
          onClick={() => { setMode('PHONE'); setPhoneStep('INPUT'); clearError(); }}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${mode === 'PHONE' ? 'bg-white text-green-700 shadow-md' : 'text-slate-400'}`}
        >
          Phone
        </button>
        <button 
          type="button"
          onClick={() => { setMode('EMAIL'); clearError(); }}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${mode === 'EMAIL' ? 'bg-white text-green-700 shadow-md' : 'text-slate-400'}`}
        >
          Email
        </button>
      </div>

      {(error || validationError) && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 text-xs font-bold rounded-2xl flex items-center gap-3 animate-in shake duration-500">
          <svg className="w-4 h-4 text-red-600 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
          <span className="leading-tight">{error || validationError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'EMAIL' ? (
          <>
            {type === 'SIGNUP' && (
              <div>
                <label className={labelClasses}>Full Name</label>
                <input type="text" required className={inputClasses} placeholder="Kwame Mensah" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>
            )}
            <div>
              <label className={labelClasses}>Email</label>
              <input type="email" required className={inputClasses} placeholder="you@hustle.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            </div>
            <div>
              <label className={labelClasses}>Password</label>
              <input type="password" required className={inputClasses} placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
            </div>
          </>
        ) : (
          <>
            {phoneStep === 'INPUT' ? (
              <>
                {type === 'SIGNUP' && (
                  <div>
                    <label className={labelClasses}>Shop Name</label>
                    <input type="text" required className={inputClasses} placeholder="e.g. Lusaka Tech Fix" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                  </div>
                )}
                <div>
                  <label className={labelClasses}>Phone Number</label>
                  <div className="flex gap-2">
                    <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="bg-slate-100 rounded-2xl px-3 text-xs font-black">
                      {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                    </select>
                    <input type="tel" required className={inputClasses} placeholder="971 234 567" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})} />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-6">
                <input 
                  type="text" maxLength={6} required
                  className="w-full py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-center text-5xl font-black tracking-[0.25em] outline-none focus:ring-4 focus:ring-green-500/10"
                  placeholder="••••••"
                  value={formData.otp}
                  onChange={(e) => setFormData({...formData, otp: e.target.value.replace(/\D/g, '')})}
                />
                <button type="button" onClick={handleResend} disabled={resendTimer > 0} className="w-full text-[10px] font-black text-green-600 uppercase tracking-widest">
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
                </button>
              </div>
            )}
          </>
        )}

        <button 
          type="submit"
          disabled={loading}
          className={`w-full py-5 text-white font-black rounded-3xl shadow-xl active:scale-[0.97] transition-all text-sm uppercase tracking-widest disabled:opacity-70 ${type === 'LOGIN' ? 'bg-slate-900' : 'bg-green-700'}`}
        >
          {loading ? 'Verifying...' : (mode === 'PHONE' && phoneStep === 'INPUT' ? 'Send OTP' : 'Continue')}
        </button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-sm text-slate-500 font-medium">
          {switchModeText} <button onClick={onSwitchMode} className="text-green-600 font-black hover:underline">{switchModeLinkText}</button>
        </p>
      </div>
    </div>
  );
};

export default AuthForm;
