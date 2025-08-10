# Makefile for backlog-md development and deployment

.PHONY: help build deploy deploy-force deploy-local test clean install-deps

# Default target
help:
	@echo "Backlog.md Development Commands"
	@echo "================================"
	@echo ""
	@echo "Build commands:"
	@echo "  make build         Build the project"
	@echo "  make clean         Clean build artifacts"
	@echo ""
	@echo "Deployment commands:"
	@echo "  make deploy        Build and deploy to global installation (with confirmation)"
	@echo "  make deploy-force  Build and deploy to global installation (no confirmation)"
	@echo "  make deploy-local  Build locally only"
	@echo ""
	@echo "Development commands:"
	@echo "  make test          Run tests after deployment"
	@echo "  make install-deps  Install dependencies"
	@echo ""
	@echo "Quick commands:"
	@echo "  make quick         Build and force deploy (fastest)"
	@echo "  make dev           Build locally and test"

# Build the project
build:
	@echo "🔨 Building backlog-md..."
	@npm run build

# Clean build artifacts
clean:
	@echo "🧹 Cleaning build artifacts..."
	@rm -rf dist/
	@echo "✅ Clean complete"

# Deploy to global installation with confirmation
deploy: build
	@./deploy.sh --global

# Deploy to global installation without confirmation
deploy-force: build
	@./deploy.sh --global --force

# Build locally only
deploy-local: build
	@./deploy.sh --local

# Run tests after deployment
test: deploy
	@./deploy.sh --global --test

# Install dependencies
install-deps:
	@echo "📦 Installing dependencies..."
	@npm install
	@echo "✅ Dependencies installed"

# Quick deployment (most common use case)
quick: build
	@./deploy.sh --global --force
	@echo ""
	@echo "🚀 Quick deployment complete!"
	@echo "💡 Run 'backlog browser' to test the File Explorer feature"

# Development workflow
dev: build
	@echo "🔧 Development build complete"
	@echo "💡 Binary available at: ./dist/backlog"
	@echo "🧪 Test with: ./dist/backlog --version"