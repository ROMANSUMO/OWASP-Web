import React from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/Home.css';

const Home = () => {
  const { user } = useAuth();

  const currentTime = new Date().toLocaleString();

  return (
    <div className="home-container">
      <div className="home-content">
        {/* Welcome Section */}
        <div className="welcome-section">
          <h1 className="welcome-title">
            Welcome to WebSecurity Dashboard
          </h1>
          <p className="welcome-subtitle">
            Your secure web application management center
          </p>
          
          {user && (
            <div className="user-info-card">
              <h3>User Information</h3>
              <p><strong>Username:</strong> {user.username}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Last Login:</strong> {currentTime}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;