# 🚀 Feriwala Backend Deployment Checklist

## ✅ Completed

- [x] Backend code pushed to GitHub (https://github.com/akm47777/feriwala)
- [x] Render configuration file (render.yaml) created
- [x] GitHub Actions workflow configured
- [x] Health check endpoint configured
- [x] Documentation created (README, Deployment Guide)
- [x] All code committed and pushed

## 📋 Next Steps - Do These Now

### 1. Create Render Service (5 minutes)
1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect GitHub repository: `akm47777/feriwala`
4. Configure:
   - Name: `feriwala-backend`
   - Branch: `main`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
5. Add Environment Variables (copy from below)
6. Click **"Create Web Service"**

### 2. Add Environment Variables in Render

Copy and paste these in Render Dashboard > Environment:

```
DATABASE_URL=mongodb+srv://ankush454575_db_user:XXOL00U6rTCSpykt@cluster0.w6ggfhy.mongodb.net/feriwala?retryWrites=true&w=majority&appName=Cluster0

JWT_SECRET=feriwala-production-jwt-secret-key-2025

JWT_REFRESH_SECRET=feriwala-production-refresh-jwt-secret-key-2025

SMTP_PASSWORD=qe0YM2GN233s

NODE_ENV=production

PORT=8080

SMTP_HOST=smtp.zoho.in

SMTP_PORT=587

SMTP_USER=verify@feriwala.in

FRONTEND_URL=https://www.feriwala.in

CORS_ORIGIN=https://feriwala.in,https://www.feriwala.in

BACKEND_URL=https://www.feriwala.in/api
```

### 3. Wait for Deployment (5-10 minutes)
Watch the deployment logs in Render dashboard

### 4. Test Your API
Once deployed, test these URLs (replace with your actual Render URL):

```bash
# Health check
curl https://feriwala-backend.onrender.com/api/health

# Detailed health
curl https://feriwala-backend.onrender.com/api/health/detailed
```

### 5. Set Up Auto-Deploy (Optional, 2 minutes)
1. In Render Dashboard, go to Settings → Deploy Hooks
2. Click "Create Deploy Hook"
3. Copy the hook URL
4. Go to GitHub: Settings → Secrets → Actions
5. Add secret: `RENDER_DEPLOY_HOOK_URL` = [paste hook URL]

### 6. Configure Custom Domain (Optional, 10 minutes)
**In Render:**
1. Settings → Custom Domains
2. Add: `api.feriwala.in`

**In Your DNS Provider:**
Add CNAME record:
```
Type: CNAME
Name: api
Value: feriwala-backend.onrender.com
```

Wait 5-15 minutes for SSL certificate

### 7. Set Up Monitoring (Optional, 5 minutes)
**UptimeRobot (Free):**
1. Sign up: https://uptimerobot.com
2. Add monitor:
   - URL: https://feriwala-backend.onrender.com/api/health
   - Interval: 5 minutes
3. Add email alert

## 🎉 After Deployment

### Your API URLs will be:
- **Render URL**: `https://feriwala-backend.onrender.com`
- **Custom Domain** (if configured): `https://api.feriwala.in`

### Update Frontend
Update your frontend code to use the new backend URL:
```javascript
const API_URL = 'https://feriwala-backend.onrender.com';
// or
const API_URL = 'https://api.feriwala.in';
```

### Test Key Endpoints
```bash
# Register user
curl -X POST https://feriwala-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'

# Get products
curl https://feriwala-backend.onrender.com/api/products
```

## 📊 Monitoring & Logs

### View Logs
Render Dashboard → Your Service → Logs

### View Metrics
Render Dashboard → Your Service → Metrics

### Health Status
```bash
curl https://feriwala-backend.onrender.com/api/health
```

## ⚠️ Important Notes

1. **Free Tier Limitations:**
   - Sleeps after 15 minutes of inactivity
   - First request after sleep takes ~30 seconds
   - 750 hours/month free

2. **Security:**
   - Never commit `.env` files
   - Rotate secrets regularly
   - Monitor for suspicious activity

3. **Performance:**
   - Use database connection pooling (already configured)
   - Enable compression (already configured)
   - Consider upgrading for 24/7 uptime

## 🆘 Troubleshooting

### Deployment Failed
- Check Render build logs
- Verify all dependencies in package.json
- Check Node.js version

### Can't Connect to Database
- Verify DATABASE_URL in environment variables
- Check MongoDB Atlas network access
- Test connection string locally

### API Returns 500 Error
- Check Render logs
- Verify all environment variables are set
- Test locally with same .env values

## 📞 Support

- **GitHub Issues**: https://github.com/akm47777/feriwala/issues
- **Email**: verify@feriwala.in
- **Documentation**: Check README.md and DEPLOYMENT_GUIDE.md

---

## 🎯 Current Status

**Repository**: ✅ https://github.com/akm47777/feriwala
**Latest Commit**: f8ab1f5 - "Add comprehensive documentation and setup guides"
**Next Step**: Create Render service and deploy!

**Estimated Total Time**: 15-20 minutes

Good luck with your deployment! 🚀