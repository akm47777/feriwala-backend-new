# Simple Deployment Wizard for Feriwala Backend
# Run this script to deploy your backend in one go!

param(
    [string]$githubUsername = "akm47777",
    [string]$repoName = "feriwala-backend-new"
)

Clear-Host
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  FERIWALA BACKEND DEPLOYMENT" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create GitHub Repository
Write-Host "Step 1: Create GitHub Repository" -ForegroundColor Yellow
Write-Host "--------------------------------" -ForegroundColor Yellow
Write-Host ""

# Check if gh CLI is available
if (Get-Command gh -ErrorAction SilentlyContinue) {
    Write-Host "GitHub CLI detected!" -ForegroundColor Green
    $useGH = Read-Host "Use GitHub CLI to create repo? (Y/n)"
    
    if ($useGH -ne 'n') {
        Write-Host "Creating repository..." -ForegroundColor Cyan
        try {
            gh repo create $repoName --public --description "Feriwala Backend API" --source=. --remote=origin --push
            Write-Host "Repository created and code pushed!" -ForegroundColor Green
        } catch {
            Write-Host "Failed to create via CLI. Opening browser..." -ForegroundColor Yellow
            Start-Process "https://github.com/new"
            Write-Host "Create repo manually, then press Enter"
            Read-Host
            
            git remote remove origin 2>$null
            git remote add origin "https://github.com/$githubUsername/$repoName.git"
            git push -u origin main
        }
    }
} else {
    Write-Host "Opening GitHub..." -ForegroundColor Cyan
    Start-Process "https://github.com/new"
    Write-Host ""
    Write-Host "Create a new repository:" -ForegroundColor White
    Write-Host " - Name: $repoName" -ForegroundColor Gray
    Write-Host " - Public repository" -ForegroundColor Gray
    Write-Host " - Do NOT initialize" -ForegroundColor Gray
    Write-Host ""
    Read-Host "Press Enter when created"
    
    Write-Host "Pushing code..." -ForegroundColor Cyan
    git remote remove origin 2>$null
    git remote add origin "https://github.com/$githubUsername/$repoName.git"
    git push -u origin main
}

Write-Host ""
Write-Host "Code is on GitHub!" -ForegroundColor Green
Write-Host ""

# Step 2: Deploy to Render
Write-Host "Step 2: Deploy to Render" -ForegroundColor Yellow
Write-Host "-------------------------" -ForegroundColor Yellow
Write-Host ""

Write-Host "Opening Render..." -ForegroundColor Cyan
Start-Process "https://dashboard.render.com/select-repo?type=web"

Write-Host ""
Write-Host "In Render:" -ForegroundColor White
Write-Host "1. Click Connect next to your repository" -ForegroundColor Gray
Write-Host "2. Configure:" -ForegroundColor Gray
Write-Host "   Name: feriwala-backend" -ForegroundColor Gray
Write-Host "   Build: npm install && npm run build" -ForegroundColor Gray
Write-Host "   Start: npm start" -ForegroundColor Gray
Write-Host ""

Read-Host "Press Enter to copy environment variables"

# Environment variables
$env = @"
DATABASE_URL=mongodb+srv://ankush454575_db_user:XXOL00U6rTCSpykt@cluster0.w6ggfhy.mongodb.net/feriwala
JWT_SECRET=feriwala-production-jwt-secret-key-2025
JWT_REFRESH_SECRET=feriwala-production-refresh-jwt-secret-key-2025
SMTP_PASSWORD=qe0YM2GN233s
NODE_ENV=production
PORT=8080
"@

try {
    $env | Set-Clipboard
    Write-Host "Environment variables copied!" -ForegroundColor Green
} catch {
    Write-Host $env
    Write-Host ""
    Write-Host "Copy these manually" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "3. Add environment variables" -ForegroundColor Gray
Write-Host "4. Click Create Web Service" -ForegroundColor Gray
Write-Host ""

Read-Host "Press Enter when deployment complete"

# Step 3: Test
Write-Host ""
Write-Host "Step 3: Test API" -ForegroundColor Yellow
Write-Host "----------------" -ForegroundColor Yellow
Write-Host ""

$url = Read-Host "Enter your Render URL"

if ($url) {
    Write-Host "Testing..." -ForegroundColor Cyan
    try {
        $result = Invoke-RestMethod -Uri "$url/api/health"
        Write-Host "API is working!" -ForegroundColor Green
        Write-Host "Status: $($result.status)" -ForegroundColor White
    } catch {
        Write-Host "Could not reach API yet" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your API: $url" -ForegroundColor White
Write-Host "Health: $url/api/health" -ForegroundColor White
Write-Host ""
Write-Host "Next: Update frontend with API URL" -ForegroundColor Yellow
Write-Host ""