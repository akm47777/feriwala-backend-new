# One-Command Deploy Script
# This will guide you through creating a new GitHub repo and deploying to Render

param(
    [string]$githubUsername = "akm47777",
    [string]$repoName = "feriwala-backend"
)

$ErrorActionPreference = "Stop"

Write-Host @"

╔═══════════════════════════════════════════════╗
║   🚀 FERIWALA BACKEND DEPLOYMENT WIZARD 🚀   ║
╚═══════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

# Check if GitHub CLI is installed
Write-Host "Checking for GitHub CLI..." -ForegroundColor Yellow
$ghInstalled = Get-Command gh -ErrorAction SilentlyContinue

if ($ghInstalled) {
    Write-Host "✅ GitHub CLI found!" -ForegroundColor Green
    Write-Host ""
    
    # Option 1: Create repo with GH CLI
    Write-Host "Creating GitHub repository..." -ForegroundColor Cyan
    Write-Host "Repository: $githubUsername/$repoName" -ForegroundColor White
    Write-Host ""
    
    $confirm = Read-Host "Create repository now? (Y/n)"
    
    if ($confirm -ne 'n') {
        try {
            gh repo create $repoName --public --description "Feriwala E-commerce Backend API - Node.js, Express, MongoDB" --source=. --remote=origin --push
            Write-Host "✅ Repository created and code pushed!" -ForegroundColor Green
        } catch {
            Write-Host "⚠️  Automated creation failed. Creating manually..." -ForegroundColor Yellow
            Start-Process "https://github.com/new"
            Write-Host ""
            Write-Host "Please create the repository manually:" -ForegroundColor Yellow
            Write-Host "  1. Repository name: $repoName" -ForegroundColor White
            Write-Host "  2. Public repository" -ForegroundColor White
            Write-Host "  3. Don't initialize with README" -ForegroundColor White
            Write-Host ""
            Read-Host "Press Enter when repository is created"
            
            $repoUrl = "https://github.com/$githubUsername/$repoName.git"
            git remote remove origin 2>$null
            git remote add origin $repoUrl
            git push -u origin main
        }
    }
} else {
    Write-Host "ℹ️  GitHub CLI not installed" -ForegroundColor Yellow
    Write-Host "Opening GitHub to create repository..." -ForegroundColor Cyan
    Start-Process "https://github.com/new"
    
    Write-Host ""
    Write-Host "Create repository with these settings:" -ForegroundColor Yellow
    Write-Host "  - Name: $repoName" -ForegroundColor White
    Write-Host "  - Description: Feriwala E-commerce Backend API" -ForegroundColor White
    Write-Host "  - Public" -ForegroundColor White
    Write-Host "  - Don't initialize" -ForegroundColor White
    Write-Host ""
    
    Read-Host "Press Enter when repository is created"
    
    $repoUrl = "https://github.com/$githubUsername/$repoName.git"
    Write-Host "Pushing code to $repoUrl..." -ForegroundColor Cyan
    
    git remote remove origin 2>$null
    git remote add origin $repoUrl
    git push -u origin main
}

Write-Host ""
Write-Host "✅ Code is on GitHub!" -ForegroundColor Green
Write-Host ""

# Deploy to Render
Write-Host @"

╔═══════════════════════════════════════════════╗
║        🌐 DEPLOYING TO RENDER 🌐            ║
╚═══════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

Write-Host "Opening Render deployment page..." -ForegroundColor Yellow
Start-Process "https://dashboard.render.com/select-repo?type=web"

Write-Host ""
Write-Host "Follow these steps in Render:" -ForegroundColor White
Write-Host ""
Write-Host "1️⃣  Click 'Connect' next to '$repoName'" -ForegroundColor Cyan
Write-Host ""
Write-Host "2️⃣  Configure the service:" -ForegroundColor Cyan
Write-Host "   • Name: feriwala-backend" -ForegroundColor Gray
Write-Host "   • Branch: main" -ForegroundColor Gray
Write-Host "   • Build: npm install && npm run build" -ForegroundColor Gray
Write-Host "   • Start: npm start" -ForegroundColor Gray
Write-Host "   • Plan: Free" -ForegroundColor Gray
Write-Host ""
Write-Host "3️⃣  Click 'Advanced' and add environment variables" -ForegroundColor Cyan
Write-Host ""

Read-Host "Press Enter to copy environment variables to clipboard"

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

try {
    $envVars | Set-Clipboard
    Write-Host "✅ Environment variables copied to clipboard!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Paste them in Render's environment section" -ForegroundColor Yellow
} catch {
    Write-Host $envVars -ForegroundColor White
    Write-Host ""
    Write-Host "⚠️  Copy these variables manually" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "4️⃣  Click 'Create Web Service'" -ForegroundColor Cyan
Write-Host ""

Read-Host "Press Enter when deployment starts"

Write-Host ""
Write-Host "⏳ Deployment in progress..." -ForegroundColor Yellow
Write-Host "   This usually takes 5-10 minutes" -ForegroundColor Gray
Write-Host ""

Read-Host "Press Enter when deployment is complete"

Write-Host ""
Write-Host @"

╔═══════════════════════════════════════════════╗
║           🎉 DEPLOYMENT COMPLETE! 🎉        ║
╚═══════════════════════════════════════════════╝

"@ -ForegroundColor Green

$apiUrl = Read-Host "Enter your Render URL (e.g., https://feriwala-backend.onrender.com)"

if ($apiUrl) {
    Write-Host ""
    Write-Host "Testing API..." -ForegroundColor Cyan
    try {
        $health = Invoke-RestMethod -Uri "$apiUrl/api/health" -Method Get -TimeoutSec 30
        Write-Host "✅ API is healthy!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Status: $($health.status)" -ForegroundColor White
        Write-Host "Timestamp: $($health.timestamp)" -ForegroundColor White
    } catch {
        Write-Host "⚠️  Could not reach API. It might still be starting up." -ForegroundColor Yellow
        Write-Host "   Try again in a few minutes: $apiUrl/api/health" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "📝 Save these URLs:" -ForegroundColor Cyan
    Write-Host "   API: $apiUrl" -ForegroundColor White
    Write-Host "   Health: $apiUrl/api/health" -ForegroundColor White
    Write-Host "   GitHub: https://github.com/$githubUsername/$repoName" -ForegroundColor White
    Write-Host ""
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Update your frontend with the new API URL" -ForegroundColor White
Write-Host "2. Set up monitoring (recommended):" -ForegroundColor White
Write-Host "   https://uptimerobot.com" -ForegroundColor Gray
Write-Host "3. Configure custom domain (optional):" -ForegroundColor White
Write-Host "   Render Dashboard > Settings > Custom Domains" -ForegroundColor Gray
Write-Host ""
Write-Host "Deployment wizard complete! 🚀" -ForegroundColor Green
Write-Host ""