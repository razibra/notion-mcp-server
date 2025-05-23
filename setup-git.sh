#!/bin/bash

echo "==================================="
echo "Git & GitHub Setup for Notion MCP"
echo "==================================="
echo

# Function to prompt for input
prompt_for_input() {
    local prompt_text="$1"
    local var_name="$2"
    local default_value="$3"
    
    if [ -n "$default_value" ]; then
        read -p "$prompt_text [$default_value]: " input_value
        if [ -z "$input_value" ]; then
            eval "$var_name='$default_value'"
        else
            eval "$var_name='$input_value'"
        fi
    else
        read -p "$prompt_text: " input_value
        eval "$var_name='$input_value'"
    fi
}

# Step 1: Configure Git
echo "Step 1: Configuring Git"
echo "-----------------------"

# Check if git is already configured
current_name=$(git config --global user.name 2>/dev/null)
current_email=$(git config --global user.email 2>/dev/null)

if [ -n "$current_name" ] && [ -n "$current_email" ]; then
    echo "Git is already configured:"
    echo "  Name: $current_name"
    echo "  Email: $current_email"
    read -p "Do you want to update these settings? (y/N): " update_git
    
    if [[ $update_git =~ ^[Yy]$ ]]; then
        prompt_for_input "Enter your full name" git_name "$current_name"
        prompt_for_input "Enter your email" git_email "$current_email"
        git config --global user.name "$git_name"
        git config --global user.email "$git_email"
    fi
else
    prompt_for_input "Enter your full name" git_name
    prompt_for_input "Enter your email" git_email
    git config --global user.name "$git_name"
    git config --global user.email "$git_email"
fi

# Set other git configs
git config --global init.defaultBranch main
echo "✓ Git configured successfully"
echo

# Step 2: SSH Key Setup
echo "Step 2: SSH Key Setup"
echo "--------------------"

ssh_key_path="$HOME/.ssh/id_ed25519"

if [ -f "$ssh_key_path" ]; then
    echo "SSH key already exists at $ssh_key_path"
    read -p "Do you want to create a new key? (y/N): " create_new_key
    
    if [[ ! $create_new_key =~ ^[Yy]$ ]]; then
        echo "Using existing SSH key"
    else
        ssh-keygen -t ed25519 -C "$git_email" -f "$ssh_key_path"
    fi
else
    echo "Creating new SSH key..."
    ssh-keygen -t ed25519 -C "$git_email" -f "$ssh_key_path"
fi

# Start SSH agent and add key
echo "Starting SSH agent..."
eval "$(ssh-agent -s)" >/dev/null 2>&1
ssh-add "$ssh_key_path" >/dev/null 2>&1

echo
echo "Your public SSH key:"
echo "===================="
cat "${ssh_key_path}.pub"
echo "===================="
echo
echo "Copy the above key and add it to GitHub:"
echo "1. Go to https://github.com/settings/keys"
echo "2. Click 'New SSH key'"
echo "3. Paste the key and save"
echo
read -p "Press Enter when you've added the key to GitHub..."

# Test GitHub connection
echo
echo "Testing GitHub connection..."
ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"
if [ $? -eq 0 ]; then
    echo "✓ GitHub SSH connection successful!"
else
    echo "⚠ GitHub SSH connection failed. Please check your SSH key setup."
fi
echo

# Step 3: Initialize Git repository
echo "Step 3: Initialize Repository"
echo "----------------------------"

if [ -d .git ]; then
    echo "Git repository already initialized"
else
    git init
    echo "✓ Git repository initialized"
fi

# Add files
git add .
echo "✓ Files staged"

# Create initial commit
if git rev-parse HEAD >/dev/null 2>&1; then
    echo "Repository already has commits"
else
    git commit -m "Initial commit: Notion MCP Server

- Complete project structure
- TypeScript configuration
- MCP server boilerplate
- Documentation and examples
- Professional README"
    echo "✓ Initial commit created"
fi
echo

# Step 4: GitHub repository setup
echo "Step 4: GitHub Repository"
echo "------------------------"
prompt_for_input "Enter your GitHub username" github_username

echo
echo "Next steps:"
echo "1. Create a new repository on GitHub:"
echo "   https://github.com/new"
echo "   - Name: notion-mcp-server"
echo "   - Description: Model Context Protocol server for Notion integration"
echo "   - Public repository"
echo "   - DON'T initialize with README"
echo
echo "2. After creating, run these commands:"
echo
echo "   git remote add origin git@github.com:$github_username/notion-mcp-server.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo
echo "==================================="
echo "Setup complete!"
echo "===================================" 

# Make script executable
chmod +x setup-git.sh