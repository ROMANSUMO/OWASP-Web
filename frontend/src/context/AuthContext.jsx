import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  const login = (userData) => {
    console.log('Login attempt with:', userData);
    // Mock authentication - in real app, this would make API call
    setIsAuthenticated(true);
    setUser({
      username: userData.username || userData.email,
      email: userData.email || userData.username
    });
    console.log('User logged in successfully');
  };

  const register = (userData) => {
    console.log('Register attempt with:', userData);
    // Mock registration - in real app, this would make API call
    setIsAuthenticated(true);
    setUser({
      username: userData.username,
      email: userData.email
    });
    console.log('User registered successfully');
  };

  const logout = () => {
    console.log('User logged out');
    setIsAuthenticated(false);
    setUser(null);
  };

  const value = {
    isAuthenticated,
    user,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};