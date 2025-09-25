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
              <p><strong>Email:</strong> {user.email}</p>
              {user.user_metadata?.full_name && (
                <p><strong>Name:</strong> {user.user_metadata.full_name}</p>
              )}
              {user.profile?.username && (
                <p><strong>Username:</strong> {user.profile.username}</p>
              )}
              {user.user_metadata?.avatar_url && (
                <div style={{ marginTop: '10px' }}>
                  <img 
                    src={user.user_metadata.avatar_url} 
                    alt="Profile" 
                    style={{ 
                      width: '50px', 
                      height: '50px', 
                      borderRadius: '50%',
                      border: '2px solid #ddd'
                    }} 
                  />
                </div>
              )}
              <p><strong>Account Type:</strong> {user.app_metadata?.provider || 'Email'}</p>
              <p><strong>Last Login:</strong> {new Date(user.last_sign_in_at || Date.now()).toLocaleString()}</p>
            </div>
          )}
        </div>

        {/* Dashboard Section */}
        <div className="dashboard-section">
          <div className="dashboard-card">
            <h3>
              <span className="card-icon"></span>
              Security Overview
            </h3>
            <p>
              Monitor your application's security status, view recent alerts, 
              and manage security policies from this centralized dashboard.
            </p>
            <button className="btn">
              View Security Reports
            </button>
            
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-number">98%</span>
                <span className="stat-label">Security Score</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">0</span>
                <span className="stat-label">Active Threats</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">24</span>
                <span className="stat-label">Security Checks</span>
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <h3>
              <span className="card-icon"></span>
              User Management
            </h3>
            <p>
              Manage user accounts, permissions, and access controls. 
              Review user activity and maintain secure authentication.
            </p>
            <button className="btn">
              Manage Users
            </button>
            
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-number">1</span>
                <span className="stat-label">Active Users</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">5</span>
                <span className="stat-label">Total Users</span>
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <h3>
              <span className="card-icon"></span>
              System Monitoring
            </h3>
            <p>
              Real-time system performance monitoring, server health checks, 
              and application uptime statistics.
            </p>
            <button className="btn">
              View System Status
            </button>
            
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-number">99.9%</span>
                <span className="stat-label">Uptime</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">45ms</span>
                <span className="stat-label">Response Time</span>
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <h3>
              <span className="card-icon"></span>
              Settings & Configuration
            </h3>
            <p>
              Configure application settings, security policies, 
              and customize your dashboard preferences.
            </p>
            <button className="btn">
              Open Settings
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="recent-activity">
          <h3>Recent Activity</h3>
          <ul className="activity-list">
            <li className="activity-item">
              <span className="activity-text">User {user?.username} logged in successfully</span>
              <span className="activity-time">Just now</span>
            </li>
            <li className="activity-item">
              <span className="activity-text">Security scan completed - No issues found</span>
              <span className="activity-time">2 minutes ago</span>
            </li>
            <li className="activity-item">
              <span className="activity-text">System backup completed successfully</span>
              <span className="activity-time">1 hour ago</span>
            </li>
            <li className="activity-item">
              <span className="activity-text">Database maintenance completed</span>
              <span className="activity-time">3 hours ago</span>
            </li>
            <li className="activity-item">
              <span className="activity-text">Weekly security report generated</span>
              <span className="activity-time">1 day ago</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Home;