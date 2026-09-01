# 🏛️ Gov Web CMS — คู่มือติดตั้ง

ระบบ CMS สำหรับเว็บไซต์ราชการ ประกอบด้วย Strapi (backend) + Next.js (frontend) รัน 2 container ผ่าน Docker Compose

---

## 📋 ความต้องการของระบบ

| รายการ | เวอร์ชัน |
|--------|---------|
| Docker | 20.10+ |
| Docker Compose | v2+ |
| พื้นที่ดิสก์ | อย่างน้อย 1GB |

---

## 🔑 ไฟล์ที่ต้องเตรียมก่อน

### 1. `.env` (root — สำหรับ URLs)

สร้างที่ root ของโปรเจกต์:

```env
# แก้เป็น IP หรือ domain ของเครื่องที่รัน
SERVER_IP=localhost
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
NEXT_PUBLIC_DATAGOV_URL=http://localhost:3002
NEXT_PUBLIC_PDPA_URL=http://localhost:3004
```

### 2. `backend/.env` (สำหรับ Strapi secrets)

```env
HOST=0.0.0.0
PORT=1337

APP_KEYS=key1,key2,key3,key4
API_TOKEN_SALT=your-random-salt
ADMIN_JWT_SECRET=your-admin-jwt-secret
TRANSFER_TOKEN_SALT=your-random-salt
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key

DATABASE_CLIENT=sqlite
DATABASE_FILENAME=.tmp/data.db
DATABASE_SSL=false
```

> 💡 สร้างค่า secret ได้ด้วยคำสั่ง: `openssl rand -base64 32`

### 3. ฐานข้อมูลและ uploads (ถ้าต้องการ restore ข้อมูลเดิม)

```bash
# รับไฟล์ backup จากทีมพัฒนา แล้วแตกไฟล์
tar -xzf backup_db_and_uploads.tar.gz

# หรือวางไฟล์ตรงๆ
mkdir -p backend/.tmp
cp data.db backend/.tmp/
```

---

## 🚀 ขั้นตอนติดตั้ง (Docker)

### 1. Clone โปรเจกต์
```bash
git clone https://github.com/diaryman/web_cms.git
cd web_cms
```

### 2. สร้างไฟล์ .env
```bash
# Root .env
cp .env.example .env 2>/dev/null || cat > .env << EOF
SERVER_IP=localhost
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
NEXT_PUBLIC_DATAGOV_URL=http://localhost:3002
NEXT_PUBLIC_PDPA_URL=http://localhost:3004
EOF

# Backend .env
cp backend/.env.example backend/.env
# แก้ไขค่า secret ให้เป็นค่าจริง
nano backend/.env
```

### 3. สร้าง folder สำหรับ database
```bash
mkdir -p backend/.tmp backend/public/uploads
```

### 4. Restore ฐานข้อมูล (ถ้ามี backup)
```bash
cp /path/to/data.db backend/.tmp/data.db
```

### 5. รัน Docker
```bash
docker compose up -d --build
```

> ⏳ ครั้งแรกอาจใช้เวลา 5-10 นาที เพราะต้อง build Next.js

### 6. เข้าใช้งาน

| ระบบ | URL |
|------|-----|
| Strapi Admin | http://localhost:1337/admin |
| Next.js Frontend | http://localhost:3002 |

---

## 🗂️ โครงสร้างโปรเจกต์

```
web_cms/
├── .env                          # 🔑 ต้องสร้างเอง — URLs
├── docker-compose.yml
├── backend/                      # Strapi CMS
│   ├── .env                      # 🔑 ต้องสร้างเอง — JWT secrets
│   ├── .tmp/
│   │   └── data.db               # SQLite database (ไม่อยู่ใน Git)
│   ├── public/
│   │   └── uploads/              # ไฟล์ที่อัปโหลด (ไม่อยู่ใน Git)
│   ├── src/                      # Strapi config + plugins
│   └── Dockerfile
└── frontend/                     # Next.js
    ├── app/                      # App Router pages
    ├── components/
    └── Dockerfile
```

---

## 🔧 คำสั่งที่ใช้บ่อย

```bash
# ดู logs ทั้งหมด
docker compose logs -f

# ดู logs เฉพาะ backend
docker compose logs -f backend

# หยุดระบบ
docker compose down

# อัปเดตโค้ดและ rebuild
git pull && docker compose up -d --build

# Backup database
cp backend/.tmp/data.db backend/.tmp/data.db.backup
```

---

## 🐛 แก้ปัญหาที่พบบ่อย

| ปัญหา | วิธีแก้ |
|-------|--------|
| Port 1337 ถูกใช้อยู่ | แก้ใน docker-compose.yml: `"1338:1337"` |
| Port 3002 ถูกใช้อยู่ | แก้ใน docker-compose.yml: `"3003:3000"` |
| Frontend โหลดช้า | ปกติครั้งแรก Next.js build ใช้เวลา 5-10 นาที |
| Strapi admin login ไม่ได้ | ตรวจสอบ ADMIN_JWT_SECRET ใน backend/.env |
| รูปภาพไม่แสดง | ตรวจสอบว่า `backend/public/uploads/` restore แล้ว |
