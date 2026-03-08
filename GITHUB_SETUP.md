# GitHub Actions Setup - Todo App Deployment

Complete instructions for testing GitHub Actions deployment to Dokploy.

## Step 1: Generate SSH Key for GitHub Actions

```bash
cd ~/devel/todo-app

# Generate SSH key (no passphrase)
ssh-keygen -t ed25519 -f github-actions-key -N ""

# Verify keys were created
ls -la github-actions-key*
```

This creates:
- `github-actions-key` (private key - keep secret)
- `github-actions-key.pub` (public key - share with server)

## Step 2: Add Public Key to Dokploy Server

```bash
# Add public key to server's authorized_keys
cat github-actions-key.pub | ssh ubuntu@158.180.51.246 'cat >> ~/.ssh/authorized_keys'

# Test SSH works
ssh -i github-actions-key ubuntu@158.180.51.246 'echo "✓ SSH successful"'
```

## Step 3: Create GitHub Repository

Option A: Create via GitHub website:
1. Go to https://github.com/new
2. Enter repository name: `todo-app`
3. Make it **Public** (for GHCR access without extra config)
4. Click "Create repository"

Option B: Create via GitHub CLI:
```bash
gh repo create todo-app --public --source=. --push --remote=origin
```

## Step 4: Add GitHub Secrets

In GitHub repo: **Settings → Secrets and variables → Actions**

Click "New repository secret" and add these 4 secrets:

| Name | Value |
|------|-------|
| `DOKPLOY_HOST` | `158.180.51.246` |
| `DOKPLOY_USER` | `ubuntu` |
| `DOKPLOY_SSH_KEY` | Copy entire content of `github-actions-key` (private key) |
| `DOKPLOY_APP_NAME` | `todo-app` |

**How to copy private key:**
```bash
cat github-actions-key
# Copy entire output (including -----BEGIN... and -----END...)
# Paste into DOKPLOY_SSH_KEY secret
```

## Step 5: Push to GitHub

```bash
cd ~/devel/todo-app

# Add GitHub as remote
git remote add origin https://github.com/YOUR_USERNAME/todo-app.git
git branch -M main

# Push code
git push -u origin main
```

## Step 6: Watch GitHub Actions

1. Go to your repo on GitHub
2. Click **Actions** tab
3. See "Build & Deploy to Dokploy" workflow running
4. Watch real-time logs

Workflow steps:
- ✓ Checkout code (2s)
- ✓ Setup Docker Buildx (5s)
- ✓ Log in to Registry (2s)
- ✓ Build and push image (20-40s)
- ✓ Deploy to Dokploy (5-10s)
- ✓ Total: ~1 minute

## Step 7: Verify Deployment

```bash
# Check if container is running
ssh ubuntu@158.180.51.246 'sudo docker ps | grep todo'

# Check logs
ssh ubuntu@158.180.51.246 'sudo docker logs container-id'

# Visit the app
curl -k https://tasks.cessmedia.com
```

## Test Changes

Make a small change and push to test the workflow:

```bash
# Edit app.js or public/index.html
echo "// Test change" >> app.js

# Commit and push
git add .
git commit -m "Test deployment"
git push origin main

# Watch Actions tab for new workflow run
```

## Complete Test Checklist

- [ ] SSH key generated
- [ ] Public key added to server
- [ ] GitHub repository created
- [ ] 4 secrets added to repo
- [ ] Code pushed to main branch
- [ ] GitHub Actions workflow runs successfully
- [ ] Image pushed to ghcr.io
- [ ] Container running on server
- [ ] App accessible at https://tasks.cessmedia.com
- [ ] Made code change, pushed, and verified auto-deployment

## Troubleshooting

### "Permission denied (publickey)"
- SSH key not in server's authorized_keys
- Fix: `cat github-actions-key.pub | ssh ubuntu@158.180.51.246 'cat >> ~/.ssh/authorized_keys'`

### Workflow fails on "Deploy to Dokploy" step
- Private SSH key not in DOKPLOY_SSH_KEY secret (only public key pasted)
- Secret missing or misspelled
- Fix: Double-check all 4 secrets, ensure DOKPLOY_SSH_KEY has complete private key

### "dokploy-deploy: command not found"
- Deployment script not installed on server
- Fix: Already installed at `/usr/local/bin/dokploy-deploy`, should work

### Container not updated after push
- Image not pushed correctly
- App directory doesn't match DOKPLOY_APP_NAME
- Fix: Check GitHub Actions logs for errors

### Can't access app at domain
- Certificate not issued yet (can take 1-2 minutes)
- Try again after 2 minutes or check Traefik logs
- Fix: `ssh ubuntu@158.180.51.246 'sudo docker logs dokploy-traefik | tail -20'`

## Manual Test (Without GitHub)

To test deployment script manually:

```bash
ssh ubuntu@158.180.51.246 'dokploy-deploy todo-app ghcr.io/user/todo-app:test user password'
```

This will:
1. Pull image from ghcr.io
2. Update docker-compose.yml
3. Restart container

## Next Steps After Test

1. Celebrate working CI/CD! 🎉
2. Add more branches (develop, staging)
3. Add PR checks (lint, test)
4. Add deployment approvals
5. Monitor deployed app

## Files to Keep Secret

- `github-actions-key` (private key) - NEVER commit, add to .gitignore
- SSH_KEY secret value - Keep in GitHub secrets only

Files already in .gitignore:
```
github-actions-key
github-actions-key.pub
```

(Add these if you keep keys in repo)
