
import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { storage } from '../services/storage';

interface UserProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  photoUrl: string;
  authMethod: 'google' | 'email' | 'phone';
}

interface AuthContextType {
  user: UserProfile | null;
  currency: string;
  setCurrency: (code: string) => void;
  login: (credential: string) => void;
  simulateGoogleLogin: () => void;
  loginEmail: (email: string, pass: string) => Promise<boolean>;
  signupEmail: (name: string, email: string, pass: string) => Promise<boolean>;
  requestOTP: (phone: string) => Promise<boolean>;
  verifyOTP: (phone: string, otp: string, name?: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  isAuthenticated: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('amasampo_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [currency, setCurrencyState] = useState<string>(() => {
    return localStorage.getItem('amasampo_currency') || 'ZMW';
  });

  const [error, setError] = useState<string | null>(null);
  const [mockOTPStore, setMockOTPStore] = useState<Record<string, string>>({});

  // Auth Sync Listener
  useEffect(() => {
    const unsubscribe = storage.subscribe(() => {
      const saved = localStorage.getItem('amasampo_user');
      const currentUser = saved ? JSON.parse(saved) : null;
      if (JSON.stringify(currentUser) !== JSON.stringify(user)) {
        setUser(currentUser);
      }
      
      const savedCurrency = localStorage.getItem('amasampo_currency') || 'ZMW';
      if (savedCurrency !== currency) {
        setCurrencyState(savedCurrency);
      }
    });
    return unsubscribe;
  }, [user, currency]);

  const setCurrency = (code: string) => {
    setCurrencyState(code);
    localStorage.setItem('amasampo_currency', code);
    storage.broadcast('CURRENCY_CHANGED', code);
  };

  const clearError = () => setError(null);

  const syncUserToDb = (profile: UserProfile) => {
    const users = JSON.parse(localStorage.getItem('amasampo_db_users') || '[]');
    const existingIdx = users.findIndex((u: any) => 
      (profile.email && u.email === profile.email) || (profile.phone && u.phone === profile.phone)
    );
    
    if (existingIdx === -1) {
      users.push({
        ...profile,
        id: profile.id || `u_${Math.random().toString(36).substr(2, 9)}`,
        created: new Date().toISOString()
      });
    } else {
      users[existingIdx] = { ...users[existingIdx], ...profile };
    }
    localStorage.setItem('amasampo_db_users', JSON.stringify(users));
  };

  const finalizeLogin = (newUser: UserProfile) => {
    setUser(newUser);
    localStorage.setItem('amasampo_user', JSON.stringify(newUser));
    storage.broadcast('AUTH_LOGIN', newUser);
    setError(null);
  };

  const login = (credential: string) => {
    try {
      // Step 1: Decode JWT from Google Identity Services
      const decoded: any = jwtDecode(credential);
      
      // Step 2: Extract User Information
      const newUser: UserProfile = {
        id: decoded.sub, // The unique Google ID
        name: decoded.name,
        email: decoded.email,
        photoUrl: decoded.picture,
        authMethod: 'google',
      };
      
      // Step 3: Persist and Sync
      syncUserToDb(newUser);
      finalizeLogin(newUser);
      
      console.log("Amasampo: Google Login Successful for", newUser.name);
    } catch (err) {
      console.error("Amasampo: JWT Decode Failed", err);
      setError("Google Sign-in failed. Please try again.");
    }
  };

  const simulateGoogleLogin = () => {
    const demoUser: UserProfile = {
      id: 'google_demo_123',
      name: 'Demo Hustler',
      email: 'hustler@demo.com',
      photoUrl: 'https://ui-avatars.com/api/?name=Demo+Hustler&background=15803d&color=fff&bold=true',
      authMethod: 'google',
    };
    syncUserToDb(demoUser);
    finalizeLogin(demoUser);
  };

  const loginEmail = async (email: string, pass: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    const users = JSON.parse(localStorage.getItem('amasampo_db_users') || '[]');
    const found = users.find((u: any) => u.email === email && u.password === pass);
    
    if (found) {
      const newUser: UserProfile = {
        id: found.id,
        name: found.name,
        email: found.email,
        photoUrl: found.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(found.name)}&background=15803d&color=fff&bold=true`,
        authMethod: 'email',
      };
      finalizeLogin(newUser);
      return true;
    } else {
      setError("Incorrect email or password.");
      return false;
    }
  };

  const signupEmail = async (name: string, email: string, pass: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const users = JSON.parse(localStorage.getItem('amasampo_db_users') || '[]');
    
    if (users.find((u: any) => u.email === email)) {
      setError("This email is already registered.");
      return false;
    }

    const newUserEntry = {
      id: `u_${Math.random().toString(36).substr(2, 9)}`,
      name,
      email,
      password: pass,
      photoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f97316&color=fff&bold=true`,
      authMethod: 'email' as const
    };

    users.push(newUserEntry);
    localStorage.setItem('amasampo_db_users', JSON.stringify(users));
    
    const sessionUser: UserProfile = {
      id: newUserEntry.id,
      name: newUserEntry.name,
      email: newUserEntry.email,
      photoUrl: newUserEntry.photoUrl,
      authMethod: 'email',
    };
    
    finalizeLogin(sessionUser);
    return true;
  };

  const requestOTP = async (phone: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 1200));
    const otp = "123456"; 
    setMockOTPStore(prev => ({ ...prev, [phone]: otp }));
    return true;
  };

  const verifyOTP = async (phone: string, otp: string, name?: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    if (mockOTPStore[phone] === otp) {
      const users = JSON.parse(localStorage.getItem('amasampo_db_users') || '[]');
      let existingUser = users.find((u: any) => u.phone === phone);

      if (!existingUser) {
        if (!name) {
          setError("Account not found. Please click 'Create Account'.");
          return false;
        }
        
        existingUser = {
          id: `u_${Math.random().toString(36).substr(2, 9)}`,
          name: name,
          phone: phone,
          photoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=15803d&color=fff&bold=true`,
          authMethod: 'phone' as const
        };
        users.push(existingUser);
        localStorage.setItem('amasampo_db_users', JSON.stringify(users));
      }

      const sessionUser: UserProfile = {
        id: existingUser.id,
        name: existingUser.name,
        phone: existingUser.phone,
        photoUrl: existingUser.photoUrl,
        authMethod: 'phone',
      };
      
      finalizeLogin(sessionUser);
      return true;
    } else {
      setError("Verification code mismatch.");
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('amasampo_user');
    storage.broadcast('AUTH_LOGOUT');
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      currency,
      setCurrency,
      login, 
      simulateGoogleLogin,
      loginEmail, 
      signupEmail, 
      requestOTP,
      verifyOTP,
      logout, 
      clearError,
      isAuthenticated: !!user, 
      error 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
