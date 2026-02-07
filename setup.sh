#!/bin/bash

# Telegram Warehouse Bot - Setup Script

echo "📦 TELEGRAM WAREHOUSE BOT - SETUP"
echo "=================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env fayl topilmadi!"
    echo ""
    echo "Iltimos .env fayl yarating va quyidagilarni kiriting:"
    echo ""
    echo "DATABASE_URL=\"postgresql://username:password@localhost:5432/durdon_bot?schema=public\""
    echo "TELEGRAM_BOT_TOKEN=\"your_bot_token_here\""
    echo "SUPERADMIN_ID=\"your_telegram_id\""
    echo "PORT=3000"
    echo ""
    exit 1
fi

echo "✅ .env fayl topildi"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📥 Dependencies o'rnatilmoqda..."
    pnpm install
    echo ""
fi

# Run Prisma migrations
echo "🔄 Database migratsiya..."
npx prisma migrate dev --name init

# Generate Prisma Client
echo "⚙️ Prisma Client generatsiya..."
npx prisma generate

echo ""
echo "✅ Setup tugallandi!"
echo ""
echo "🚀 Botni ishga tushirish uchun:"
echo "   pnpm start:dev"
echo ""
echo "📊 Database studio ochish uchun:"
echo "   npx prisma studio"
echo ""
