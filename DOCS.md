# 📦 TELEGRAM WAREHOUSE BOT

Telegram bot tizimi ombor mahsulotlarini boshqarish va buyurtmalarni qayta ishlash uchun.

## 🚀 Tech Stack

- **Backend:** NestJS
- **Bot Framework:** Grammy
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Language:** TypeScript

## ⚙️ O'rnatish

### 1. Loyihani klonlash

```bash
git clone <repository-url>
cd durdon_bot
```

### 2. Dependencies o'rnatish

```bash
pnpm install
```

### 3. Environment variables sozlash

`.env` fayl yarating va quyidagilarni qo'shing:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/durdon_bot?schema=public"
TELEGRAM_BOT_TOKEN="your_bot_token_here"
SUPERADMIN_ID="your_telegram_id"
PORT=3000
```

**Qanday qilib Telegram Bot Token olish:**
1. Telegram'da [@BotFather](https://t.me/botfather) botiga o'ting
2. `/newbot` komandasini yuboring
3. Bot nomi va username'ini kiriting
4. Token'ni oling va `.env` fayliga qo'shing

**Telegram ID'ingizni bilish:**
1. [@userinfobot](https://t.me/userinfobot) botiga o'ting
2. Sizning ID'ingizni ko'rishingiz mumkin

### 4. Database migratsiyasi

```bash
npx prisma migrate dev
```

### 5. Botni ishga tushirish

```bash
pnpm start:dev
```

## 📊 DATABASE SCHEMA

### User
- `id` - Unique ID
- `telegramId` - Telegram user ID
- `username` - Telegram username
- `fullName` - To'liq ism
- `role` - SUPERADMIN | ADMIN | USER

### Product
- `id` - Unique ID
- `name` - Mahsulot nomi
- `quantity` - Ombordagi miqdor

### Faculty
- `id` - Unique ID
- `name` - Fakultet nomi

### Order
- `id` - Unique ID
- `userId` - User ID
- `productId` - Mahsulot ID
- `facultyId` - Fakultet ID
- `comment` - Izoh
- `wanted` - So'ralgan miqdor
- `given` - Berilgan miqdor
- `missing` - Yetmagan miqdor
- `status` - PENDING | READY | COMPLETED | CANCELLED

## 👤 USER FLOW

### 1. Bot boshlash
```
User: /start
Bot: "Xush kelibsiz!"
      [🛒 Do'konga kirish]
```

### 2. Mahsulotlarni ko'rish
```
User: [🛒 Do'konga kirish]
Bot: Mahsulotlar ro'yxati:
     📦 Futbolka — 120 ta
     📦 Daftar — 40 ta
     📦 Ruchka — 5 ta
```

### 3. Buyurtma berish
```
User: [Mahsulot tanlash]
Bot: "Qaysi fakultet?"

User: [Fakultet tanlash]
Bot: "Izoh kiriting"

User: "Talabalar uchun"
Bot: "Nechta kerak?"

User: "60"
Bot: Buyurtma tasdiqlanadi
```

### 4. AUTO-PARTIAL SYSTEM

#### Agar yetarli bo'lsa:
```
Omborda: 100 ta
User: 60 ta so'radi

Natija:
✅ 60 ta buyurtma tayyor
📉 Stock: 100 → 40
```

#### Agar yetarli bo'lmasa:
```
Omborda: 40 ta
User: 60 ta so'radi

Natija:
✅ 40 ta darhol beriladi
📌 20 ta keyinroq beriladi
📉 Stock: 40 → 0

User'ga xabar:
"Siz 60 ta so'radingiz
Omborda faqat 40 ta mavjud

✅ 40 ta buyurtmangiz tayyor holatda
📌 Qolgan 20 ta keyin beriladi"
```

## 👨‍💼 ADMIN PANEL

### Admin huquqlari:

#### 📦 Mahsulot boshqaruvi:
- ➕ Yangi mahsulot qo'shish
- 📝 Stock yangilash (+100, -50, yoki aniq son)
- 🗑 Mahsulot o'chirish

#### 🧾 Buyurtmalar:
- Barcha buyurtmalarni ko'rish
- Buyurtma ma'lumotlari:
  - User
  - Mahsulot
  - Fakultet
  - Izoh
  - So'ralgan / Berilgan / Yetmagan
  - Sana
- ✔️ Buyurtmalarni tugallash

#### 🏫 Fakultet boshqaruvi:
- ➕ Fakultet qo'shish
- 🗑 Fakultet o'chirish

#### 👥 Admin boshqaruvi (faqat SUPERADMIN):
- ➕ Yangi admin qo'shish
- Adminlar ro'yxati

### Stock yangilash misoli:
```
Admin: [Mahsulot tanlash]
Bot: "Hozirgi stock: 40 ta
      Yangi miqdorni kiriting"

Admin: "+100" → 40 → 140
Admin: "-20"  → 140 → 120
Admin: "200"  → 120 → 200
```

## 🔔 REAL-TIME XABARLAR

### User buyurtma beradi:
- ✅ User'ga tasdiqlash xabari
- 🔔 Barcha adminlarga yangi buyurtma haqida xabar

### Admin stock qo'shadi:
- 🔔 Kutayotgan user'larga xabar yuboriladi

## 🔐 ROLE SYSTEM

### Rollar:

#### SUPERADMIN (Eng yuqori):
- ✅ Barcha admin huquqlari
- ✅ Yangi admin qo'shish/o'chirish
- ✅ Boshqa adminlarni boshqarish

#### ADMIN:
- ✅ Mahsulot boshqarish
- ✅ Stock boshqarish
- ✅ Buyurtmalarni ko'rish
- ✅ Fakultet boshqarish
- ❌ Admin qo'shish/o'chirish

#### USER:
- ✅ Mahsulotlarni ko'rish
- ✅ Buyurtma berish
- ❌ Admin panelga kirish

## 🚀 Deployment (DigitalOcean)

### 1. Droplet yaratish
- Ubuntu 22.04
- Node.js o'rnatish
- PostgreSQL o'rnatish

### 2. Loyihani deploy qilish

```bash
# Loyihani serverga yuklash
git clone <repository-url>
cd durdon_bot

# Dependencies
pnpm install

# Build
pnpm build

# Database migrate
npx prisma migrate deploy

# PM2 bilan ishga tushirish
pm2 start dist/main.js --name durdon-bot
pm2 save
pm2 startup
```

### 3. PostgreSQL sozlash

```bash
sudo -u postgres psql
CREATE DATABASE durdon_bot;
CREATE USER durdon WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE durdon_bot TO durdon;
\\q
```

## 📝 Misollar

### User buyurtma:

```
User: /start
Bot: "Xush kelibsiz!" [🛒 Do'konga kirish]

User: [🛒 Do'konga kirish]
Bot: "📦 Futbolka — 120 ta
      📦 Daftar — 40 ta"

User: [Daftar]
Bot: "Qaysi fakultet?"

User: [IT Faculty]
Bot: "Izoh kiriting"

User: "Talabalar uchun"
Bot: "Nechta kerak?"

User: "60"
Bot: "📦 Daftar
      
      Siz 60 ta so'radingiz
      Omborda faqat 40 ta mavjud
      
      ✅ 40 ta buyurtmangiz tayyor holatda
      📌 Qolgan 20 ta keyin beriladi"
```

### Admin stock qo'shish:

```
Admin: /start
Bot: "⚙️ ADMIN PANEL"
     [📦 Mahsulotlar]

Admin: [📦 Mahsulotlar]
Bot: "Daftar — 0 ta
      Futbolka — 120 ta"
      [📝 Daftar] [🗑]

Admin: [📝 Daftar]
Bot: "Hozirgi stock: 0 ta
      Yangi miqdorni kiriting"

Admin: "+300"
Bot: "✅ Stock yangilandi!
      
      📦 Daftar
      Oldingi: 0 ta
      Yangi: 300 ta"

System: Kutayotgan 5 ta user'ga xabar yubordi
```

## 🐛 Troubleshooting

### Bot ishlamayapti:
1. TELEGRAM_BOT_TOKEN to'g'ri kiritilganini tekshiring
2. Database connection string to'g'rimi?
3. Prisma migration bajarilganmi?

### Database xatosi:
```bash
npx prisma migrate reset
npx prisma migrate dev
```

### Port band:
```bash
# .env faylda PORT'ni o'zgartiring
PORT=4000
```

## 📞 Support

Muammo yuzaga kelsa:
- Issues bo'limida xabar qoldiring
- Telegram: @your_support_username

---

**Yaratilgan:** 2026
**Version:** 1.0.0
**License:** MIT
