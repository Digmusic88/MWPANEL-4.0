#!/bin/bash

# Educational Resources Module Setup Script for MW Panel
# This script helps configure the Google Drive integration for educational resources

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/backend/.env"

echo "======================================"
echo "MW Panel - Educational Resources Setup"
echo "======================================"
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    print_error ".env file not found at $ENV_FILE"
    echo "Please create the .env file first by copying .env.example"
    exit 1
fi

# Function to check if a variable exists in .env
check_env_var() {
    local var_name=$1
    if grep -q "^$var_name=" "$ENV_FILE"; then
        return 0
    else
        return 1
    fi
}

# Function to add or update env variable
set_env_var() {
    local var_name=$1
    local var_value=$2
    
    if check_env_var "$var_name"; then
        # Update existing variable
        sed -i.bak "s|^$var_name=.*|$var_name=$var_value|" "$ENV_FILE"
    else
        # Add new variable
        echo "" >> "$ENV_FILE"
        echo "$var_name=$var_value" >> "$ENV_FILE"
    fi
}

echo "1. Checking current configuration..."
echo

# Check Google Drive configuration
if check_env_var "GOOGLE_SERVICE_ACCOUNT_EMAIL"; then
    print_success "Google Service Account Email is configured"
else
    print_warning "Google Service Account Email is not configured"
fi

if check_env_var "GOOGLE_PRIVATE_KEY"; then
    print_success "Google Private Key is configured"
else
    print_warning "Google Private Key is not configured"
fi

echo
echo "2. Google Cloud Service Account Setup"
echo "====================================="
echo
echo "To use the Educational Resources module, you need a Google Cloud Service Account."
echo
echo "Steps to create one:"
echo "1. Go to https://console.cloud.google.com"
echo "2. Create or select a project"
echo "3. Enable Google Drive API"
echo "4. Create a Service Account"
echo "5. Download the JSON key file"
echo
read -p "Do you have a Service Account JSON key file? (y/n): " has_key

if [ "$has_key" = "y" ] || [ "$has_key" = "Y" ]; then
    read -p "Enter the path to your Service Account JSON key file: " key_file_path
    
    if [ -f "$key_file_path" ]; then
        print_success "Key file found"
        
        # Extract email and private key from JSON
        SERVICE_ACCOUNT_EMAIL=$(grep -o '"client_email": "[^"]*' "$key_file_path" | grep -o '[^"]*$')
        PRIVATE_KEY=$(grep -o '"private_key": "[^"]*' "$key_file_path" | sed 's/"private_key": "//')
        
        # The private key needs special handling for newlines
        PRIVATE_KEY=$(echo "$PRIVATE_KEY" | sed 's/\\n/\\\\n/g')
        
        echo
        echo "Service Account Email: $SERVICE_ACCOUNT_EMAIL"
        echo
        read -p "Do you want to configure these credentials? (y/n): " configure_creds
        
        if [ "$configure_creds" = "y" ] || [ "$configure_creds" = "Y" ]; then
            set_env_var "GOOGLE_SERVICE_ACCOUNT_EMAIL" "$SERVICE_ACCOUNT_EMAIL"
            set_env_var "GOOGLE_PRIVATE_KEY" "\"$PRIVATE_KEY\""
            print_success "Credentials configured successfully"
        fi
    else
        print_error "Key file not found at $key_file_path"
    fi
fi

echo
echo "3. Google Drive Shared Drive Configuration"
echo "=========================================="
echo
echo "The Educational Resources module stores files in a Google Drive shared drive."
echo "Default name: '12. Plataforma (Recursos dicácticos compartidos)'"
echo
read -p "Use default shared drive name? (y/n): " use_default_drive

if [ "$use_default_drive" = "n" ] || [ "$use_default_drive" = "N" ]; then
    read -p "Enter your shared drive name: " drive_name
    set_env_var "GOOGLE_SHARED_DRIVE_NAME" "\"$drive_name\""
else
    set_env_var "GOOGLE_SHARED_DRIVE_NAME" "\"12. Plataforma (Recursos dicácticos compartidos)\""
fi

echo
echo "4. Educational Resources Configuration"
echo "======================================"
echo

# Academic Year
current_year=$(date +%Y)
next_year=$((current_year + 1))
default_academic_year="$current_year-$next_year"

read -p "Current academic year [$default_academic_year]: " academic_year
academic_year=${academic_year:-$default_academic_year}
set_env_var "CURRENT_ACADEMIC_YEAR" "$academic_year"

# Other configurations
set_env_var "AUTO_CREATE_FOLDERS" "true"
set_env_var "ARCHIVE_OLD_RESOURCES" "true"

# File size limits
echo
echo "Setting default file size limits..."
set_env_var "MAX_FILE_SIZE_PDF" "52428800"       # 50MB
set_env_var "MAX_FILE_SIZE_VIDEO" "524288000"    # 500MB
set_env_var "MAX_FILE_SIZE_IMAGE" "10485760"     # 10MB
set_env_var "MAX_FILE_SIZE_HTML" "5242880"       # 5MB
set_env_var "MAX_FILE_SIZE_DOCUMENT" "20971520"  # 20MB

# Upload configuration
set_env_var "UPLOAD_CHUNK_SIZE" "5242880"        # 5MB chunks
set_env_var "CONCURRENT_CHUNKS" "3"              # Parallel chunks

# Notifications
set_env_var "NOTIFY_ON_NEW_RESOURCE" "true"
set_env_var "NOTIFY_ON_ASSIGNMENT" "true"

print_success "Configuration completed"

echo
echo "5. Database Migration"
echo "===================="
echo
read -p "Do you want to run the database migration now? (y/n): " run_migration

if [ "$run_migration" = "y" ] || [ "$run_migration" = "Y" ]; then
    cd "$PROJECT_ROOT"
    
    if docker-compose ps | grep -q "backend.*Up"; then
        echo "Running migration..."
        docker-compose exec backend npm run migration:run
        print_success "Migration completed"
    else
        print_error "Backend container is not running"
        echo "Please start the backend first: docker-compose up -d"
    fi
fi

echo
echo "6. System Restart"
echo "================="
echo
read -p "Do you want to restart the system now? (y/n): " restart_system

if [ "$restart_system" = "y" ] || [ "$restart_system" = "Y" ]; then
    cd "$PROJECT_ROOT"
    echo "Restarting MW Panel..."
    docker-compose down
    docker-compose up -d
    
    echo
    echo "Waiting for services to start..."
    sleep 10
    
    # Check if backend started successfully
    if docker-compose ps | grep -q "backend.*Up"; then
        print_success "Backend is running"
        
        # Check logs for Google Drive connection
        echo
        echo "Checking Google Drive connection..."
        if docker-compose logs backend | grep -q "Connected to shared drive"; then
            print_success "Google Drive connection successful!"
        else
            print_warning "Could not verify Google Drive connection"
            echo "Check logs with: docker-compose logs backend"
        fi
    else
        print_error "Backend failed to start"
        echo "Check logs with: docker-compose logs backend"
    fi
fi

echo
echo "======================================"
echo "Setup Complete!"
echo "======================================"
echo
echo "Next steps:"
echo "1. Add your Service Account email to the shared drive with 'Organizer' role"
echo "2. Access MW Panel and navigate to Educational Resources"
echo "3. Upload a test file to verify everything works"
echo
echo "For troubleshooting, check:"
echo "- Logs: docker-compose logs backend"
echo "- Documentation: /opt/mw-panel/EDUCATIONAL_RESOURCES_SETUP.md"
echo

# Clean up backup files
rm -f "$ENV_FILE.bak"