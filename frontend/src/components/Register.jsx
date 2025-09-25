import React, { useState, useEffect } from 'react';
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
  
  const { register, loginWithGoogle, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect to home if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      console.log('User is authenticated, redirecting to home...');
      navigate('/home');
    }
  }, [isAuthenticated, authLoading, navigate]);

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
      
      // Call the register function from AuthContext (Supabase)
      const result = await register({
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        username: formData.username
      });

      if (result.success) {
        console.log('Registration successful!');
        // Show success message - user needs to verify email
        setErrors({ 
          general: 'Registration successful! Please check your email to verify your account before signing in.' 
        });
        
        // Clear form
        setFormData({
          username: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
        
        // Redirect to login after a delay
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        console.error('Registration failed:', result.error);
        
        // Handle Supabase auth errors
        let errorMessage = 'Registration failed. Please try again.';
        
        if (result.error?.message) {
          // Map common Supabase errors to user-friendly messages
          const message = result.error.message.toLowerCase();
          
          if (message.includes('email')) {
            if (message.includes('already')) {
              errorMessage = 'An account with this email already exists. Please use a different email or try logging in.';
            } else if (message.includes('invalid')) {
              errorMessage = 'Please enter a valid email address.';
            } else {
              errorMessage = result.error.message;
            }
          } else if (message.includes('password')) {
            if (message.includes('weak') || message.includes('short')) {
              errorMessage = 'Password is too weak. Please use at least 8 characters with uppercase, lowercase, and numbers.';
            } else {
              errorMessage = result.error.message;
            }
          } else {
            errorMessage = result.error.message;
          }
        }
        
        setErrors({ general: errorMessage });
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ 
        general: 'An unexpected error occurred. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    console.log('Google signup initiated');
    setIsLoading(true);
    
    const result = await loginWithGoogle();
    
    if (result.success) {
      console.log('Redirecting to Google for authentication...');
      // Google OAuth will redirect, so we don't need to do anything else
    } else {
      console.error('Google signup failed:', result.message);
      setErrors({ general: result.message });
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
          <div 
            className={`error-message ${errors.general.includes('successful') ? 'success-message' : ''}`} 
            style={{ textAlign: 'center', marginBottom: '20px' }}
          >
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

        <div className="divider">
          <span>OR</span>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignup}
          className="btn btn-google"
          disabled={isLoading}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: '8px' }}>
            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 0 1-7.18-2.53H1.83v2.07A8 8 0 0 0 8.98 17z"/>
            <path fill="#FBBC05" d="M4.5 10.49a4.8 4.8 0 0 1 0-3.07V5.35H1.83a8 8 0 0 0 0 7.18l2.67-2.04z"/>
            <path fill="#EA4335" d="M8.98 4.72c1.16 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.35L4.5 7.42c.64-1.9 2.26-3.22 4.48-3.22z"/>
          </svg>
          {isLoading ? 'Connecting...' : 'Sign up with Google'}
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