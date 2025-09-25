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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  const { register, isAuthenticated, loading: authLoading, signInWithGoogle } = useAuth();
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

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrors({});

    try {
      const result = await signInWithGoogle();
      
      if (!result.success) {
        setErrors({ 
          general: result.message || 'Google sign-in failed. Please try again.' 
        });
      }
      // If successful, user will be redirected by Google OAuth flow
    } catch (error) {
      console.error('Google sign-in error:', error);
      setErrors({ 
        general: 'An unexpected error occurred with Google sign-in. Please try again.' 
      });
    } finally {
      setIsGoogleLoading(false);
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
          disabled={isLoading || isGoogleLoading}
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>

        <div className="divider">
          <span>or</span>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="btn btn-google"
          disabled={isLoading || isGoogleLoading}
        >
          <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}
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