sudo apt update && sudo apt upgrade -y
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
sudo sh get-docker.sh
sudo usermod -aG docker $ubuntu
sudo usermod -aG docker $USER
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
exit
git clone https://github.com/langgenius/dify.git
cd dify/docker
cp .env.example .env
sudo docker compose up -d
sudo docker compose ps
cd ~/dify/docker
sudo docker compose down
sudo docker compose up -d
docker ps
# ลบไฟล์เดิมและสร้างใหม่ด้วย Google DNS
sudo rm /etc/resolv.conf
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf
echo "nameserver 8.8.4.4" | sudo tee -a /etc/resolv.conf
sudo sed -i "s/127.0.0.1 localhost/127.0.0.1 localhost ip-172-31-80-226/" /etc/hosts
docker ps
docker-compose down
docker compose down
cd dify/docker
docker compose down
docker-compose up -d
docker compose up -d
docker compose down
ls
cd dify/
ls
cd docker/
docker compose down
docker compose up -d
