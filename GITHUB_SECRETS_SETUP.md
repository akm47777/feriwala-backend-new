# GitHub Secrets Setup Guide

## Required Secrets for GitHub Actions

To enable automated deployments, add this secret to your GitHub repository:

### Step 1: Get Render Deploy Hook URL

1. Go to your Render Dashboard
2. Select your `feriwala-backend` service
3. Go to "Settings" tab
4. Scroll to "Deploy Hooks"
5. Click "Create Deploy Hook"
6. Copy the URL (it looks like: `https://api.render.com/deploy/srv-xxxxx?key=yyyyy`)

### Step 2: Add Secret to GitHub

1. Go to your GitHub repository: https://github.com/akm47777/feriwala
2. Click "Settings" tab
3. Click "Secrets and variables" → "Actions"
4. Click "New repository secret"
5. Add:
   - **Name**: `RENDER_DEPLOY_HOOK_URL`
   - **Value**: [Paste the deploy hook URL from Render]
6. Click "Add secret"

### Step 3: Test Auto-Deploy

Make any small change and push:
```bash
cd backend-temp
echo "# Auto-deploy test" >> README.md
git add .
git commit -m "Test auto-deploy"
git push origin main
```

Watch the deployment:
- GitHub: Actions tab
- Render: Dashboard > Your Service > Events

## How It Works

1. You push code to `main` branch
2. GitHub Actions runs tests and build
3. If successful, triggers Render deploy hook
4. Render pulls latest code and deploys
5. You get notified of deployment status

## Deployment Status Badge

Add this to your README.md to show deployment status:

```markdown
![Deploy Status](https://github.com/akm47777/feriwala/actions/workflows/deploy.yml/badge.svg)
```

## Manual Deploy (Backup Method)

If auto-deploy fails, you can manually deploy:

### Via Render Dashboard:
1. Go to your service
2. Click "Manual Deploy"
3. Select "Deploy latest commit"

### Via Deploy Hook (curl):
```bash
curl -X POST https://api.render.com/deploy/srv-xxxxx?key=yyyyy
```

### Via GitHub Actions:
1. Go to Actions tab
2. Select "Deploy to Render" workflow
3. Click "Run workflow"
4. Select branch and run