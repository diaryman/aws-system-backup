# 🛡️ AWS Full System Backup

**Backup Date:** 2026-09-01  
**AWS Account ID:** `591671455886`  
**Owner / IAM User:** `teepakorn.sa`  
**GitHub Account:** `diaryman`

---

## 📑 สารบัญและโครงสร้างของคลังข้อมูล (Directory Structure)

```text
aws_full_backup/
├── README.md                      # รายละเอียดสถาปัตยกรรม ข้อมูลระบบ และวิธี Restore
├── .gitignore                     # ไฟล์คัดกรองความปลอดภัย
├── aws_infrastructure/            # ไฟล์การตั้งค่า AWS ทั้งหมด (JSON)
│   ├── ec2_instances.json         # สเปก, Tags, Network, State ของทุก EC2 Instance
│   ├── security_groups.json       # กฎ Security Groups และ Port Inbound/Outbound
│   ├── vpc_subnets.json           # การตั้งค่า VPC, Subnets และ Routing
│   ├── bedrock_knowledge_bases.json # ข้อมูลและคอนฟิก Amazon Bedrock Knowledge Bases
│   └── s3_buckets.json            # รายการและคอนฟิก S3 Buckets
├── ec2_applications/              # ซอร์สโค้ดและคอนฟิกโปรเจกต์จากเซิร์ฟเวอร์
│   ├── court-ai-server/           # ระบบ Court-AI (caselaw-search, mybot, streamlit)
│   ├── court-ai-thaillm/          # ระบบ Chatbot ThaiLLM
│   ├── cms-web/                   # ระบบ Web CMS (Next.js + Strapi Frontend/Backend)
│   └── dify-server/               # ระบบ Dify Platform, Workflows และ Neo4j Bridge
└── s3_datasets/                   # คลังข้อมูล RAG และ Knowledge Base
    ├── my-company-knowledge-2025/ # ชุดข้อมูล RAG ready, Knowledge Graph, กฎหมาย
    ├── 2smart-court-data-source-2025/ # แหล่งข้อมูลทางการและเขตอำนาจศาล 77 จังหวัด
    └── adc-demo-bucket-test/      # ชุดเอกสารและถาม-ตอบคดีปกครอง
```

---

## 🖥️ รายละเอียดเครื่องเซิร์ฟเวอร์ (EC2 Instances)

| ชื่อเซิร์ฟเวอร์ | Region | Instance ID | Type | Public IP | KeyPair Name | คำอธิบาย |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Court-AI-Server** | `us-east-1` | `i-04f2bd68a58ebbad4` | `t3.medium` | `3.92.56.192` | `myserver-key` | ระบบค้นหาข้อกฎหมาย, MyBot, Streamlit Web App |
| **Court-AI-ThaiLLM** | `us-east-1` | `i-0a925730b7e76a886` | `t3.medium` | `54.160.202.96` | `myserver-key` | ระบบ Chatbot โมเดลภาษาไทยสำหรับงานศาล |
| **cms_web** | `us-east-1` | `i-0eccab4efc8dffce4` | `t4g.medium` | `18.232.106.141` | `myserver-key` | เว็บไซต์หลักและ CMS (Next.js + Strapi) |
| **Dify-Server** | `us-east-1` | `i-0efd1404f9b548c0a` | `t3.large` | `54.197.11.209` | `myserver-key` | Dify Workflow Platform & Knowledge Bridge |
| **adc_chatbot_ubuntu** | `ap-southeast-7` | `i-0cad6b85f4fed7a5b` | `t3.xlarge` | `43.210.0.88` | `adc_chatbot_ubuntu` | ADC Chatbot Service (Bangkok Region) |
| **Deepseek-Model** | `us-east-1` | `i-0776792135a60927b` | `g4dn.xlarge` | *(Stopped)* | `myserver-key` | GPU Instance สำหรับ Deepseek Model |

---

## 🧠 Amazon Bedrock Knowledge Bases

1. **Smart-Court-KB2**
   - **ID:** `X0TFMCZC7X`
   - **Region:** `us-east-1`
   - **Status:** `ACTIVE`
   - **Data Source:** `s3://2smart-court-data-source-2025`

2. **knowledge-base-test**
   - **ID:** `UHX3CVMTKL`
   - **Region:** `us-east-1`
   - **Status:** `ACTIVE`

---

## 🪣 Amazon S3 Buckets & Datasets

1. **`my-company-knowledge-2025`** (~73 MB, 680 ไฟล์)
   - ข้อมูล RAG Datasets: `01_kb_docs_chunks.jsonl`, `02_faq_pairs.jsonl`, `03_law_chunks.jsonl`
   - Knowledge Graph: `knowledge_graph.json`, Entity relations
   - เอกสาร PDF และคู่มือทางการ

2. **`2smart-court-data-source-2025`** (~2.0 MB, 7 ไฟล์)
   - ข้อมูลเขตอำนาจศาล 77 จังหวัด และช่องทางการติดต่อ

3. **`adc-demo-bucket-test`** (~380 KB, 7 ไฟล์)
   - เอกสารสรุปกระบวนการพิจารณาคดีและการดำเนินคดีปกครอง

---

## 🔄 คำแนะนำในการกู้คืนระบบ (System Restoration Guide)

1. **AWS Infrastructure:**
   - ศึกษากฎไฟร์วอลล์และคอนฟิกเครือข่ายจาก `aws_infrastructure/security_groups.json` และ `aws_infrastructure/vpc_subnets.json`
2. **EC2 Applications:**
   - คัดลอกโปรเจกต์จากโฟลเดอร์ `ec2_applications/<server-name>/` ไปยังเครื่องใหม่
   - ติดตั้ง Docker / Python venv ตามไฟล์ requirements หรือ Docker compose ที่มีอยู่ในแต่ละโปรเจกต์
3. **S3 Knowledge Bases:**
   - ใช้ AWS CLI เพื่อซิงก์ข้อมูลกลับขึ้น S3:
     ```bash
     aws s3 sync s3_datasets/my-company-knowledge-2025 s3://<your-new-bucket-name>
     ```
