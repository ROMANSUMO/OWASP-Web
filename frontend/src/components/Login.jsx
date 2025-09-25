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

  const { login, isAuthenticated, loading: authLoading } = useAuth();
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