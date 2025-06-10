#!/bin/bash

# Test voedselinvoer zonder afbeelding
# Base64 encoded "testuser:test123"
AUTH_HEADER="Basic dGVzdHVzZXI6dGVzdDEyMwo="

curl -X POST http://localhost:3001/api/food-entries \
  -H "Content-Type: application/json" \
  -H "Authorization: $AUTH_HEADER" \
  -d '{
    "food_name": "appel",
    "quantity": 150,
    "meal_type": "snack"
  }'
