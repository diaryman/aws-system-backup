sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential curl git unzip
# โหลดและรันสคริปต์ติดตั้งอัตโนมัติจาก Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
# เพิ่ม User ของคุณ (ubuntu) เข้ากลุ่ม docker 
# เพื่อที่จะได้ใช้คำสั่ง docker ได้โดยไม่ต้องพิมพ์ sudo นำหน้าเสมอ
sudo usermod -aG docker ubuntu
exit
# โหลดและรันสคริปต์ติดตั้งอัตโนมัติจาก Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
# เพิ่ม User ของคุณ (ubuntu) เข้ากลุ่ม docker 
# เพื่อที่จะได้ใช้คำสั่ง docker ได้โดยไม่ต้องพิมพ์ sudo นำหน้าเสมอ
sudo usermod -aG docker ubuntu
# โหลดและรันสคริปต์ติดตั้งอัตโนมัติจาก Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
# เพิ่ม User ของคุณ (ubuntu) เข้ากลุ่ม docker 
# เพื่อที่จะได้ใช้คำสั่ง docker ได้โดยไม่ต้องพิมพ์ sudo นำหน้าเสมอ
sudo usermod -aG docker ubuntu
# คัดลอกไฟล์ตั้งค่าจากตัวอย่าง
cp backend/.env.example backend/.env
# เปิดไฟล์ขึ้นมาแก้ไข
nano backend/.env
ls
git clone https://github.com/diaryman/web_cms.git
ls
cd web_cms/
cp backend/.env.example backend/.env
nano backend/.env
openssl rand -base64 32
nano backend/.env
# คำสั่งนี้จะดาวน์โหลดส่วนประกอบและสร้าง Image ซึ่งอาจใช้เวลา 5-10 นาทีในครั้งแรก
docker compose up -d --build
git pull
docker compose up -d --build
cd ~/web_cms
git pull
tar -xzvf backup_db_and_uploads.tar.gz
cp -R backend/.tmp/ ./backend/
cp -R backend/public/uploads/ ./backend/public/
docker compose up -d --build
git pull
docker compose down
sudo chown -R 1000:1000 backend/.tmp/ backend/public/uploads/
docker compose up -d
docker compose down
git pull
tar -xzvf backup_db_and_uploads.tar.gz
sudo chown -R 1000:1000 backend/.tmp/ backend/public/uploads/
docker compose up -d
cd ~/web_cms
git pull
docker compose up -d --build
สห
ls
cd web_cms/
docker exec -it gov-backend npm run strapi admin:reset-user-password -- --email="arachi.kh@gmail.com" --password="Admin1234"
# 1. เข้าโฟลเดอร์โปรเจกต์
cd ~/web_cms
# 2. ดึงโค้ดแก้ล่าสุด
git pull
# 3. สั่งสร้างระบบฝั่งเว็บใหม่อีก 1 รอบ
docker compose up -d --build
cd web_cms/
git pull
docker compose up -d --build
cd ~/web_cms
git pull
docker compose up -d --build
cd web_cms/
git pull
docker compose up -d --build
