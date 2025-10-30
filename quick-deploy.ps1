# Quick Deploy Script for Feriwala Backend

Write-Host "🚀 Feriwala Backend - Quick Deploy Setup" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create GitHub Repository
Write-Host "📦 Step 1: Create GitHub Repository" -ForegroundColor Yellow
Write-Host ""
Write-Host "Run this command to create a new repository:" -ForegroundColor White
Write-Host ""
Write-Host "gh repo create feriwala-backend --public --description 'Feriwala E-commerce Backend API' --clone=false" -ForegroundColor Green
Write-Host ""
Write-Host "OR manually create at: https://github.com/new" -ForegroundColor Cyan
Write-Host "  - Repository name: feriwala-backend" -ForegroundColor White
Write-Host "  - Description: Feriwala E-commerce Backend API" -ForegroundColor White
Write-Host "  - Public repository" -ForegroundColor White
Write-Host ""

# Wait for user
Write-Host "Press Enter after creating the repository..." -ForegroundColor Yellow
Read-Host

# Step 2: Push Code
Write-Host ""
Write-Host "📤 Step 2: Pushing code to GitHub..." -ForegroundColor Yellow
Write-Host ""

$repoUrl = Read-Host "Enter your GitHub repository URL (e.g., https://github.com/akm47777/feriwala-backend.git)"

if ($repoUrl) {
    Write-Host "Updating remote URL..." -ForegroundColor Cyan
    git remote remove origin 2>$null
    git remote add origin $repoUrl
    
    Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
    git push -u origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Code pushed successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Push failed. Please check your credentials and try again." -ForegroundColor Red
        exit 1
    }
}

# Step 3: Deploy to Render
Write-Host ""
Write-Host "🌐 Step 3: Deploy to Render" -ForegroundColor Yellow
Write-Host ""
Write-Host "Now let's deploy to Render..." -ForegroundColor White
Write-Host ""
Write-Host "1. Open: https://dashboard.render.com/select-repo?type=web" -ForegroundColor Cyan
Write-Host "2. Click 'Connect' next to your 'feriwala-backend' repository" -ForegroundColor White
Write-Host "3. Configure:" -ForegroundColor White
Write-Host "   - Name: feriwala-backend" -ForegroundColor Gray
Write-Host "   - Branch: main" -ForegroundColor Gray
Write-Host "   - Build Command: npm install && npm run build" -ForegroundColor Gray
Write-Host "   - Start Command: npm start" -ForegroundColor Gray
Write-Host ""

Write-Host "Press Enter to see environment variables..." -ForegroundColor Yellow
Read-Host

# Step 4: Environment Variables
Write-Host ""
Write-Host "🔐 Step 4: Environment Variables" -ForegroundColor Yellow
Write-Host ""
Write-Host "Copy these environment variables to Render:" -ForegroundColor White
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$envVars = @"
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

JWT_EXPIRE=7d

JWT_REFRESH_EXPIRE=30d

BCRYPT_SALT_ROUNDS=12

SESSION_SECRET=feriwala-session-secret-2025

LOG_LEVEL=info
"@

Write-Host $envVars -ForegroundColor Green
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Copy to clipboard if available
try {
    $envVars | Set-Clipboard
    Write-Host "✅ Environment variables copied to clipboard!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Please copy the environment variables manually" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press Enter after adding environment variables in Render..." -ForegroundColor Yellow
Read-Host

# Step 5: Deploy
Write-Host ""
Write-Host "🚀 Step 5: Deploy!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Click 'Create Web Service' in Render" -ForegroundColor White
Write-Host "Wait 5-10 minutes for deployment to complete" -ForegroundColor Cyan
Write-Host ""

Write-Host "Press Enter when deployment is complete..." -ForegroundColor Yellow
Read-Host

# Step 6: Test
Write-Host ""
Write-Host "✅ Step 6: Test Your API" -ForegroundColor Yellow
Write-Host ""
$apiUrl = Read-Host "Enter your Render URL (e.g., https://feriwala-backend.onrender.com)"

if ($apiUrl) {
    Write-Host ""
    Write-Host "Testing health endpoint..." -ForegroundColor Cyan
    try {
        $response = Invoke-RestMethod -Uri "$apiUrl/api/health" -Method Get
        Write-Host "✅ API is healthy!" -ForegroundColor Green
        Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor White
    } catch {
        Write-Host "❌ Health check failed. Check Render logs." -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your API is now live at: $apiUrl" -ForegroundColor Cyan
Write-Host "Health Check: $apiUrl/api/health" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Update your frontend with the new API URL" -ForegroundColor White
Write-Host "  2. Set up monitoring at https://uptimerobot.com" -ForegroundColor White
Write-Host "  3. Configure custom domain (optional)" -ForegroundColor White
Write-Host ""