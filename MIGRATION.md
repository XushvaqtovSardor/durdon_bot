# 🔄 Migration Guide - Complete System Rewrite

## ⚠️ MUHIM: Schema butunlay o'zgardi!

Eski database'ni tozalash va yangi tuzilmani qo'llash kerak.

## 📋 Nima o'zgardi?

### 1. Database Schema

#### O'chirildi:
- ❌ `orderItems` table
- ❌ `stockRequest` table
- ❌ Product va Faculty o'rtasidagi bog'lanish
- ❌ Order `expiredAt` field

#### Qo'shildi:
- ✅ `SUPERADMIN` role
- ✅ Order ichida: `wanted`, `given`, `missing`, `facultyId`, `comment`
- ✅ User ichida: `username`, `updatedAt`
- ✅ Barcha tablarda `updatedAt` field

#### O'zgartirildi:
- 🔄 Order tuzilmasi: endi bitta mahsulot uchun bitta order
- 🔄 Table nomlar: `user` → `users`, `product` → `products`, etc.

### 2. Bot Flow

#### Eski flow:
```
/start → Fakultetlar → Do'kon → Mahsulot → Son → Savat → Tasdiqlash
```

#### Yangi flow:
```
/start → Do'kon → Mahsulot → Fakultet → Izoh → Son → Avtomatik tasdiqlash
```

### 3. Auto-Partial System

**Yangi:** Agar omborda yetarli mahsulot bo'lmasa:
- ✅ Bor narsani darhol beradi
- 📌 Yetmagan qismni keyinga qoldiradi
- 🔔 User'ga aniq xabar beradi

### 4. Admin Panel

**Yangi imkoniyatlar:**
- 👑 SuperAdmin roli
- 🔢 Stock yangilash: +100, -50, yoki aniq son
- 🗑️ Mahsulot/fakultet o'chirish
- 👥 Admin boshqaruvi (faqat SuperAdmin)

## 🚀 Migratsiya qadamlari

### 1. Backup (MUHIM!)

```bash
# Eski database backup
pg_dump durdon_bot > backup_$(date +%Y%m%d).sql
```

### 2. Eski migratsiyalarni tozalash

```bash
cd d:/c_p/durdon_bot

# Prisma migratsiyalarni tozalash
rm -rf prisma/migrations
```

### 3. Database tozalash

```bash
# PostgreSQL'ga kirish
psql -U postgres

# Database'ni o'chirish va qayta yaratish
DROP DATABASE durdon_bot;
CREATE DATABASE durdon_bot;
\\q
```

### 4. Yangi migratsiya

```bash
# Yangi schema'ni qo'llash
npx prisma migrate dev --name init

# Prisma Client generatsiya
npx prisma generate
```

### 5. SuperAdmin qo'shish

`.env` faylida:
```env
SUPERADMIN_ID="your_telegram_id"
```

### 6. Bot ishga tushirish

```bash
pnpm start:dev
```

## 📊 Ma'lumotlarni ko'chirish (agar kerak bo'lsa)

Agar eski ma'lumotlarni saqlamoqchi bo'lsangiz:

### Backup'dan Products qayta yaratish:

```sql
-- Eski products'ni export
-- Eski database'dan
SELECT name, quantity FROM product;
```

```sql
-- Yangi database'ga import
INSERT INTO products (name, quantity, "createdAt", "updatedAt")
VALUES 
  ('Futbolka', 120, NOW(), NOW()),
  ('Daftar', 0, NOW(), NOW());
```

### Faculties:

```sql
-- Eski database'dan
SELECT name FROM faculty;

-- Yangi database'ga
INSERT INTO faculties (name, "createdAt", "updatedAt")
VALUES 
  ('IT Faculty', NOW(), NOW()),
  ('Business Faculty', NOW(), NOW());
```

## ✅ Tekshirish

### 1. Database schema

```bash
npx prisma studio
```

- `users` table'da SUPERADMIN bor?
- `products` va `faculties` to'ldirilganmi?

### 2. Bot test

```
1. /start → Admin panel ochilishi kerak
2. Fakultet qo'shish
3. Mahsulot qo'shish
4. Oddiy user sifatida test (boshqa akkaunt)
5. Buyurtma berish (partial order test)
```

## 🆕 Yangi .env sozlamalar

```env
DATABASE_URL="postgresql://username:password@localhost:5432/durdon_bot?schema=public"
TELEGRAM_BOT_TOKEN="your_bot_token"
SUPERADMIN_ID="your_telegram_id"
PORT=3000
```

**Esda tuting:**
- `BOT_TOKEN` → `TELEGRAM_BOT_TOKEN` (agar eski loyihada boshqa nom bo'lsa)
- `SUPERADMIN_ID` - MUHIM! Birinchi admin uchun

## 🔧 Muammolar va yechimlar

### Prisma Client xatosi:

```bash
npx prisma generate
```

### Migration xatosi:

```bash
# Database'ni butunlay tozalash
npx prisma migrate reset

# Qaytadan migrate
npx prisma migrate dev
```

### Bot ishlamayapti:

1. `.env` faylni tekshiring
2. Prisma Client generatsiya qilinganmi?
3. Database connection bormi?

```bash
# Database connection test
npx prisma db push
```

## 📝 Yangi imkoniyatlar

### User uchun:
- ✅ Oddiyroq flow (savatsiz)
- ✅ Avtomatik partial orders
- ✅ Real-time stock ko'rsatish
- ✅ Izoh qo'shish imkoniyati

### Admin uchun:
- ✅ Tezkor stock yangilash (+/-)
- ✅ To'liq buyurtma ma'lumotlari
- ✅ Admin boshqaruvi
- ✅ Real-time xabarlar

## 📞 Yordam kerak?

Migratsiya davomida muammo bo'lsa:
1. DOCS.md'ni o'qing
2. Backup'dan tiklang
3. Qadamma-qadam qaytadan boshlang

---

**MUHIM:** Migratsiyadan oldin backup oling! ☝️
