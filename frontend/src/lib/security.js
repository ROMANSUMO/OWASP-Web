// Frontend security utilities
import { supabase } from './supabase';

class SecurityUtils {
    constructor() {
        this.csrfToken = null;
        this.tokenCache = new Map();
    }

    // Get CSRF token from server
    async getCSRFToken() {
        if (this.csrfToken) {
            return this.csrfToken;
        }

        try {
            const response = await fetch('/api/csrf-token', {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.csrfToken = data.data.csrfToken;
                return this.csrfToken;
            }
        } catch (error) {
            console.error('Failed to get CSRF token:', error);
        }

        return null;
    }

    // Make secure API request with CSRF token
    async secureRequest(url, options = {}) {
        const csrfToken = await this.getCSRFToken();
        
        const secureOptions = {
            ...options,
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
                ...options.headers
            }
        };

        return fetch(url, secureOptions);
    }

    // Sanitize user input on frontend (basic XSS prevention)
    sanitizeInput(input) {
        if (typeof input !== 'string') {
            return input;
        }

        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }

    // Validate email format
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Validate password strength
    validatePassword(password) {
        const minLength = 8;
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        const checks = {
            minLength: password.length >= minLength,
            hasUppercase,
            hasLowercase,
            hasNumbers,
            hasSpecialChar
        };

        const isValid = checks.minLength && checks.hasUppercase && 
                        checks.hasLowercase && checks.hasNumbers;

        return {
            isValid,
            checks,
            strength: this.calculatePasswordStrength(checks)
        };
    }

    // Calculate password strength score
    calculatePasswordStrength(checks) {
        let score = 0;
        let level = 'Very Weak';

        if (checks.minLength) score++;
        if (checks.hasUppercase) score++;
        if (checks.hasLowercase) score++;
        if (checks.hasNumbers) score++;
        if (checks.hasSpecialChar) score++;

        switch (score) {
            case 0-1:
                level = 'Very Weak';
                break;
            case 2:
                level = 'Weak';
                break;
            case 3:
                level = 'Fair';
                break;
            case 4:
                level = 'Good';
                break;
            case 5:
                level = 'Strong';
                break;
        }

        return { score, level };
    }

    // Validate username
    isValidUsername(username) {
        const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
        return usernameRegex.test(username);
    }

    // Rate limiting check (client-side)
    checkRateLimit(action, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
        const key = `${action}_attempts`;
        const now = Date.now();
        
        let attempts = JSON.parse(localStorage.getItem(key) || '[]');
        
        // Remove old attempts outside the window
        attempts = attempts.filter(timestamp => now - timestamp < windowMs);
        
        if (attempts.length >= maxAttempts) {
            const oldestAttempt = Math.min(...attempts);
            const waitTime = windowMs - (now - oldestAttempt);
            return {
                allowed: false,
                waitTime: Math.ceil(waitTime / 1000), // seconds
                attemptsRemaining: 0
            };
        }

        // Record this attempt
        attempts.push(now);
        localStorage.setItem(key, JSON.stringify(attempts));

        return {
            allowed: true,
            waitTime: 0,
            attemptsRemaining: maxAttempts - attempts.length
        };
    }

    // Clear rate limit data
    clearRateLimit(action) {
        localStorage.removeItem(`${action}_attempts`);
    }

    // Log security events (for monitoring)
    logSecurityEvent(event, details = {}) {
        const logEntry = {
            event,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            details
        };

        // Store locally for debugging
        const logs = JSON.parse(localStorage.getItem('security_logs') || '[]');
        logs.push(logEntry);
        
        // Keep only last 100 logs
        if (logs.length > 100) {
            logs.splice(0, logs.length - 100);
        }
        
        localStorage.setItem('security_logs', JSON.stringify(logs));

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.log('Security Event:', logEntry);
        }
    }

    // Enhanced form validation
    validateForm(formData, rules) {
        const errors = {};
        
        for (const field in rules) {
            const value = formData[field];
            const fieldRules = rules[field];
            
            // Required check
            if (fieldRules.required && (!value || value.trim() === '')) {
                errors[field] = `${field} is required`;
                continue;
            }
            
            // Skip further validation if field is empty and not required
            if (!value && !fieldRules.required) {
                continue;
            }
            
            // Email validation
            if (fieldRules.email && !this.isValidEmail(value)) {
                errors[field] = 'Please enter a valid email address';
                continue;
            }
            
            // Password validation
            if (fieldRules.password) {
                const validation = this.validatePassword(value);
                if (!validation.isValid) {
                    errors[field] = 'Password must be at least 8 characters with uppercase, lowercase, and numbers';
                    continue;
                }
            }
            
            // Username validation
            if (fieldRules.username && !this.isValidUsername(value)) {
                errors[field] = 'Username must be 3-30 characters, letters, numbers, and underscores only';
                continue;
            }
            
            // Length validation
            if (fieldRules.minLength && value.length < fieldRules.minLength) {
                errors[field] = `${field} must be at least ${fieldRules.minLength} characters`;
                continue;
            }
            
            if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
                errors[field] = `${field} must be no more than ${fieldRules.maxLength} characters`;
                continue;
            }
        }
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }
}

// Create singleton instance
const securityUtils = new SecurityUtils();

export default securityUtils;