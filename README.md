# WebSecurity - React Frontend Application

A modern, responsive React frontend application with Supabase authentication, routing, and a clean user interface. This project demonstrates a complete web application structure with secure login/register functionality, protected routes, and a dashboard interface.

## Features

### 🔐 Authentication System (Supabase-Powered)
- User registration with email verification
- Secure JWT-based authentication
- Protected routes that require authentication
- Context-based state management for user sessions
- Automatic redirect handling based on authentication status
- Real-time session management with Supabase

### 🧭 Navigation & Routing
- React Router for single-page application navigation
- Dynamic navigation bar that changes based on authentication state
- Protected routes using HOC pattern
- Default route redirection logic

### 📱 Responsive Design
- Mobile-first responsive design
- Clean, modern UI with CSS-only styling
- Optimized for desktop, tablet, and mobile devices
- Accessible form design with proper labels and validation

### 🎨 User Interface
- **Login Page**: Username/email and password authentication
- **Register Page**: Complete registration form with validation
- **Home Page**: User dashboard with welcome message and feature cards
- **Navigation Bar**: Dynamic navigation based on authentication state

## Project Structure

```
src/
├── components/
│   ├── Home.jsx           # Dashboard/home page component
│   ├── Login.jsx          # Login form component
│   ├── Navbar.jsx         # Navigation bar component
│   ├── ProtectedRoute.jsx # Route protection HOC
│   └── Register.jsx       # Registration form component
├── context/
│   └── AuthContext.jsx    # Authentication context provider
├── styles/
│   ├── global.css         # Global styles and utilities
│   ├── Home.css          # Home page specific styles
│   ├── Login.css         # Login page specific styles
│   ├── Navbar.css        # Navigation bar styles
│   └── Register.css      # Registration page styles
├── App.jsx               # Main application component
├── main.jsx             # Application entry point
└── index.css            # Base CSS reset and root styles
```

## Installation & Setup

1. **Clone or download the project**
   ```bash
   cd WebSecurity
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   Navigate to `http://localhost:5173` (or the port shown in terminal)

## Form Validation

### Login Form
- Username/email field validation
- Password minimum length requirement
- Real-time error display

### Registration Form
- Username validation (alphanumeric + underscores only)
- Email format validation
- Password strength requirements:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
- Confirm password matching
- Real-time validation feedback

## Authentication Flow

1. **Default Route**: Redirects to login if not authenticated, home if authenticated
2. **Login**: Mock authentication sets user state and redirects to home
3. **Register**: Mock registration creates user and auto-logs them in
4. **Protected Routes**: Automatically redirect to login if not authenticated
5. **Logout**: Clears user state and redirects to login

## Mock Authentication

Currently uses client-side mock authentication for demonstration:
- Login accepts any username/password combination
- Registration creates a mock user session
- User state persists during the session
- No backend API calls are made (ready for integration)

## CSS Architecture

- **Modular CSS**: Each component has its own CSS file
- **Global Styles**: Common utilities and base styles
- **Responsive Design**: Mobile-first approach with breakpoints
- **Modern CSS**: Uses Flexbox, Grid, and CSS transitions
- **No CSS Frameworks**: Pure CSS implementation for learning

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Future Enhancements

- [ ] Backend API integration
- [ ] Real JWT token authentication
- [ ] Password reset functionality
- [ ] Remember me option
- [ ] User profile management
- [ ] Dashboard data from API
- [ ] Dark mode theme
- [ ] Multi-language support

## Technologies Used

- **React 19** - Frontend framework
- **React Router** - Client-side routing
- **React Context** - State management
- **Vite** - Build tool and dev server
- **Pure CSS** - Styling (no frameworks)
- **ESLint** - Code linting

## Development Notes

This application is built with modern React patterns and hooks. The authentication system is designed to be easily replaceable with a real backend API. All form submissions currently use console.log for debugging but are structured to easily integrate with HTTP requests.

The styling is purposefully done with vanilla CSS to demonstrate CSS skills and maintain full control over the design without external dependencies.+ Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
