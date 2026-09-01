# 🤖 Smart Court AI — คู่มือติดตั้ง

ระบบ AI ช่วยตอบคำถามกฎหมายสำหรับศาล พัฒนาด้วย Python + Streamlit เชื่อมต่อ AWS Bedrock Knowledge Base, OpenAI, Gemini และ DeepSeek

---

## 📋 ความต้องการของระบบ

| รายการ | เวอร์ชัน |
|--------|---------|
| Docker | 20.10+ |
| Docker Compose | v2+ |
| พื้นที่ดิสก์ | อย่างน้อย 2GB |

---

## 🔑 ไฟล์ที่ต้องเตรียมก่อน (ไม่อยู่ใน Git)

### 1. `.streamlit/secrets.toml`

สร้างไฟล์ `.streamlit/secrets.toml` และใส่ค่าตามนี้:

```toml
# AWS Bedrock Knowledge Base
AWS_ACCESS_KEY = "your-aws-access-key"
AWS_SECRET_KEY = "your-aws-secret-key"
KB_ID          = "your-knowledge-base-id"
REGION         = "us-east-1"

# AI Model API Keys
DEEPSEEK_API_KEY = "your-deepseek-api-key"
GEMINI_API_KEY   = "your-gemini-api-key"
OPENAI_API_KEY   = "your-openai-api-key"

# Google Sheets (สำหรับ export ข้อมูล)
SHEET_NAME = "ชื่อ Google Sheet"
```

### 2. `credentials.json`

ไฟล์ Google Service Account JSON สำหรับเชื่อมต่อ Google Sheets  
วางไฟล์ไว้ที่ root ของโปรเจกต์

### 3. `data/logs.db` (optional)

ฐานข้อมูล SQLite สำหรับเก็บ log การใช้งาน  
ถ้าไม่มี ระบบจะสร้างไฟล์ใหม่อัตโนมัติ

---

## 🚀 ขั้นตอนติดตั้ง (Docker)

### 1. Clone โปรเจกต์
```bash
git clone https://github.com/diaryman/smart-court-ai.git
cd smart-court-ai
```

### 2. สร้างไฟล์ secrets
```bash
mkdir -p .streamlit
cp .streamlit/secrets.toml.example .streamlit/secrets.toml
# แก้ไขค่าใน secrets.toml ให้ถูกต้อง
nano .streamlit/secrets.toml
```

### 3. วาง credentials.json
```bash
# วางไฟล์ credentials.json (Google Service Account) ไว้ที่ root
ls credentials.json  # ตรวจสอบว่ามีไฟล์
```

### 4. สร้าง data folder
```bash
mkdir -p data
```

### 5. รัน Docker
```bash
docker compose up -d --build
```

### 6. เข้าใช้งาน
เปิด browser ที่ **http://localhost:8501**

---

## 🗂️ โครงสร้างโปรเจกต์

```
smart-court-ai/
├── main.py                    # โค้ดหลัก
├── src/
│   ├── config.py              # ค่า config ทั้งหมด
│   ├── services.py            # logic เชื่อมต่อ API
│   ├── ui.py                  # UI components
│   └── utils.py               # utility functions
├── .streamlit/
│   └── secrets.toml           # 🔑 ต้องสร้างเอง (ไม่อยู่ใน Git)
├── credentials.json           # 🔑 ต้องวางเอง (ไม่อยู่ใน Git)
├── data/
│   └── logs.db                # SQLite (สร้างอัตโนมัติ)
├── Dockerfile
├── docker-compose.yml
└── requirements.txt
```

---

## 🔧 คำสั่งที่ใช้บ่อย

```bash
# ดู logs
docker compose logs -f

# หยุดระบบ
docker compose down

# อัปเดตโค้ดและ restart
git pull
docker compose up -d --build

# เข้าไปใน container
docker exec -it smart_court_ai bash
```

---

## 🐛 แก้ปัญหาที่พบบ่อย

| ปัญหา | วิธีแก้ |
|-------|--------|
| Port 8501 ถูกใช้อยู่ | แก้ port ใน docker-compose.yml: `"8510:8501"` |
| credentials.json หาไม่เจอ | ตรวจสอบว่าไฟล์อยู่ที่ root ของโปรเจกต์ |
| AWS connection error | ตรวจสอบ AWS_ACCESS_KEY และ AWS_SECRET_KEY ใน secrets.toml |
| Container ไม่ healthy | รัน `docker compose logs smart-court-ai` เพื่อดู error |
