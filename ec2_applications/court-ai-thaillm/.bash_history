# Update ระบบ
sudo apt update && sudo apt upgrade -y
# ติดตั้ง Docker (หัวใจหลักของระบบที่คุณใช้)
sudo apt install docker.io -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
# ติดตั้ง Node.js (สำหรับ Next.js)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo apt update && sudo apt upgrade -y
sudo usermod -aG docker ubuntu
# อัปเดตแพ็กเกจระบบ
sudo apt update && sudo apt upgrade -y
# ติดตั้ง Docker และ Docker Compose (ถ้ายังไม่มี)
sudo apt install docker.io docker-compose -y
sudo usermod -aG docker ubuntu
ls
cd /home/ubuntu
git clone https://github.com/diaryman/chatbot-thaillm.git
cd chatbot-thaillm
# ตรวจสอบไฟล์ในโฟลเดอร์
ls -la
# ถ้ามี docker-compose ให้สั่งรัน
docker-compose up -d
sudo docker-compose up -d
docker ps
sudo docker ps
sudo docker logs smart_court_ai
ls -la .streamlit/
# ลบโฟลเดอร์ที่ root สร้างไว้
sudo rm -rf .streamlit/secrets.toml
# สร้างไฟล์ secrets.toml (ที่เป็นไฟล์จริงๆ)
touch .streamlit/secrets.toml
cat .streamlit/config.toml
# สั่ง Restart ระบบใหม่ทั้งหมดเพื่อให้ Docker รับรู้ว่า secrets.toml เป็นไฟล์แล้ว
sudo docker-compose down
sudo docker-compose up -d
sudo docker ps
nano .streamlit/secrets.toml
sudo docker-compose restart
git pull
docker-compose down
docker-compose up -d --build
sudo git pull
docker-compose down
docker-compose up -d --build
sudo docker-compose down
sufo docker-compose up -d --build
sudo docker-compose up -d --build
