# ⚖️ Caselaw Search — คู่มือติดตั้ง

ระบบค้นหาคดีความและกฎหมาย พัฒนาด้วย Node.js + Express เชื่อมต่อ SLegalTools API และ AWS Bedrock

---

## 📋 ความต้องการของระบบ

| รายการ | เวอร์ชัน |
|--------|---------|
| Docker | 20.10+ |
| Docker Compose | v2+ |

---

## 🔑 ไฟล์ที่ต้องเตรียมก่อน

### `.env`

สร้างไฟล์ `.env` ที่ root ของโปรเจกต์:

```env
PORT=3001
SLEGALTOOLS_API_KEY=your-slegaltools-api-key
```

> ⚠️ ไม่ต้องใส่ AWS credentials ใน .env เพราะระบบใช้ IAM Role ของ EC2 หรือ AWS profile บนเครื่อง local

---

## 🚀 ขั้นตอนติดตั้ง (Docker)

### 1. Clone โปรเจกต์
```bash
git clone https://github.com/diaryman/caselaw-search.git
cd caselaw-search
```

### 2. สร้างไฟล์ .env
```bash
cat > .env << EOF
PORT=3001
SLEGALTOOLS_API_KEY=your-api-key-here
EOF
```

### 3. รัน Docker
```bash
docker compose up -d --build
```

### 4. เข้าใช้งาน
เปิด browser ที่ **http://localhost:3001**

---

## 🚀 ขั้นตอนติดตั้งแบบ Manual (ไม่ใช้ Docker)

### ความต้องการ: Node.js 20+

```bash
# ติดตั้ง dependencies
npm install

# รันในโหมด development
npm run dev

# รันในโหมด production
npm start
```

---

## 🗂️ โครงสร้างโปรเจกต์

```
caselaw-search/
├── server.js          # Express server + API proxy
├── public/            # Static files (HTML, CSS, JS)
├── .env               # 🔑 ต้องสร้างเอง (ไม่อยู่ใน Git)
├── package.json
├── Dockerfile
└── docker-compose.yml
```

---

## 🔧 คำสั่งที่ใช้บ่อย

```bash
# ดู logs
docker compose logs -f

# หยุดระบบ
docker compose down

# อัปเดตโค้ด
git pull && docker compose up -d --build
```

---

## 🐛 แก้ปัญหาที่พบบ่อย

| ปัญหา | วิธีแก้ |
|-------|--------|
| Port 3001 ถูกใช้อยู่ | แก้ใน docker-compose.yml: `"3010:3001"` |
| SLegalTools API error | ตรวจสอบ SLEGALTOOLS_API_KEY ใน .env |
| AWS Bedrock error | ตรวจสอบ AWS credentials หรือ IAM permissions |
