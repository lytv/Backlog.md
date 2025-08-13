# Installation Scripts

This project includes several installation scripts to help you deploy your custom Backlog.md with Sprint Filter feature globally.

## 🚀 Quick Install (Recommended)

For a fast, no-fuss installation:

```bash
./quick-install.sh
```

This script:
- ✅ Builds the project
- ✅ Finds your existing backlog installation
- ✅ Replaces it with the new version
- ✅ No testing (faster)

## 🔧 Full Install with Testing

For a complete installation with feature testing:

```bash
./install.sh
```

This script:
- ✅ Builds the project
- ✅ Installs globally
- ✅ Tests the installation
- ✅ Verifies Sprint Filter feature
- ⚠️ May hang on some systems during testing

## 📦 Advanced Deployment

For more control over the deployment process:

```bash
./deploy.sh [options]
```

Options:
- `--global, -g`: Deploy to global installation (default)
- `--local, -l`: Build locally only
- `--test, -t`: Run tests after deployment
- `--force, -f`: Force deployment without confirmation
- `--help, -h`: Show help

Examples:
```bash
./deploy.sh                 # Build and deploy globally
./deploy.sh --local         # Build locally only
./deploy.sh --global --test # Deploy globally and run tests
./deploy.sh --force         # Deploy without confirmation
```

## 🎯 Simple Global Deploy

For a straightforward global deployment:

```bash
./deploy-global.sh
```

This script:
- ✅ Builds the project
- ✅ Deploys to global installation
- ✅ Tests the deployment
- ✅ Shows usage examples

## 📋 Prerequisites

Before running any installation script, make sure you have:

1. **Bun installed**: The scripts use `bun run build`
2. **Existing backlog installation**: Install via `brew install backlog-md` first
3. **Proper permissions**: Scripts may require `sudo` for global installation

## 🆕 Sprint Filter Features

After installation, you'll have access to:

### CLI Commands:
```bash
# View Kanban board filtered by sprint
backlog board --sprint "S01_M02_Database_Core_Models"

# Export filtered board to markdown
backlog board export --sprint "S01_M02_Database_Core_Models" sprint-board.md

# Export filtered board to README
backlog board export --readme --sprint "S01_M02_Database_Core_Models"
```

### Web UI:
```bash
# Start web interface with sprint dropdown filter
backlog browser --port 3000
```

## 🔍 Troubleshooting

### Installation hangs during testing
- Use `./quick-install.sh` instead (no testing)
- Or use `./deploy.sh --force` to skip confirmations

### Permission denied
- Make sure scripts are executable: `chmod +x *.sh`
- Scripts may need `sudo` for global installation

### Command not found after installation
- Check if backlog is in your PATH: `which backlog`
- Try restarting your terminal
- Verify installation: `backlog --version`

### Sprint filter not working
- Ensure your tasks have `sprint_source` field in frontmatter
- Check sprint files exist in `backlog/sprints/` directory
- Verify sprint titles match exactly

## 📚 More Information

For detailed usage of Sprint Filter features, see the main README or run:
```bash
backlog --help
backlog board --help
```