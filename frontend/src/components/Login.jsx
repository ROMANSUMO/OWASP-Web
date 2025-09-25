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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [rateLimitInfo, setRateLimitInfo] = useState(null);

  const { login, signInWithGoogle, isAuthenticated, loading: authLoading } = useAuth();
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
    setIsGoogleLoading(true);
    setError('');
    setValidationErrors([]);

    console.log('Google sign-in initiated');
    securityUtils.logSecurityEvent('GOOGLE_LOGIN_ATTEMPT');

    try {
      const result = await signInWithGoogle();
      
      if (result.success) {
        console.log('Google sign-in successful!');
        securityUtils.logSecurityEvent('GOOGLE_LOGIN_SUCCESS');
      } else {
        console.error('Google sign-in failed:', result.message);
        setError(result.message || 'Google sign-in failed. Please try again.');
        securityUtils.logSecurityEvent('GOOGLE_LOGIN_FAILED', { 
          reason: result.message 
        });
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      setError('An unexpected error occurred with Google sign-in. Please try again.');
      securityUtils.logSecurityEvent('GOOGLE_LOGIN_ERROR', { 
        error: error.message 
      });
    } finally {
      setIsGoogleLoading(false);
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
          disabled={loading || isGoogleLoading}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>

        <div className="divider">
          <span>or</span>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="btn btn-google"
          disabled={loading || isGoogleLoading}
        >
          <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}
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