# 🔧 Development Setup

## Local Development

### Prerequisites
- Node.js 22+
- pnpm
- Docker Desktop
- PostgreSQL (via Docker)

### Step 1: Database Setup

**Start Docker Desktop first!**

Then run database:
```bash
docker-compose up -d db
```

Wait for database to be healthy (5-10 seconds), then run migrations:
```bash
pnpm prisma migrate deploy
# or for development
pnpm prisma migrate dev
```

### Step 2: Environment Variables

Create `.env` file:
```env
# Local development
DATABASE_URL="postgresql://postgres:durdona56@localhost:5434/durdona2?schema=public"
TELEGRAM_BOT_TOKEN=your_bot_token_here
SUPERADMIN_ID=your_telegram_id
PORT=3002
```

### Step 3: Install Dependencies
```bash
pnpm install
```

### Step 4: Run Development Server
```bash
pnpm run start:dev
```

---

## 🚀 Production Deployment (Server)

### Step 1: Clone Repository
```bash
cd ~
git clone your_repo_url durdon_bot
cd durdon_bot
```

### Step 2: Create `.env` File
```bash
nano .env
```

Add this (for Docker deployment):
```env
DATABASE_URL="postgresql://postgres:durdona56@db:5432/durdona2?schema=public"
TELEGRAM_BOT_TOKEN=your_bot_token_here
SUPERADMIN_ID=your_telegram_id
PORT=3002
```

### Step 3: Deploy
```bash
docker-compose up --build -d
```

### Step 4: Check Logs
```bash
docker-compose logs -f app
```

---

## 📝 Important Notes

### Database URLs:
- **Local development**: `localhost:5434` (external Docker port)
- **Docker production**: `db:5432` (internal Docker network)

### Commands:
```bash
# Start only database (for local dev)
docker-compose up -d db

# Start full stack (for production)
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up --build -d

# Generate Prisma Client
pnpm prisma generate

# Run migrations
pnpm prisma migrate deploy

# Create new migration
pnpm prisma migrate dev --name migration_name
```

### Troubleshooting:

**Can't reach database server:**
- Make sure Docker Desktop is running
- Check if database container is healthy: `docker ps`
- Verify DATABASE_URL in .env matches your setup (localhost vs db)

**Migration errors:**
- Reset database: `docker-compose down -v` then `docker-compose up -d db`
- Run migrations again: `pnpm prisma migrate deploy`
