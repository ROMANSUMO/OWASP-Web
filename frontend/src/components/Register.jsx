import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Register.css';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  // Email validation helper
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Password validation helper
  const validatePassword = (password) => {
    return {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password)
    };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear specific field error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Clear general error
    if (errors.general) {
      setErrors(prev => ({
        ...prev,
        general: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      const passwordReqs = validatePassword(formData.password);
      if (!passwordReqs.minLength) {
        newErrors.password = 'Password must be at least 8 characters';
      } else if (!passwordReqs.hasUppercase || !passwordReqs.hasLowercase || !passwordReqs.hasNumber) {
        newErrors.password = 'Password must contain uppercase, lowercase, and number';
      }
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      console.log('Registration form submitted:', formData);
      
      // Call the register function from AuthContext
      const result = await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword
      });

      if (result && result.success) {
        console.log('Registration successful, redirecting to home...');
        navigate('/home');
      } else {
        console.error('Registration failed:', result?.message || 'Unknown error');
        
        // Handle different types of errors
        if (result && result.errors && Array.isArray(result.errors)) {
          // Backend validation errors (array format)
          const fieldErrors = {};
          result.errors.forEach(error => {
            if (error.field) {
              fieldErrors[error.field] = error.msg || error.message;
            }
          });
          
          if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
          } else {
            setErrors({ general: result.message || 'Registration failed. Please try again.' });
          }
        } else {
          // General error message
          setErrors({ 
            general: result?.message || 'Registration failed. Please try again.' 
          });
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      // Handle network or other errors
      if (error.response) {
        // API responded with error status
        const errorMessage = error.response.data?.message || 'Registration failed. Please try again.';
        setErrors({ general: errorMessage });
      } else if (error.request) {
        // Network error
        setErrors({ general: 'Network error. Please check your connection and try again.' });
      } else {
        // Other error
        setErrors({ general: 'An unexpected error occurred. Please try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const passwordReqs = formData.password ? validatePassword(formData.password) : {
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false
  };

  return (
    <div className="register-container">
      <form onSubmit={handleSubmit} className="register-form">
        <h2 className="register-title">Create Account</h2>
        
        {errors.general && (
          <div className="error-message" style={{ textAlign: 'center', marginBottom: '20px' }}>
            {errors.general}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="username" className="form-label">
            Username
          </label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className={`form-input ${errors.username ? 'error' : ''}`}
            placeholder="Enter your username"
            disabled={isLoading}
            required
          />
          {errors.username && (
            <span className="error-message">{errors.username}</span>
          )}
        </div>

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
            className={`form-input ${errors.email ? 'error' : ''}`}
            placeholder="Enter your email"
            disabled={isLoading}
            required
          />
          {errors.email && (
            <span className="error-message">{errors.email}</span>
          )}
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
            className={`form-input ${errors.password ? 'error' : ''}`}
            placeholder="Enter your password"
            disabled={isLoading}
            required
          />
          
          {/* Password requirements indicator */}
          {formData.password && (
            <div className="password-requirements">
              <ul>
                <li className={passwordReqs.minLength ? 'valid' : 'invalid'}>
                  At least 8 characters
                </li>
                <li className={passwordReqs.hasUppercase ? 'valid' : 'invalid'}>
                  One uppercase letter
                </li>
                <li className={passwordReqs.hasLowercase ? 'valid' : 'invalid'}>
                  One lowercase letter
                </li>
                <li className={passwordReqs.hasNumber ? 'valid' : 'invalid'}>
                  One number
                </li>
              </ul>
            </div>
          )}
          
          {errors.password && (
            <span className="error-message">{errors.password}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword" className="form-label">
            Confirm Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
            placeholder="Confirm your password"
            disabled={isLoading}
            required
          />
          {errors.confirmPassword && (
            <span className="error-message">{errors.confirmPassword}</span>
          )}
        </div>

        <button
          type="submit"
          className="btn"
          disabled={isLoading}
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>

        <div className="register-footer">
          <p>Already have an account?</p>
          <Link to="/login" className="btn-link">
            Sign in here
          </Link>
        </div>
      </form>
    </div>
  );
};

export default Register;