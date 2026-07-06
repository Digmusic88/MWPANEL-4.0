#!/bin/bash

# MW Panel 2.0 - Automated Installation Script
# This script installs the complete MW Panel system with Docker

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Banner
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════╗"
echo "║         MW Panel 2.0 Installer           ║"
echo "║    School Management System Setup        ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root"
   exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install Docker
install_docker() {
    print_info "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    
    # Install Docker Compose
    print_info "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    # Start Docker service
    systemctl start docker
    systemctl enable docker
    
    print_success "Docker and Docker Compose installed successfully"
}

# Check prerequisites
print_info "Checking prerequisites..."

# Check Docker
if ! command_exists docker; then
    print_warning "Docker not found. Installing..."
    install_docker
else
    print_success "Docker is already installed"
fi

# Check Docker Compose
if ! command_exists docker-compose; then
    print_warning "Docker Compose not found. Installing..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    print_success "Docker Compose is already installed"
fi

# Check Git
if ! command_exists git; then
    print_info "Installing Git..."
    apt-get update && apt-get install -y git || yum install -y git
fi

# Get installation directory
read -p "Enter installation directory [/opt/mw-panel]: " INSTALL_DIR
INSTALL_DIR=${INSTALL_DIR:-/opt/mw-panel}

# Clone or update repository
if [ -d "$INSTALL_DIR" ]; then
    print_warning "Directory $INSTALL_DIR already exists"
    read -p "Do you want to update the existing installation? (y/n): " UPDATE
    if [[ $UPDATE =~ ^[Yy]$ ]]; then
        cd "$INSTALL_DIR"
        git pull origin main
    else
        print_error "Installation cancelled"
        exit 1
    fi
else
    print_info "Cloning MW Panel repository..."
    git clone https://github.com/your-organization/mw-panel.git "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# Configuration
print_info "Starting configuration..."

# Copy environment file
if [ ! -f .env ]; then
    cp .env.example .env
    print_info "Created .env file from template"
fi

# Configure environment variables
print_info "Please configure your environment settings:"
echo ""

# Domain configuration
read -p "Enter your domain name (e.g., panel.school.com): " DOMAIN
sed -i "s/DOMAIN=.*/DOMAIN=$DOMAIN/" .env

# SSL email
read -p "Enter email for SSL certificates: " SSL_EMAIL
sed -i "s/SSL_EMAIL=.*/SSL_EMAIL=$SSL_EMAIL/" .env

# Database password
read -sp "Enter database password (press Enter for random): " DB_PASSWORD
echo ""
if [ -z "$DB_PASSWORD" ]; then
    DB_PASSWORD=$(openssl rand -base64 32)
    print_info "Generated random database password"
fi
sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" .env

# JWT secrets
JWT_SECRET=$(openssl rand -base64 64)
JWT_REFRESH_SECRET=$(openssl rand -base64 64)
sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
sed -i "s/JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET/" .env

# Admin password
read -sp "Enter admin password (press Enter for default): " ADMIN_PASSWORD
echo ""
if [ ! -z "$ADMIN_PASSWORD" ]; then
    sed -i "s/ADMIN_PASSWORD=.*/ADMIN_PASSWORD=$ADMIN_PASSWORD/" .env
fi

# Create necessary directories
print_info "Creating directories..."
mkdir -p nginx/ssl
mkdir -p backend/uploads
mkdir -p backups

# Set permissions
chmod 600 .env
chmod +x scripts/*.sh

# Build and start containers
print_info "Building Docker containers..."
docker-compose build

print_info "Starting services..."
docker-compose up -d

# Wait for services to be ready
print_info "Waiting for services to be ready..."
sleep 30

# Run database migrations
print_info "Running database migrations..."
docker-compose exec -T backend npm run migration:run

# Seed initial data
print_info "Seeding initial data..."
docker-compose exec -T backend npm run seed:run

# Setup SSL certificates
if [ "$DOMAIN" != "localhost" ]; then
    print_info "Setting up SSL certificates..."
    docker-compose run --rm certbot certonly \
        --webroot --webroot-path=/usr/share/nginx/html \
        --email "$SSL_EMAIL" \
        --agree-tos \
        --no-eff-email \
        --force-renewal \
        -d "$DOMAIN"
    
    # Update nginx configuration for SSL
    sed -i "s/listen 443 ssl http2;/listen 443 ssl http2;/" nginx/nginx.conf
    docker-compose restart nginx
fi

# Setup automatic backups
print_info "Setting up automatic backups..."
BACKUP_CRON="0 2 * * * $INSTALL_DIR/scripts/backup.sh"
(crontab -l 2>/dev/null; echo "$BACKUP_CRON") | crontab -

# Create systemd service
print_info "Creating systemd service..."
cat > /etc/systemd/system/mw-panel.service <<EOF
[Unit]
Description=MW Panel School Management System
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
ExecReload=/usr/local/bin/docker-compose restart

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable mw-panel.service

# Display summary
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}       MW Panel Installation Completed Successfully!      ${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Installation Summary:${NC}"
echo -e "  • Installation directory: ${YELLOW}$INSTALL_DIR${NC}"
echo -e "  • Domain: ${YELLOW}https://$DOMAIN${NC}"
echo -e "  • Admin email: ${YELLOW}admin@mwpanel.com${NC}"
echo -e "  • Admin password: ${YELLOW}[Check your .env file]${NC}"
echo ""
echo -e "${BLUE}Services Status:${NC}"
docker-compose ps
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "  1. Access the application at: ${YELLOW}https://$DOMAIN${NC}"
echo -e "  2. Login with admin credentials"
echo -e "  3. Configure educational levels and competencies"
echo -e "  4. Create teachers and students accounts"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo -e "  • View logs: ${YELLOW}cd $INSTALL_DIR && docker-compose logs -f${NC}"
echo -e "  • Stop services: ${YELLOW}cd $INSTALL_DIR && docker-compose down${NC}"
echo -e "  • Start services: ${YELLOW}cd $INSTALL_DIR && docker-compose up -d${NC}"
echo -e "  • Backup database: ${YELLOW}$INSTALL_DIR/scripts/backup.sh${NC}"
echo ""
echo -e "${GREEN}Thank you for choosing MW Panel!${NC}"