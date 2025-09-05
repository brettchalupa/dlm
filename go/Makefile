# DLM Go Makefile

.PHONY: build clean test run dev install deps fmt lint check help

# Build variables
BINARY_NAME=dlm
BUILD_DIR=.
CMD_DIR=./cmd/dlm
GO_FILES=$(shell find . -name "*.go" -type f)

# Default target
all: build

# Build the binary
build: deps
	@echo "Building $(BINARY_NAME)..."
	go build -o $(BUILD_DIR)/$(BINARY_NAME) $(CMD_DIR)
	@echo "Build complete: $(BUILD_DIR)/$(BINARY_NAME)"

# Build for production with optimizations
build-prod: deps
	@echo "Building $(BINARY_NAME) for production..."
	CGO_ENABLED=1 go build -ldflags="-w -s" -o $(BUILD_DIR)/$(BINARY_NAME) $(CMD_DIR)
	@echo "Production build complete: $(BUILD_DIR)/$(BINARY_NAME)"

# Install dependencies
deps:
	@echo "Installing dependencies..."
	go mod tidy
	go mod download

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -f $(BUILD_DIR)/$(BINARY_NAME)
	rm -f dlm.db dlm.log dlm.yml
	rm -rf downloads/
	@echo "Clean complete"

# Run tests
test:
	@echo "Running tests..."
	go test -v ./...

# Run the application in development mode
dev: build
	@echo "Starting DLM in development mode..."
	./$(BINARY_NAME) serve --with-daemon

# Run the application
run: build
	@echo "Starting DLM..."
	./$(BINARY_NAME) serve

# Install the binary to system PATH
install: build-prod
	@echo "Installing $(BINARY_NAME) to /usr/local/bin..."
	sudo cp $(BUILD_DIR)/$(BINARY_NAME) /usr/local/bin/
	@echo "Installation complete"

# Format Go code
fmt:
	@echo "Formatting Go code..."
	go fmt ./...

# Lint Go code
lint:
	@echo "Linting Go code..."
	golangci-lint run ./...

# Check code quality (format + lint + test)
check: fmt lint test
	@echo "Code quality check complete"

# Initialize default configuration
init: build
	@echo "Creating default configuration..."
	./$(BINARY_NAME) init

# Show download counts
count: build
	@echo "Showing download counts..."
	./$(BINARY_NAME) count

# Add sample URLs for testing
sample: build
	@echo "Adding sample URLs..."
	./$(BINARY_NAME) add "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
	./$(BINARY_NAME) add "https://example.com/test.zip"

# Run daemon for testing
daemon: build
	@echo "Starting daemon (2 min intervals, 3 downloads per run)..."
	./$(BINARY_NAME) dd 2 3

# Build for multiple platforms
build-all: deps
	@echo "Building for multiple platforms..."
	GOOS=linux GOARCH=amd64 go build -o $(BUILD_DIR)/$(BINARY_NAME)-linux-amd64 $(CMD_DIR)
	GOOS=darwin GOARCH=amd64 go build -o $(BUILD_DIR)/$(BINARY_NAME)-darwin-amd64 $(CMD_DIR)
	GOOS=darwin GOARCH=arm64 go build -o $(BUILD_DIR)/$(BINARY_NAME)-darwin-arm64 $(CMD_DIR)
	GOOS=windows GOARCH=amd64 go build -o $(BUILD_DIR)/$(BINARY_NAME)-windows-amd64.exe $(CMD_DIR)
	@echo "Multi-platform build complete"

# Show help
help:
	@echo "DLM Go - Available Make targets:"
	@echo ""
	@echo "  build       - Build the binary"
	@echo "  build-prod  - Build optimized production binary"
	@echo "  build-all   - Build for multiple platforms"
	@echo "  deps        - Install dependencies"
	@echo "  clean       - Clean build artifacts and data"
	@echo "  test        - Run tests"
	@echo "  run         - Build and run the server"
	@echo "  dev         - Build and run with daemon"
	@echo "  install     - Install binary to system PATH"
	@echo "  fmt         - Format Go code"
	@echo "  lint        - Lint Go code"
	@echo "  check       - Run format, lint, and tests"
	@echo "  init        - Create default configuration"
	@echo "  count       - Show download counts"
	@echo "  sample      - Add sample URLs for testing"
	@echo "  daemon      - Run daemon for testing"
	@echo "  help        - Show this help message"
	@echo ""
	@echo "Examples:"
	@echo "  make build && ./dlm serve"
	@echo "  make dev"
	@echo "  make init && make sample && make count"
