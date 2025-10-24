# Crack CV Backend

Your CV buddy.

## Tech Stack

- **Framework**: NestJS (Node.js + TypeScript)
- **Database**: PostgreSQL with Prisma ORM
- **Feature Flags**: Unleash

## Prerequisites

- Node.js 20+ and npm
- Docker & Docker Compose (recommended)

## Quick Start

### Development Setup

```bash
# Clone the repository
git clone https://github.com/integral-x/crackcv-backend.git
cd crackcv-backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start the application in development mode
./start.sh

# To stop all services
./stop.sh
```

## Feature Flags

This project uses [Unleash](https://unleash.crackcv.com) for feature flag management.

See [developer guide](./UNLEASH_DEV_GUIDE.md) for documentation.

## Environment Variables

See `.env.example` for available environment variables. Copy the file to `.env` and update the values as needed.

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## API Documentation

API documentation is available via Swagger-UI at: [https://api.crackcv.com/api/v1/docs](https://api.crackcv.com/api/v1/docs)

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

Copyright (c) 2025 Smart CV Builder.
