#!/bin/bash
set -e

echo "Starting database migrations..."
npm run db:deploy

echo "Starting NestJS server..."
npm run start:dev