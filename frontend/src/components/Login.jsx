import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import securityUtils from '../lib/security';
import '../styles/Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [rateLimitInfo, setRateLimitInfo] = useState(null);

    const { login, loginWithGoogle, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect to home if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      console.log('User is authenticated, redirecting to home...');
      navigate('/home');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Sanitize input
    const sanitizedValue = securityUtils.sanitizeInput(value);
    
    setFormData(prev => ({
      ...prev,
      [name]: sanitizedValue
    }));
    
    // Clear errors when user starts typing
    if (error) setError('');
    if (validationErrors.length > 0) setValidationErrors([]);
    if (rateLimitInfo && !rateLimitInfo.allowed) setRateLimitInfo(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check rate limiting
    const rateCheck = securityUtils.checkRateLimit('login', 5, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      setRateLimitInfo(rateCheck);
      setError(`Too many login attempts. Please wait ${Math.ceil(rateCheck.waitTime / 60)} minutes.`);
      securityUtils.logSecurityEvent('RATE_LIMIT_EXCEEDED', { action: 'login' });
      return;
    }
    
    // Validate form
    const validation = securityUtils.validateForm(formData, {
      email: { required: true, email: true },
      password: { required: true, minLength: 1 }
    });
    
    if (!validation.isValid) {
      setValidationErrors(Object.values(validation.errors).map(error => ({ msg: error })));
      return;
    }
    
    setLoading(true);
    setError('');
    setValidationErrors([]);

    console.log('Login form submitted:', { email: formData.email });
    securityUtils.logSecurityEvent('LOGIN_ATTEMPT', { email: formData.email });

    const result = await login(formData);

    if (result.success) {
      console.log('Login successful! Auth state will update and redirect automatically.');
      securityUtils.logSecurityEvent('LOGIN_SUCCESS', { email: formData.email });
      securityUtils.clearRateLimit('login'); // Clear rate limit on success
      // The useEffect will handle redirection when isAuthenticated becomes true
    } else {
      console.error('Login failed:', result.message);
      setError(result.message);
      securityUtils.logSecurityEvent('LOGIN_FAILED', { 
        email: formData.email, 
        reason: result.message 
      });
      
      if (result.errors && result.errors.length > 0) {
        setValidationErrors(result.errors);
      }
    }

    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');

    console.log('Google sign-in initiated');
    securityUtils.logSecurityEvent('GOOGLE_LOGIN_ATTEMPT');

    const result = await loginWithGoogle();

    if (result.success) {
      console.log('Google sign-in successful!');
      securityUtils.logSecurityEvent('GOOGLE_LOGIN_SUCCESS');
      // OAuth will redirect to Google, then back to our app
    } else {
      console.error('Google sign-in failed:', result.message);
      setError(result.message);
      securityUtils.logSecurityEvent('GOOGLE_LOGIN_FAILED', { 
        reason: result.message 
      });
    }

    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    console.log('Google login initiated');
    setLoading(true);
    
    const result = await loginWithGoogle();
    
    if (result.success) {
      console.log('Redirecting to Google for authentication...');
      // Google OAuth will redirect, so we don't need to do anything else
    } else {
      console.error('Google login failed:', result.message);
      setError(result.message);
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2 className="login-title">Login</h2>
        
        {rateLimitInfo && !rateLimitInfo.allowed && (
          <div className="error-message" style={{ textAlign: 'center', marginBottom: '20px' }}>
            ⚠️ Rate limit exceeded. Please wait {Math.ceil(rateLimitInfo.waitTime / 60)} minutes before trying again.
          </div>
        )}
        
        {error && (
          <div className="error-message" style={{ textAlign: 'center', marginBottom: '20px' }}>
            {error}
          </div>
        )}
        
        {validationErrors.length > 0 && (
          <div className="error-message" style={{ textAlign: 'left', marginBottom: '20px' }}>
            <ul>
              {validationErrors.map((error, index) => (
                <li key={index}>{error.msg}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="email" className="form-label">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="form-input"
            placeholder="Enter your email"
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password" className="form-label">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="form-input"
            placeholder="Enter your password"
            required
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          className="btn"
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>

        <div className="divider">
          <span>OR</span>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="btn btn-google"
          disabled={loading}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: '8px' }}>
            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 0 1-7.18-2.53H1.83v2.07A8 8 0 0 0 8.98 17z"/>
            <path fill="#FBBC05" d="M4.5 10.49a4.8 4.8 0 0 1 0-3.07V5.35H1.83a8 8 0 0 0 0 7.18l2.67-2.04z"/>
            <path fill="#EA4335" d="M8.98 4.72c1.16 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.35L4.5 7.42c.64-1.9 2.26-3.22 4.48-3.22z"/>
          </svg>
          {loading ? 'Connecting...' : 'Continue with Google'}
        </button>

        <div className="login-footer">
          <p>Don't have an account?</p>
          <Link to="/register" className="btn-link">
            Create an account
          </Link>
        </div>
        
        <div className="demo-info">
          <h4>🚀 Now powered by Supabase!</h4>
          <p><em>Secure authentication & database in the cloud</em></p>
        </div>
      </form>
    </div>
  );
};

export default Login;