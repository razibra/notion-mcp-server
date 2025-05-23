# Git & GitHub Setup Guide

## 1. Configure Git (Run these commands)

```bash
# Set your name and email
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Set default branch name to main
git config --global init.defaultBranch main

# Set up helpful aliases
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.st status

# Use VS Code as default editor (optional)
git config --global core.editor "code --wait"
```

## 2. Generate SSH Key for GitHub

```bash
# Generate a new SSH key
ssh-keygen -t ed25519 -C "your.email@example.com"

# When prompted:
# - Press Enter to accept default file location
# - Enter a passphrase (or leave empty)

# Start SSH agent
eval "$(ssh-agent -s)"

# Add SSH key to agent
ssh-add ~/.ssh/id_ed25519

# Copy public key to clipboard (Linux/WSL)
cat ~/.ssh/id_ed25519.pub
```

## 3. Add SSH Key to GitHub

1. Go to GitHub.com and sign in
2. Click your profile photo → Settings
3. Click "SSH and GPG keys" in the sidebar
4. Click "New SSH key"
5. Title: "MCP Development WSL" (or your preferred name)
6. Key type: Authentication Key
7. Paste your public key
8. Click "Add SSH key"

## 4. Test GitHub Connection

```bash
# Test SSH connection
ssh -T git@github.com

# You should see:
# Hi username! You've successfully authenticated...
```

## 5. Create GitHub Repository

### Option A: Via GitHub Website
1. Go to github.com/new
2. Repository name: `notion-mcp-server`
3. Description: "Model Context Protocol server for Notion integration"
4. Public repository
5. DON'T initialize with README (we already have one)
6. Click "Create repository"

### Option B: Via GitHub CLI
```bash
# Install GitHub CLI if needed
gh auth login
gh repo create notion-mcp-server --public --description "Model Context Protocol server for Notion integration"
```

## 6. Initialize and Push Local Repository

```bash
# Navigate to project
cd /root/notion-mcp-server

# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Notion MCP Server structure"

# Add remote (replace with your username)
git remote add origin git@github.com:YOUR_USERNAME/notion-mcp-server.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## 7. Set Up Development Workflow

```bash
# Create development branch
git checkout -b develop

# Make changes, then:
git add .
git commit -m "feat: add new feature"
git push origin develop

# Create pull request
gh pr create --title "Add new feature" --body "Description of changes"
```

## Common Git Commands

```bash
# Check status
git status

# View commit history
git log --oneline --graph

# Create new branch
git checkout -b feature/new-feature

# Switch branches
git checkout main

# Pull latest changes
git pull origin main

# Stash changes temporarily
git stash
git stash pop

# Undo last commit (keep changes)
git reset --soft HEAD~1

# View remote repositories
git remote -v
```

## Best Practices

1. **Commit Messages**: Use conventional commits
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation
   - `refactor:` Code refactoring
   - `test:` Adding tests
   - `chore:` Maintenance

2. **Branch Naming**:
   - `feature/description`
   - `fix/issue-description`
   - `docs/what-docs`

3. **Pull Requests**:
   - Keep them small and focused
   - Write clear descriptions
   - Request reviews

## Troubleshooting

### Permission Denied (publickey)
```bash
# Check if SSH key exists
ls -la ~/.ssh/

# Generate new key if needed
ssh-keygen -t ed25519 -C "your.email@example.com"

# Add to SSH agent
ssh-add ~/.ssh/id_ed25519
```

### Wrong Remote URL
```bash
# Check current remote
git remote -v

# Change to SSH URL
git remote set-url origin git@github.com:USERNAME/REPO.git
```