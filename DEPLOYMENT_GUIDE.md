# Health Check and Monitoring Configuration

## Health Check Endpoints

### 1. Basic Health Check
```
GET /api/health
```
Returns server status, uptime, and timestamp.

### 2. Detailed Health Check
```
GET /api/health/detailed
```
Returns comprehensive system information including:
- Database connectivity
- Memory usage
- CPU usage
- Disk usage
- Response times

## Render Configuration

Add these to your Render service settings:

### Health Check Path
```
/api/health
```

### Health Check Interval
- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Unhealthy Threshold**: 3 failures

## Monitoring Setup

### 1. Render Built-in Monitoring
Render automatically monitors:
- Response times
- Error rates
- Memory usage
- CPU usage
- Request counts

Access via: Render Dashboard > Your Service > Metrics

### 2. Custom Alerts (Optional)

Add webhook notifications in Render:
1. Go to your service settings
2. Click "Notifications"
3. Add webhook URL for Slack/Discord/Email

### 3. Uptime Monitoring (Free Tools)

**UptimeRobot** (Free):
1. Sign up at https://uptimerobot.com
2. Add monitor:
   - Type: HTTP(s)
   - URL: https://your-app.onrender.com/api/health
   - Interval: 5 minutes
   - Alert contacts: Your email

**Better Uptime** (Free):
1. Sign up at https://betteruptime.com
2. Create monitor
3. Add your Render URL

### 4. Log Monitoring

View logs in Render:
```bash
# Real-time logs
Render Dashboard > Your Service > Logs

# Download logs
Render Dashboard > Your Service > Logs > Download
```

## Custom Domain Setup

### Step 1: Add Custom Domain in Render
1. Go to your service in Render Dashboard
2. Click on "Settings" tab
3. Scroll to "Custom Domains"
4. Click "Add Custom Domain"
5. Enter your domain: `api.feriwala.in`

### Step 2: Configure DNS Records

Add these DNS records in your domain provider (e.g., GoDaddy, Namecheap):

**For subdomain (Recommended):**
```
Type: CNAME
Name: api
Value: feriwala-backend.onrender.com
TTL: 3600
```

**For root domain (if needed):**
```
Type: A
Name: @
Value: [Render IP - shown in Render dashboard]
TTL: 3600
```

### Step 3: SSL Certificate
Render automatically provisions SSL certificates (Let's Encrypt) for custom domains.
- Usually takes 5-15 minutes
- Automatically renews

### Step 4: Update Backend Configuration

Update your backend `.env`:
```
BACKEND_URL=https://api.feriwala.in
CORS_ORIGIN=https://feriwala.in,https://www.feriwala.in
```

### Step 5: Update Frontend

Update frontend to use new API URL:
```javascript
const API_URL = 'https://api.feriwala.in';
```

## Environment Variables for Production

Make sure these are set in Render:

```bash
NODE_ENV=production
PORT=8080
DATABASE_URL=your_mongodb_url
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
SMTP_HOST=smtp.zoho.in
SMTP_PORT=587
SMTP_USER=verify@feriwala.in
SMTP_PASSWORD=your_password
FRONTEND_URL=https://www.feriwala.in
CORS_ORIGIN=https://feriwala.in,https://www.feriwala.in
BACKEND_URL=https://api.feriwala.in
```

## Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Render service created and connected to GitHub
- [ ] All environment variables configured
- [ ] Health check endpoint configured
- [ ] First deployment successful
- [ ] Health check passing (GET /api/health)
- [ ] Custom domain added in Render
- [ ] DNS records configured
- [ ] SSL certificate provisioned
- [ ] Uptime monitoring configured
- [ ] Alert notifications set up
- [ ] Frontend updated with new API URL

## Testing Your Deployment

### 1. Test Health Endpoint
```bash
curl https://your-app.onrender.com/api/health
```

### 2. Test API Endpoints
```bash
# Test auth
curl -X POST https://your-app.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Test products
curl https://your-app.onrender.com/api/products
```

### 3. Monitor Response Times
```bash
# Check detailed health
curl https://your-app.onrender.com/api/health/detailed
```

## Troubleshooting

### Deployment Failed
1. Check build logs in Render Dashboard
2. Verify all dependencies are in package.json
3. Check Node.js version compatibility

### Health Check Failing
1. Verify `/api/health` endpoint exists
2. Check application logs
3. Verify environment variables are set

### Slow Response Times
1. Free tier instances sleep after 15 min inactivity
2. Consider upgrading to paid tier for 24/7 uptime
3. Check database connection latency

## Performance Optimization

### 1. Enable HTTP/2
Already enabled by Render automatically

### 2. Compression
Already implemented in your Express app

### 3. Caching Headers
Add in your Express routes:
```javascript
res.set('Cache-Control', 'public, max-age=300');
```

### 4. Database Connection Pooling
Already configured in Prisma

## Security Checklist

- [x] HTTPS enabled (automatic with Render)
- [x] Helmet.js configured
- [x] CORS properly configured
- [x] Rate limiting enabled
- [x] Environment variables secured
- [x] JWT tokens properly configured
- [ ] Regular security audits with `npm audit`