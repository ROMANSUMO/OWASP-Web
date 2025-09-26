# Production Environment Variables

## Backend (.env)
```bash
# Production Configuration
NODE_ENV=production
PORT=5000

# Frontend URL (update after deploying frontend)
FRONTEND_URL=https://your-app.vercel.app

# Production Secrets (CHANGE THESE!)
SESSION_SECRET=your-super-secret-256-character-session-key-change-this-in-production-really-important
CSRF_SECRET=your-super-secret-256-character-csrf-key-change-this-in-production-also-really-important

# Supabase Configuration (from your Supabase dashboard)
SUPABASE_URL=https://ckwgzoqzonvirauolakj.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrd2d6b3F6b252aXJhdW9sYWtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyMjQwODMsImV4cCI6MjA1MTgwMDA4M30.Z7_OKi9dAhJ8VDTEpSxxrTqsKhcfJPqnVZcHgvHnEXI
SUPABASE_SERVICE_KEY=your-supabase-service-key-from-dashboard

# Database (if using direct PostgreSQL connection)
DATABASE_URL=postgresql://[user]:[password]@db.[ref].supabase.co:5432/postgres

# Email Configuration (optional, for contact forms)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Monitoring (optional)
LOG_LEVEL=info
ENABLE_MONITORING=true
```

## Frontend (.env.production)
```bash
# Production API URL (update after deploying backend)
VITE_API_URL=https://your-api.railway.app

# Supabase Configuration (same as backend)
VITE_SUPABASE_URL=https://ckwgzoqzonvirauolakj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrd2d6b3F6b252aXJhdW9sYWtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyMjQwODMsImV4cCI6MjA1MTgwMDA4M30.Z7_OKi9dAhJ8VDTEpSxxrTqsKhcfJPqnVZcHgvHnEXI

# Environment
NODE_ENV=production

# Analytics (optional)
VITE_GA_TRACKING_ID=GA-XXXXXXXX-X
VITE_ENABLE_ANALYTICS=true
```

## Security Notes

### 🚨 CRITICAL: Change These Before Production!
1. **SESSION_SECRET**: Generate 256-character random string
2. **CSRF_SECRET**: Generate different 256-character random string  
3. **SUPABASE_SERVICE_KEY**: Get from Supabase dashboard (Settings > API)

### Generate Secure Secrets:
```bash
# Generate session secret (Node.js)
node -e "console.log(require('crypto').randomBytes(128).toString('base64'))"

# Or use online generator (save in password manager)
# https://passwordsgenerator.net/ - 256 characters
```

### Environment Variable Security:
- ✅ **Never commit** .env files to git
- ✅ **Use platform dashboards** to set env vars (Vercel/Railway/etc.)
- ✅ **Different secrets** for dev/staging/production
- ✅ **Regular rotation** of secrets (monthly)

## Platform-Specific Setup

### Vercel (Frontend)
1. Go to project dashboard → Settings → Environment Variables
2. Add all VITE_* variables
3. Set for "Production" environment

### Railway (Backend)  
1. Go to project dashboard → Variables
2. Add all environment variables
3. Deploy triggers automatically

### AWS EC2 (Manual)
1. SSH into EC2 instance
2. Create `/opt/app/.env` with production values
3. Set correct file permissions: `chmod 600 .env`
4. Use PM2 or systemd for process management