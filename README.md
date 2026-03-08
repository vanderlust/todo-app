# Todo App - GitHub Actions + Dokploy Deployment

Simple todo list application with automatic deployment via GitHub Actions.

## Features

- ✓ Create, complete, and delete todos
- ✓ Clean, responsive UI
- ✓ SQLite database
- ✓ Auto-deploy on git push via GitHub Actions
- ✓ Automatic HTTPS with Let's Encrypt
- ✓ Traefik reverse proxy routing

## Local Development

```bash
npm install
npm start
# Visit http://localhost:3000
```

## Deployment

### Prerequisites
- GitHub repository
- Dokploy cluster (158.180.51.246)
- SSH key pair for GitHub Actions

### Step 1: Generate SSH Key

```bash
ssh-keygen -t ed25519 -f github-actions-key -N ""
```

### Step 2: Add Public Key to Server

```bash
cat github-actions-key.pub | ssh ubuntu@158.180.51.246 'cat >> ~/.ssh/authorized_keys'
```

### Step 3: Add GitHub Secrets

In your GitHub repo: **Settings → Secrets and variables → Actions**

```
DOKPLOY_HOST = 158.180.51.246
DOKPLOY_USER = ubuntu
DOKPLOY_SSH_KEY = (content of github-actions-key)
DOKPLOY_APP_NAME = todo-app
```

### Step 4: Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

GitHub Actions will automatically:
1. Build Docker image
2. Push to GitHub Container Registry
3. Deploy to Dokploy server
4. Restart container

### Access

Once deployed: `https://tasks.cessmedia.com`

## Workflow

```
git push → GitHub Actions builds image
→ Pushes to ghcr.io
→ SSHes to server
→ dokploy-deploy pulls & restarts
→ Live in 30-60 seconds
```

## API Endpoints

- `GET /api/todos` - List all todos
- `POST /api/todos` - Create todo
- `PATCH /api/todos/:id` - Toggle completion
- `DELETE /api/todos/:id` - Delete todo

## Files

```
.
├── app.js                 # Express server
├── Dockerfile            # Container image
├── docker-compose.yml    # Dokploy config
├── package.json          # Dependencies
├── public/
│   └── index.html        # Frontend
├── .github/
│   └── workflows/
│       └── deploy.yml    # GitHub Actions
└── README.md
```

## Troubleshooting

### GitHub Actions fails
- Check SSH key in secrets
- Verify server accepts SSH key: `ssh -i github-actions-key ubuntu@158.180.51.246 echo ok`

### Deployment doesn't update
- Check Actions log for errors
- Verify DOKPLOY_APP_NAME matches directory name
- Check registry credentials in workflow

### App doesn't start
- SSH to server: `sudo docker ps | grep todo`
- Check logs: `sudo docker logs container-id`

## License

MIT
