import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user starts typing
    if (error) setError('');
    if (validationErrors.length > 0) setValidationErrors([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setValidationErrors([]);

    console.log('Login form submitted:', formData);

    const result = await login(formData);

    if (result.success) {
      console.log('Login successful, redirecting to home...');
      navigate('/home');
    } else {
      console.error('Login failed:', result.message);
      setError(result.message);
      
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
        
        <div className="demo-credentials">
          <h4>Demo Credentials:</h4>
          <p><strong>Email:</strong> admin@example.com</p>
          <p><strong>Password:</strong> password123</p>
          <p><em>Or use: test@example.com / password123</em></p>
        </div>
      </form>
    </div>
  );
};

export default Login;