#!/bin/bash

echo "=== Setting up JWT Translation ==="

echo -e "\n1. Installing jwks-rsa in backend service..."
cd backend-service
npm install jwks-rsa
cd ..

echo -e "\n2. Restarting services..."
echo "Please restart both gateway and backend services"

echo -e "\n=== Setup Complete ==="
echo "Now you can test with:"
echo "./test-jwt-translation.sh"
