# Create GitHub Repository

## The repository needs to be created on GitHub first!

### Option 1: Create via GitHub Website

1. Go to: https://github.com/new
2. Fill in:
   - **Repository name:** `notion-mcp-server`
   - **Description:** `Model Context Protocol server for Notion integration - read and write pages, databases, and more`
   - **Public** repository
   - ⚠️ **DON'T** check any initialization options (no README, .gitignore, or license)
3. Click **"Create repository"**

### Option 2: Create via GitHub CLI (if you have it)

```bash
gh repo create notion-mcp-server --public --description "Model Context Protocol server for Notion integration"
```

### After Creating the Repository

Once the repository is created, run:

```bash
cd /root/notion-mcp-server
git push -u origin main
```

### Alternative: Different Repository Name

If you want a different name, you can:

1. Create repo with your preferred name on GitHub
2. Update the remote:
   ```bash
   git remote set-url origin git@github.com:razbra/YOUR-REPO-NAME.git
   git push -u origin main
   ```

### Verify Remote

Check your current remote:
```bash
git remote -v
```

Should show:
```
origin  git@github.com:razbra/notion-mcp-server.git (fetch)
origin  git@github.com:razbra/notion-mcp-server.git (push)
```