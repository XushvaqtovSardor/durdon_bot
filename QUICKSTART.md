# 🚀 QUICK START GUIDE

## ⚡ Tezkor ishga tushirish

### 1️⃣ .env faylni yarating

```bash
# .env
DATABASE_URL="postgresql://username:password@localhost:5432/durdon_bot?schema=public"
TELEGRAM_BOT_TOKEN="your_bot_token_from_botfather"
SUPERADMIN_ID="your_telegram_id"
PORT=3000
```

### 2️⃣ Setup buyruqlari

```bash
# Dependencies o'rnatish
pnpm install

# Prisma migratsiya
npx prisma migrate dev --name init

# Prisma Client generatsiya
npx prisma generate

# Botni ishga tushirish
pnpm start:dev
```

### 3️⃣ Telegram'da test

1. Botingizga yozing: `/start`
2. Admin panel ochilishi kerak (siz SuperAdmin sifatida)
3. Fakultet qo'shing
4. Mahsulot qo'shing
5. Boshqa akkauntdan user sifatida test qiling

---

## 📋 Kerakli ma'lumotlar

### Telegram Bot Token olish:
1. [@BotFather](https://t.me/botfather)'ga yozing
2. `/newbot`
3. Bot nomini kiriting
4. Bot username'ini kiriting
5. Token'ni oling

### Telegram ID'ingizni bilish:
1. [@userinfobot](https://t.me/userinfobot)'ga yozing
2. ID'ni ko'ring va nusxalang

---

## 🎯 Birinchi ishlar

### Admin sifatida:

```
1. /start
2. [🏫 Fakultetlar] → Fakultet qo'shing
   - IT Faculty
   - Business Faculty
   - Engineering Faculty

3. [📦 Mahsulotlar] → Mahsulot qo'shing
   - Futbolka (100 ta)
   - Daftar (50 ta)
   - Ruchka (200 ta)

4. [👥 Admin boshqaruvi] → Admin qo'shing (agar kerak bo'lsa)
```

### User test:

```
Boshqa akkaunt:
1. /start
2. [🛒 Do'konga kirish]
3. Mahsulot tanlash
4. Fakultet tanlash
5. Izoh: "Test buyurtma"
6. Miqdor: 30
7. Tasdiq olish
```

---

## 🔧 Debugging

### Bot ishlamasa:

```bash
# .env faylni tekshiring
cat .env

# Prisma Client qayta generatsiya
npx prisma generate

# Database connection test
npx prisma db push
```

### Database xatosi:

```bash
# Database qayta tiklash
npx prisma migrate reset

# Yangi migratsiya
npx prisma migrate dev
```

### Port band bo'lsa:

```bash
# .env'da PORT'ni o'zgartiring
PORT=4000
```

---

## 📊 Database ko'rish

```bash
# Prisma Studio ochish
npx prisma studio
```

Browser'da: `http://localhost:5555`

---

## 🔄 Yangilashlar

### Stock yangilash:

```
Admin panel → Mahsulotlar → [📝 Mahsulot]

Qo'shish:  +100
Kamaytirish: -50
Aniq son: 200
```

### Order holatini yangilash:

```
Admin panel → Buyurtmalar → [✔️ Tugallash #ID]
```

---

## 📖 To'liq dokumentatsiya

- **DOCS.md** - Batafsil qo'llanma
- **MIGRATION.md** - Migratsiya uchun
- **SYSTEM_COMPLETE.md** - Tizim haqida to'liq ma'lumot

---

## ⚠️ MUHIM ESLATMALAR

1. **.env faylni .gitignore'ga qo'shing!**
2. **Database backup oling!**
3. **Production'da SUPERADMIN_ID'ni o'zgartiring!**
4. **TELEGRAM_BOT_TOKEN'ni hech kim bilan bo'lishmang!**

---

## 🎉 Tayyor!

Bot ishga tushdi va ishlashga tayyor!

**Test qilish uchun:**
- ✅ Admin funksiyalari
- ✅ User buyurtma berish
- ✅ Partial order (kam stock bilan)
- ✅ Real-time xabarlar

**Muammo bo'lsa:**
- 📖 DOCS.md'ni o'qing
- 🔄 MIGRATION.md'ga qarang
- 🐛 Console'dagi xatolarni tekshiring

---

**Omad!** 🚀
