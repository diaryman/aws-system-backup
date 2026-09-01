ls
nano credentials.json 
ls
nano app_compare.py 
nohup python3 -m streamlit run app_compare.py &
# อัปเดตเครื่อง
sudo apt update
# ติดตั้ง Library ภาษา Python
pip install pinecone-client sentence-transformers pandas openpyxl openai streamlit boto3 google-generativeai gspread oauth2client
# 1. อัปเดตรายการแพ็คเกจในเครื่อง
sudo apt update
# 2. ติดตั้ง pip สำหรับ Python 3 (สำคัญ! เครื่องใหม่อาจจะยังไม่มี)
sudo apt install python3-pip -y
# 3. ติดตั้ง Library ภาษา Python ที่ต้องใช้ทั้งหมด
pip install pinecone-client sentence-transformers pandas openpyxl openai streamlit boto3 google-generativeai gspread oauth2client
ls
nano app_compare.py 
ls
pkill -f streamlit
nohup python3 -m streamlit run main.py &
reboot
sudo reboot
nohup python3 -m streamlit run main.py &
pkill -f streamlit
nohup python3 -m streamlit run main.py &
pkill -f streamlit
pip install -r requirements.txt
nohup python3 -m streamlit run main.py &
pkill -f streamlit
pip install -r requirements.txt --break-system-packages
nohup python3 -m streamlit run main.py &
docker ps
ps aux | grep streamlit
kill -9 2491
ps aux | grep streamlit
cd /home/ubuntu/mybot  # หรือตำแหน่งที่ท่านเก็บไฟล์ไว้
cd /home/
ls
cd ubuntu/
ls
sudo mkdir mybot
ls
cd mybot/
git pull
git remote set-url origin https://github.com/diaryman/smart-court-ai.git
git pull origin main
git reset --hard
git pull https://github.com/diaryman/smart-court-ai.git main
cd ..
git clone https://github.com/diaryman/smart-court-ai.git mybot
sudo git clone https://github.com/diaryman/smart-court-ai.git mybot~
cd ~
sudo rm -rf mybot
git clone https://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@github.com/diaryman/smart-court-ai.git mybot
cd mybot
sudo docker compose up -d --build
curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh
sudo usermod -aG docker ubuntu
rm get-docker.sh
docker --version
sudo docker compose up -d --build
sudo docker system prune -a --volumes
sudo apt-get clean
sudo rm -rf /var/lib/apt/lists/*
df -h
sudo docker compose up -d --build
sudo docker stop $(sudo docker ps -aq)
sudo docker system prune -a --volumes -f
sudo journalctl --vacuum-time=1s
sudo apt-get clean
sudo rm -rf /var/lib/apt/lists/*
cd ..
ls
df -h
cd ~/mybot
nano Dockerfile
cd ..
mv mybot /tmp/mybot_safe
sudo rm -rf *
ls
mv /tmp/mybot_safe mybot
ls
ls -la
cd mybot/
sudo docker compose up -d --build
cd ~/mybot
nano .dockerignore
sudo docker system prune -a --volumes -f
# 2. ล้าง Log ระบบ Linux
sudo journalctl --vacuum-time=1s
# 3. ล้าง Cache ของ apt
sudo apt-get clean
sudo rm -rf /var/lib/apt/lists/*
sudo docker compose up -d --build
docker ps
sudo docker ps
docker compose dawn
cd ~/mybot
nano docker-compose.yml
sudo docker compose up -d
sudo docker ps
cd ~/mybot
docker compose dawn
sudo git pull
df -h
sudo docker system prune -af
sudo apt-get clean
sudo apt-get autoremove -y
sudo journalctl --vacuum-size=100M
git pull
sudo git pull
sudo git stash
sudo git pull
sudo docker compose down
sudo docker compose up -d --build
sudo docker system prune -af --volumes
sudo docker rmi $(sudo docker images -q)
sudo git pull
sudo docker compose up -d --build
ls
sudo rm data
# 1. ลบโฟลเดอร์ data (กินพื้นที่เยอะที่สุด)
sudo rm -rf data
# 2. ลบไฟล์ Excel และเอกสารคู่มือขนาดใหญ่
sudo rm "intent-150 (แยกแท็บ)(latest, use this file).xlsx"
sudo rm intent-150.xlsx
sudo rm "คู่มือการใช้งาน Smart Court AI.docx"
sudo rm "คู่มือการใช้งาน Smart Court AI.pdf"
# 3. ลบไฟล์ log เก่า
sudo rm nohup.out
ls -lh
df -h
git pull
sudo git pull
ls
sudo docker system prune -af --volumes
sudo docker compose up -d --build
sudo docker system prune -af --volumes
sudo apt-get clean
sudo rm -rf /var/lib/apt/lists/*
sudo journalctl --vacuum-time=1s
sudo find /home /var -type f -size +100M -exec ls -lh {} \; | awk '{ print $9 ": " $5 }'
df -h
# เพื่อความมั่นใจสุดๆ (Optional) ลองล้าง Cache อีกรอบให้สะอาดเอี่ยม
sudo docker builder prune -af
# สั่ง Build และ Run แบบ Background
sudo docker compose up -d --build
lsblk
sudo growpart /dev/xvda 1
sudo journalctl --vacuum-time=3d
sudo apt-get clean
sudo rm -rf /tmp/*
sudo growpart /dev/xvda 1
sudo resize2fs /dev/xvda1
docker system prune -f
sudo du -ahx / | sort -rh | head -n 10
sudo git pull
ls
cd mybot/
sudo git pull
sudo docker compose up -d --build
sudo git pull
sudo docker compose up -d --build
