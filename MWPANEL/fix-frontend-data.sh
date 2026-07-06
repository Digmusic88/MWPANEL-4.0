#!/bin/bash

echo "🔧 FIXING FRONTEND DATA ISSUE"
echo "=============================="

# 1. Stop all containers
echo "1. Stopping all containers..."
docker-compose down

# 2. Remove problematic containers
echo "2. Cleaning up problematic containers..."
docker container prune -f
docker volume prune -f

# 3. Start only essential services
echo "3. Starting essential services..."
docker-compose up -d postgres redis

# 4. Wait for postgres
echo "4. Waiting for PostgreSQL..."
sleep 10

# 5. Start backend
echo "5. Starting backend..."
docker-compose up -d backend

# 6. Wait for backend
echo "6. Waiting for backend..."
sleep 15

# 7. Test backend connection
echo "7. Testing backend..."
if docker exec mw-panel-backend curl -s "http://localhost:3000/api/auth/health" | grep -q "ok"; then
    echo "✅ Backend is working"
else
    echo "❌ Backend is not responding"
    exit 1
fi

# 8. Start remaining services
echo "8. Starting remaining services..."
docker-compose up -d

echo ""
echo "✅ System restart complete!"
echo ""
echo "The issue is that frontend shows mock data instead of real database data."
echo "Frontend dropdowns should show:"
echo "📚 Real subjects: 'Lengua Castellana y Literatura', 'Matemáticas', etc."
echo "🎓 Real levels: 'Educación Infantil', 'Educación Primaria', 'Educación Secundaria'"
echo ""
echo "NOT mock data like: 'Asignatura 1', 'Nivel 1', etc."
echo ""
echo "If you still see mock data, the frontend is not calling the correct API endpoints."