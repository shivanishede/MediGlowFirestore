import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import { auth } from '../../config/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import toast from 'react-hot-toast';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore(state => state.login);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // Firebase Login (using email as username for now or we can store username in profile)
        const userCredential = await signInWithEmailAndPassword(auth, email || `${username}@mediglow.com`, password);
        const user = userCredential.user;
        
        setAuth({ 
          id: user.uid, 
          username: user.displayName || username, 
          email: user.email 
        }, user.accessToken);
        
        toast.success('Logged in successfully via Firebase!');
        navigate('/dashboard');
      } else {
        // Firebase Register
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: username });
        
        toast.success('Account created in Cloud! Please log in.');
        setIsLogin(true);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    // Firebase doesn't have a simple "Send OTP to Email" like your custom node service
    // It has "Send Email Verification" or "Password Reset".
    // For a professional project, we use Firebase's secure defaults.
    toast.error('Direct OTP migration requires Firebase Cloud Functions. Please use simple Email/Password for now!');
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1 className="auth-title">MediGlow</h1>
        <h2 className="auth-subtitle">{isLogin ? 'Welcome Back' : 'Create an Account'}</h2>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required 
              autoFocus
              placeholder="e.g. JohnDoe123"
            />
          </div>

          {isLogin && (
            <div className="form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
                placeholder="your.email@example.com"
              />
            </div>
          )}

          {!isLogin && (
            <div className="form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required={!isLogin}
                placeholder="your.email@example.com"
              />
            </div>
          )}

          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>
          
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Please wait...' : (isLogin ? 'Log In' : 'Sign Up')}
          </button>
        </form>

        <p className="auth-switch">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span onClick={() => {
            setIsLogin(!isLogin);
            setOtpSent(false); // Reset OTP state when switching
            setOtp('');
            setEmail('');
          }}>
            {isLogin ? 'Sign Up' : 'Log In'}
          </span>
        </p>
      </div>
      
      <style>{`
        .auth-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-right: 15%; /* pushes card slightly left */

  background: linear-gradient(rgba(15, 14, 23, 0.6), rgba(15, 14, 23, 0.8)), url('/auth-bg.jpg') center/cover no-repeat fixed;
  background-color: #0F0E17;
  color: #EFEFEF;
  font-family: 'Inter', sans-serif;
  padding: 20px 15% 20px 40px; /* top right bottom left */
}
        .auth-box {
          background-color: rgba(26, 25, 41, 0.7); /* Slightly transparent */
          backdrop-filter: blur(12px); /* Glassmorphism blur effect */
          -webkit-backdrop-filter: blur(12px);
          padding: 40px;
          border-radius: 16px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
          width: 100%;
          max-width: 400px;
          border: 1px solid rgba(124, 111, 255, 0.2);
          text-align: center;
        }
        .auth-title {
          font-size: 32px;
          font-weight: 800;
          margin-bottom: 5px;
          background: linear-gradient(90deg, #7C6FFF 0%, #A095FF 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .auth-subtitle {
          font-size: 16px;
          color: #A09FA5;
          margin-bottom: 30px;
          font-weight: 400;
        }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
          text-align: left;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .form-group label {
          font-size: 13px;
          font-weight: 500;
          color: #D3D3D3;
        }
        .form-group input {
          background-color: #0F0E17;
          border: 1px solid #2B2A3D;
          border-radius: 8px;
          padding: 12px 16px;
          color: white;
          font-family: inherit;
          transition: border-color 0.2s;
        }
        .form-group input:focus {
          outline: none;
          border-color: #7C6FFF;
        }
        .auth-button {
          background-color: #7C6FFF;
          color: white;
          border: none;
          padding: 14px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          margin-top: 10px;
          transition: background-color 0.2s;
        }
        .auth-button:hover:not(:disabled) {
          background-color: #6A5AEB;
        }
        .auth-button:disabled {
          background-color: #4A457D;
          cursor: not-allowed;
        }
        .auth-switch {
          margin-top: 25px;
          font-size: 14px;
          color: #A09FA5;
        }
        .auth-switch span {
          color: #7C6FFF;
          cursor: pointer;
          font-weight: 500;
        }
        .auth-switch span:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
