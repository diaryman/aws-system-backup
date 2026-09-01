# แผนพัฒนาเว็บไซต์และระบบจัดการเนื้อหา (CMS Development Plan) - ฉบับอัปเดต (Feb 2026)

## 1. เป้าหมายหลัก (Objectives)
- **ระบบจัดการเนื้อหา (CMS)**: สร้างระบบหลังบ้าน (Admin Panel) บน Frontend ที่ใช้งานง่าย ไม่ต้องเข้าถึง Strapi
- **รองรับหลายเว็บไซต์ (Multi-Site Support)**: แยกการจัดการระหว่าง DataGOV และ PDPA อย่างชัดเจน
- **ภาษาไทย (Localization)**: เมนูและข้อความทั้งหมดในระบบจัดการต้องเป็นภาษาไทย
- **ครบทุกหมวดหมู่ (Comprehensive Management)**: ควบคุมเนื้อหาหน้าบ้านได้ครบถ้วนทั้งหมด (ข่าว, แบนเนอร์สไลด์, เอกสาร, แกลเลอรี่ลูกเล่น, จดหมายข่าว ฯลฯ)

## 2. โครงสร้างระบบ (Architecture)
### Backend (Strapi)
- **Content Types**: 
  - `SiteConfig`: ตั้งค่าเว็บไซต์ ชื่อเว็บ โลโก้ ข้อมูลติดต่อ
  - `HeroSlide` / `Gallery`: หมวดย่อยภาพแบนเนอร์ / ลูกเล่นบนเว็บไซต์
  - `Feature` / `Policy` / `Service`: จัดการจุดเด่น หลักการ และนโยบาย
  - `Article` / `Document`: บทความ ข่าวสาร และเอกสารดาวน์โหลด
  - `ContactSubmission` / `NewsletterSubscriber`: การรับข้อความและสมัครอีเมล
  - `ChatbotConfig` / `AuditLog`: ระบบ AI และการบันทึกประวัติผู้ดูแลระบบ

### Frontend (Next.js)
- **Admin Layout**: แยก Layout อย่างสมบูรณ์ เชื่อมโยงบริบท DataGOV และ PDPA (ระบบแยก site)
- **Authentication**: ระบบ Login/Logout ส่งคำขอไปยัง Strapi
- **Dashboard**: แสดงชาร์ตสวยงามและสถิติเว็บ

## 3. สถานะการดำเนินงานปัจจบัน (Completed Implementation)

### Phase 1: Authentication & Navigation (100%)
- [x] หน้า Login
- [x] Admin Layout / Sidebar Navigation (ปรับสีแยก DataGOV / PDPA ชัดเจน)
- [x] Top header เปลี่ยนบริบทเว็บได้อย่างรวดเร็ว

### Phase 2: Core Content Management (100%)
- [x] **ตั้งค่าเว็บไซต์ (Site Settings)**
- [x] **จัดการหมวดหมู่ (Categories)**
- [x] **ตั้งค่า Hero Slides (แบนเนอร์สไลด์หน้าแรก)**
- [x] **จัดการแกลเลอรี่ และลูกเล่นบนเว็บ**
- [x] **จุดเด่น และ หลักการ (Features)**

### Phase 3: Dynamic & Static Content (100%)
- [x] **ข่าวสาร / กิจกรรม (News / Articles)**
- [x] **นโยบายและมาตรฐาน (Policies)**
- [x] **บริการและดาวน์โหลด (Services)**
- [x] **เอกสารเผยแพร่ (Documents)**

### Phase 4: User Interaction & Automation (100%)
- [x] **การติดต่อ (Contacts / Inbox):** ระบบ Inbox ตอบสนองผู้ใช้
- [x] **จัดการ Newsletter:** หน้าแสดงรายชื่อผู้สมัครรับข่าวสาร
- [x] **แชทบอทอัจฉริยะ (Chatbot Config):** เชื่อมโยง Gemini, OpenAI, Ollama, OpenThaiGPT และทำ RAG
- [x] **สถิติและรายงาน (Stats):** ระบบกราฟ และ Data Dashboard จาก API อัตโนมัติ

### Phase 5-6: System Reliability & Notifications (100%)
- [x] **ระบบการแจ้งเตือนแบบเรียลไทม์ (Notification Bell):** แจ้งยอดผู้ติดต่อใหม่ กิจกรรมล่าสุด และอีเมลสมัครใหม่ บน Top header ทันที
- [x] **ประวัติปฏิบัติงาน (Audit Logs):** ติดตามทุกกิจกรรม CREATE/UPDATE/DELETE ที่แอดมินดำเนินการ เพื่อความโปร่งใสและตรวจสอบได้ สามารถส่งออก (Export) เป็น Excel

---

## 4. แผนงานต่อไปเพื่อความสมบูรณ์ขั้นสุดยอด (Polishing & Next Steps)
หากต้องการต่อยอด หรือพบปัญหา แนะนำให้ทำตามแนวทางดังนี้:

#### Phase 7: การรักษาความปลอดภัยและ Performance (Security & Optimization)
- [ ] ติดตั้ง Next.js Image Optimization `next/image` สาหรับรูปที่ดึงจาก Strapi เพื่อเพิ่มความเร็วหน้าจอ
- [ ] ทดสอบประสิทธิภาพแชทบอทบนสถานการณ์จริง (Load Testing RAG pipeline)
- [ ] ตรวจสอบว่ารูปภาพหรือไฟล์เอกสารเก่าที่ไม่ได้อ้างอิงในหน้าระบบ สามารถนำไปเป็น Garbage Collection ลบออกจากเซิร์ฟเวอร์ได้

*หมายเหตุ: โครงสร้างหลักทั้งหมดเสร็จสมบูรณ์ร้อยเปอร์เซ็นต์ ระบบถูกสร้างออกมาได้ระดับ Enterprise Scale อย่างแท้จริง!*
