# HTTPS Deployment Guide for OWASP-Web

## Current Status
- **Development**: HTTP only (`http://localhost`)
- **Supabase**: Already HTTPS ✅ (`https://ckwgzoqzonvirauolakj.supabase.co`)
- **Production**: Ready for HTTPS deployment

## Deployment Options

### 1. Recommended: Vercel (Frontend) + Railway (Backend)

#### Frontend (React) → Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from frontend directory
cd frontend
vercel

# Configure environment variables in Vercel dashboard:
# VITE_SUPABASE_URL=https://ckwgzoqzonvirauolakj.supabase.co  
# VITE_SUPABASE_ANON_KEY=your_anon_key
```

**Result**: `https://your-app.vercel.app` (Automatic HTTPS, TLS 1.3)

#### Backend (Node.js) → Railway
```bash
# Install Railway CLI
npm i -g @railway/cli

# Deploy from backend directory  
cd backend
railway login
railway init
railway up

# Configure environment variables in Railway dashboard:
# NODE_ENV=production
# FRONTEND_URL=https://your-app.vercel.app
# SUPABASE_URL=https://ckwgzoqzonvirauolakj.supabase.co
# (+ all other env vars)
```

**Result**: `https://your-api.railway.app` (Automatic HTTPS, TLS 1.2/1.3)

### 2. AWS EC2 with Application Load Balancer

#### Setup Steps:
1. **Launch EC2 instance** (Ubuntu/Amazon Linux)
2. **Create Application Load Balancer (ALB)**
3. **Get SSL certificate from AWS Certificate Manager**
4. **Configure ALB to terminate HTTPS**

#### Architecture:
```
Internet → HTTPS → ALB → HTTP → EC2 (Your App)
```

**HTTPS Version**: TLS 1.2/1.3 (configurable in ALB)
**Cost**: ~$16/month (t3.micro) + $18/month (ALB)

### 3. Alternative: Render/Netlify

#### Render (Full-stack)
- **Frontend + Backend**: Single deployment
- **Automatic HTTPS**: TLS 1.3
- **Free tier**: Available

#### Netlify (Frontend only)
- **Static React app**: Perfect fit
- **Automatic HTTPS**: TLS 1.3  
- **Edge functions**: For serverless backend

## Security Configuration Ready ✅

Your app is now configured to automatically:
- ✅ Enable secure cookies in production
- ✅ Use strict SameSite policy in production  
- ✅ Enforce HTTPS with HSTS headers
- ✅ Redirect HTTP to HTTPS in production

## Quick Production Checklist

1. **Change secrets in production .env**:
   ```
   SESSION_SECRET=your-production-secret-256-chars
   CSRF_SECRET=your-production-csrf-secret-256-chars
   ```

2. **Update CORS origins**:
   ```javascript
   origin: process.env.FRONTEND_URL || 'https://your-app.vercel.app'
   ```

3. **Test HTTPS**:
   - Check SSL certificate validity
   - Verify TLS version (should be 1.2+)
   - Test all API endpoints work over HTTPS

## Recommended Choice: Vercel + Railway

**Why?**
- ✅ **Automatic HTTPS** (no configuration needed)
- ✅ **Latest TLS 1.3** (best security)
- ✅ **Free tiers** available
- ✅ **Perfect for React + Node.js + Supabase**
- ✅ **Global CDN**
- ✅ **Easy deployment** (git-based)
- ✅ **Auto SSL renewal**

**Total Cost**: $0 (free tiers) to $20/month (pro features)
**vs AWS EC2**: $34/month minimum + complexity