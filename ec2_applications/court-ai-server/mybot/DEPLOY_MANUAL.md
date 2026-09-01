# 🚀 คู่มือการนำ Smart Court AI ขึ้น Server (Deployment Guide)

คู่มือนี้จะอธิบายขั้นตอนการนำโปรเจกต์ขึ้น Server โดยใช้วิธี **FTP + Docker** ซึ่งเป็นวิธีที่ง่ายและเสถียรที่สุด

## 📋 สิ่งที่ต้องเตรียม
1.  **Server (VPS/Cloud):** ที่ติดตั้ง Docker และ Docker Compose แล้ว
2.  **โปรแกรม FTP:** เช่น FileZilla หรือ WinSCP
3.  **ไฟล์สำคัญ:** ตรวจสอบว่าในเครื่องคุณมีไฟล์เหล่านี้ครบ
    *   `Dockerfile`
    *   `docker-compose.yml`
    *   `.dockerignore`
    *   `requirements.txt`
    *   `.streamlit/secrets.toml` (ถ้าไม่มี ให้สร้างเตรียมไว้)
    *   `credentials.json` (Google Sheets Key)

---

## 🛠️ ขั้นตอนการติดตั้ง (Step-by-Step)

### 1. อัปโหลดไฟล์ (FTP)
ให้ทำการลากไฟล์และโฟลเดอร์ **ทั้งหมด** จากเครื่องของคุณ ขึ้นไปวางบน Server (ในโฟลเดอร์ที่เตรียมไว้ เช่น `/home/admin/smart-court-ai`)

**⚠️ ข้อควรระวัง:**
*   ไม่ต้องอัปโหลดโฟลเดอร์ `.venv`, `env` หรือ `__pycache__` (เพราะเราจะสร้างใหม่ใน Docker)
*   ไฟล์ `.dockerignore` จะช่วยกันไม่ให้ Docker เอาไฟล์ขยะเข้าไป แต่ตอน FTP ให้เลือกไฟล์ที่จำเป็นตามรายการด้านบนก็พอ

### 2. รันโปรแกรม (บน Server)
เมื่ออัปโหลดเสร็จแล้ว ให้ SSH (Remote) เข้าไปที่ Server แล้วพิมพ์คำสั่งตามนี้:

```bash
# 1. เข้าไปที่โฟลเดอร์โปรเจกต์
cd /path/to/your/project  # เช่น cd /home/admin/smart-court-ai

# 2. สั่งรัน Docker (โดยให้สร้างภาพใหม่)
docker-compose up -d --build
```

### 3. ตรวจสอบสถานะ
พิมพ์คำสั่งนี้เพื่อดูว่าเว็บทำงานหรือยัง:

```bash
docker ps
```
ถ้าเห็นชื่อ `smart_court_ai` และ Status เป็น `Up ...` แสดงว่าสำเร็จ!

### 4. เข้าใช้งาน
*   เปิด Browser แล้วเข้า IP ของ Server ตามด้วยพอร์ต 8502 (ตามที่ตั้งใน docker-compose)
*   ตัวอย่าง: `http://192.168.1.100:8502`

---

## ❓ ปัญหาที่พบบ่อย (Troubleshooting)

**Q: เข้าเว็บไม่ได้ (หมุนติ้วๆ)**
*   A: ตรวจสอบ Firewall ของ Server ว่าเปิดพอร์ต `8502` หรือยัง

**Q: เจอ Error เกี่ยวกับ Credentials/Key**
*   A: ตรวจสอบว่าไฟล์ `credentials.json` และ `.streamlit/secrets.toml` ถูกอัปโหลดขึ้นไปหรือยัง และอยู่ในตำแหน่งที่ถูกต้องหรือไม่ (ต้องอยู่ระดับเดียวกับ `main.py`)

**Q: แก้โค้ดแล้ว แต่หน้าเว็บไม่เปลี่ยน**
*   A: ทุกครั้งที่แก้โค้ดบน Server ต้องสั่ง Restart Docker ใหม่ด้วยคำสั่ง:
    ```bash
    docker-compose restart
    ```
    หรือถ้ามีการเพิ่ม Library ใหม่ ให้สั่ง `docker-compose up -d --build` อีกครั้ง
