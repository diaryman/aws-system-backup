
// Mock data content
const mockData: any = {
    siteConfigs: [
        {
            siteName: "DataGOV Administrative Court",
            domain: "localhost",
            announcement: "ยินดีต้อนรับสู่ศูนย์กลางข้อมูลธรรมาภิบาล สำนักงานศาลปกครอง",
            footerText: "© 2026 สำนักงานศาลปกครอง. สงวนลิขสิทธิ์.",
            address: "120 หมู่ที่ 3 ถนนแจ้งวัฒนะ แขวงทุ่งสองห้อง เขตหลักสี่ กรุงเทพมหานคร 10210",
            phone: "0 2141 1111",
            email: "admin@admincourt.go.th",
            officeHours: "วันจันทร์ - วันศุกร์ เวลา 08.30 - 16.30 น. (ยกเว้นวันหยุดราชการ)",
            heroHeadline: "ธรรมาภิบาลข้อมูลภาครัฐ\nเพื่อความโปร่งใสและตรวจสอบได้",
            heroSubheadline: "ศูนย์กลางการบริหารจัดการข้อมูลและการเปิดเผยข้อมูลภาครัฐ ของสำนักงานศาลปกครอง",
            heroStats: [
                { value: "1,200+", label: "DATA ASSETS", sublabel: "ชุดข้อมูลในระบบ" },
                { value: "100%", label: "COMPLIANCE", sublabel: "ผ่านมาตรฐาน" },
                { value: "99.9%", label: "DATA ACCURACY", sublabel: "ความแม่นยำข้อมูล" },
                { value: "Level 4", label: "SECURITY", sublabel: "ISO 27001 Certified" }
            ],
            notifications: [
                "ประกาศ: มาตรฐานการจัดการข้อมูลภาครัฐฉบับใหม่ ปี 2569 เริ่มประกาศใช้แล้ววันนี้",
                "กิจกรรม: ขอเชิญร่วมรับฟังสัมมนาออนไลน์หัวข้อ 'ธรรมาภิบาลข้อมูลยุค AI' ในวันที่ 25 มีนาคมนี้",
                "แจ้งเตือน: ปรับปรุงระบบ Data Catalog ในช่วงเวลา 22:00 - 02:00 น. ของวันเสาร์ที่ 15 กุมภาพันธ์"
            ]
        },
        {
            siteName: "PDPA Administrative Court",
            domain: "pdpa.localhost",
            announcement: "ศูนย์คุ้มครองข้อมูลส่วนบุคคล (PDPA Center) สำนักงานศาลปกครอง",
            footerText: "© 2026 PDPA Center - สำนักงานศาลปกครอง. สงวนลิขสิทธิ์.",
            address: "120 หมู่ที่ 3 ถนนแจ้งวัฒนะ แขวงทุ่งสองห้อง เขตหลักสี่ กรุงเทพมหานคร 10210",
            phone: "0 2141 1111",
            email: "dpo@admincourt.go.th",
            officeHours: "วันจันทร์ - วันศุกร์ เวลา 08.30 - 16.30 น.",
            heroHeadline: "การคุ้มครอง\nข้อมูลส่วนบุคคล\nเป็นหน้าที่ของเรา",
            heroSubheadline: "สำนักงานศาลปกครองมุ่งมั่นรักษาความปลอดภัยของข้อมูลเจ้าหน้าที่และประชาชน ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562",
            heroStats: [
                { value: "100%", label: "ROPA", sublabel: "บันทึกกิจกรรมครบ" },
                { value: "24/7", label: "MONITORING", sublabel: "ระบบเฝ้าระวัง" },
                { value: "0", label: "BREACH", sublabel: "เหตุรั่วไหลข้อมูล" },
                { value: "ISO 27701", label: "CERTIFIED", sublabel: "มาตรฐานสากล" }
            ],
            notifications: [
                "ประกาศ: ปรับปรุงนโยบายคุ้มครองข้อมูลส่วนบุคคล ฉบับที่ 3/2569 มีผลบังคับใช้แล้ววันนี้",
                "กิจกรรม: เชิญร่วมงานอบรม PDPA Awareness สำหรับบุคลากร วันที่ 1 มีนาคม 2569",
                "แจ้งเตือน: ทุกหน่วยงานต้องส่งรายงาน ROPA ประจำไตรมาส 1/2569 ภายในวันที่ 15 เมษายน"
            ]
        }
    ],
    features: [
        // PDPA Principles
        { title: "Data Security", description: "รักษาความลับและความปลอดภัยของข้อมูลตามมาตรฐานสากล ISO/IEC 27001", icon: "Lock", domain: "pdpa.localhost", section: "PDPA Principles", order: 1 },
        { title: "Data Subject Rights", description: "รับรองและคุ้มครองสิทธิของเจ้าของข้อมูลส่วนบุคคลอย่างเคร่งครัดทั้ง 8 ประการ", icon: "Users", domain: "pdpa.localhost", section: "PDPA Principles", order: 2 },
        { title: "Purpose Limitation", description: "เก็บรวบรวมและใช้ข้อมูลเฉพาะตามวัตถุประสงค์ที่แจ้งไว้และจำเป็นต่อการปฏิบัติหน้าที่", icon: "Database", domain: "pdpa.localhost", section: "PDPA Principles", order: 3 },
        // Main Highlights
        { title: "นโยบายธรรมาภิบาล", description: "กำหนดทิศทางและกลยุทธ์การบริหารจัดการข้อมูลอย่างมีประสิทธิภาพ", icon: "FileText", domain: "localhost", section: "Main Highlights", order: 1 },
        { title: "มาตรฐานข้อมูล", description: "ยกระดับคุณภาพข้อมูลให้มีความถูกต้อง ครบถ้วน และเป็นปัจจุบัน", icon: "CheckCircle", domain: "localhost", section: "Main Highlights", order: 2 },
        { title: "ความโปร่งใส", description: "ส่งเสริมการเปิดเผยข้อมูลสาธารณะเพื่อการตรวจสอบและมีส่วนร่วม", icon: "Eye", domain: "localhost", section: "Main Highlights", order: 3 }
    ],
    chatbotConfigs: [
        {
            domain: "localhost",
            isEnabled: true,
            provider: "openthaigpt",
            apiKey: "AoSCekXCiQUuFbseHpYm3ApvOOON5Bep",
            modelName: "/model",
            botName: "DataGOV Assistant",
            welcomeMessage: "สวัสดีครับ ผมคือผู้ช่วยอัจฉริยะจาก DataGOV ยินดีให้บริการครับ 👋",
            systemPrompt: "คุณคือผู้ช่วยอัจฉริยะของศูนย์ธรรมาภิบาลข้อมูล สำนักงานศาลปกครอง ตอบคำถามสุภาพ เป็นกันเอง และใช้ข้อมูลจากระเบียบข้อบังคับที่กำหนดให้มากที่สุด",
            temperature: 0.3,
            suggestedQuestions: ["ธรรมาภิบาลข้อมูลคืออะไร", "ติดต่อเจ้าหน้าที่ได้อย่างไร", "แนวปฏิบัติการจัดการข้อมูล"]
        },
        {
            domain: "pdpa.localhost",
            isEnabled: true,
            provider: "openthaigpt",
            apiKey: "AoSCekXCiQUuFbseHpYm3ApvOOON5Bep",
            modelName: "/model",
            botName: "PDPA Guard",
            welcomeMessage: "ยินดีต้อนรับสู่ศูนย์คุ้มครองข้อมูลส่วนบุคคล (PDPA Center) มีคำถามเรื่องการรักษาความปลอดภัยข้อมูลสอบถามได้เลยครับ 🛡️",
            systemPrompt: "คุณคือผู้เชี่ยวชาญด้านกฎหมาย PDPA ของสำนักงานศาลปกครอง ตอบคำถามมีความน่าเชื่อถือ อ้างอิงมาตราที่ศาลกำหนด และให้คำแนะนำเบื้องต้นในการรักษาสิทธิของเจ้าของข้อมูล",
            temperature: 0.2,
            suggestedQuestions: ["สิทธิเจ้าของข้อมูลมีอะไรบ้าง", "การแจ้งเหตุละเมิดข้อมูล", "บุคคลภายนอกขอใช้ข้อมูลได้อย่างไร"]
        }
    ],
    categories: [
        { name: "ข่าวประชาสัมพันธ์", slug: "news" },
        { name: "กิจกรรม", slug: "activities" },
        { name: "ประกาศ", slug: "announcements" },
        { name: "PDPA Training", slug: "pdpa-training" },
        { name: "PDPA News", slug: "pdpa-news" }
    ],
    articles: [
        // DataGOV Articles
        {
            title: "การประชุมขับเคลื่อนธรรมาภิบาลข้อมูลภาครัฐสู่การปฏิบัติที่ยั่งยืนประจำปี 2569",
            slug: "meeting-dg-2569",
            description: "สำนักงานศาลปกครองจัดงานประชุมใหญ่ประจำปีเพื่อชี้แจงแนวทางการจัดการข้อมูลภาครัฐ",
            publishedAt: "2026-02-15T09:00:00.000Z",
            domain: "localhost",
            content: [
                {
                    __component: 'shared.rich-text',
                    body: '<h3>ความสำคัญของธรรมาภิบาลข้อมูล</h3><p>การจัดการข้อมูลที่มีประสิทธิภาพเป็นรากฐานสำคัญของการเป็น Smart Court...</p>'
                }
            ],
        },
        {
            title: "สำนักงานศาลปกครองรับรางวัลองค์กรดีเด่นด้านการจัดการข้อมูลขนาดใหญ่ (Big Data)",
            slug: "award-big-data",
            description: "สำนักงานศาลปกครองคว้ารางวัลระดับประเทศจากการนำ Big Data มาใช้วิเคราะห์ข้อมูลคดี",
            publishedAt: "2026-02-10T10:30:00.000Z",
            domain: "localhost",
            content: [{ __component: 'shared.rich-text', body: 'สำนักงานศาลปกครองมีความภาคภูมิใจที่ได้รับรางวัล...' }],
        },
        {
            title: "เปิดตัวระบบ Data Catalog อย่างเป็นทางการ เพื่อความโปร่งใสของข้อมูลศาล",
            slug: "launch-data-catalog",
            description: "เปิดมิติใหม่แห่งความโปร่งใสด้วยการเปิดเผยชุดข้อมูลบัญชีข้อมูลศาลสู่สาธารณะ",
            publishedAt: "2026-02-05T14:45:00.000Z",
            domain: "localhost",
            content: [{ __component: 'shared.rich-text', body: 'เชิญชวนประชาชนเข้าใช้งานระบบบัญชีข้อมูล...' }],
        },
        // PDPA Articles
        {
            title: "อบรมบุคลากรด้านการรักษาความมั่นคงปลอดภัยข้อมูลส่วนบุคคล",
            slug: "pdpa-training-2569",
            description: "จัดอบรมยกระดับความรู้บุคลากรศาลฯ เรื่องการรักษาความปลอดภัยข้อมูลตามมาตรฐาน PDPA",
            publishedAt: "2026-02-15T09:00:00.000Z",
            domain: "pdpa.localhost",
            content: [{ __component: 'shared.rich-text', body: 'กิจกรรมอบรมสร้างความเข้มแข็งด้านการคุ้มครองข้อมูล...' }],
        },
        {
            title: "ประกาศแต่งตั้งคณะทำการตรวจสอบภายในด้าน PDPA ประจำปีงบประมาณ 2569",
            slug: "pdpa-audit-committee",
            description: "ตั้งแต่งคณะกรรมการเพื่อกำกับดูแลและตรวจสอบการปฏิบัติงานให้เป็นไปตามกฎหมาย PDPA",
            publishedAt: "2026-02-10T10:30:00.000Z",
            domain: "pdpa.localhost",
            content: [{ __component: 'shared.rich-text', body: 'ประกาศสำคัญเพื่อความโปร่งใส...' }],
        },
        {
            title: "กิจกรรม Roadshow สร้างความรู้ด้านสิทธิเจ้าของข้อมูลให้กับประชาชน",
            slug: "pdpa-roadshow",
            description: "DPA ลงพื้นที่จัดโรงรถโชว์ให้ความรู้เรื่องสิทธิส่วนบุคคลและการป้องกันข้อมูลรั่วไหล",
            publishedAt: "2026-02-05T14:45:00.000Z",
            domain: "pdpa.localhost",
            content: [{ __component: 'shared.rich-text', body: 'ลงพื้นที่ให้ความรู้ด้านกฎหมาย PDPA...' }],
        }
    ],
    policyDocuments: [
        // DataGOV Docs
        { title: "นโยบายธรรมาภิบาลข้อมูล (ฉบับปี 2569)", category: "Policy", year: 2026, domain: "localhost", description: "นโยบายหลักในการบริหารจัดการข้อมูลของหน่วยงานเพื่อให้เกิดความโปร่งใสและตรวจสอบได้" },
        { title: "คู่มือการจัดทำบัญชีข้อมูล (Data Catalog)", category: "Manual", year: 2026, domain: "localhost", description: "คู่มือแนะนำขั้นตอนการจัดทำและลงทะเบียนชุดข้อมูลในระบบ Data Catalog" },
        { title: "แบบฟอร์มขอใช้ข้อมูล (Data Request Form)", category: "Form", year: 2026, domain: "localhost", description: "แบบฟอร์มมาตรฐานสำหรับการขอเข้าถึงข้อมูลเปิดภาครัฐ" },
        { title: "แนวทางการเปิดเผยข้อมูลเปิดภาครัฐ (Open Data Guideline)", category: "Guideline", year: 2025, domain: "localhost", description: "แนวทางปฏิบัติสำหรับการคัดเลือกและเผยแพร่ชุดข้อมูลเปิด" },
        { title: "รายงานผลการดำเนินงานด้านข้อมูลประจำปี 2568", category: "Report", year: 2025, domain: "localhost", description: "รายงานสรุปผลสัมฤทธิ์และปัญหาอุปสรรคในการดำเนินงานด้านข้อมูล" },
        { title: "มาตรฐานเมทาดาตาสำหรับภาครัฐ (Government Metadata Standard)", category: "Standard", year: 2024, domain: "localhost", description: "ข้อกำหนดมาตรฐานในการอธิบายข้อมูลเพื่อให้สามารถแลกเปลี่ยนและใช้งานร่วมกันได้" },
        // PDPA Docs
        { title: "นโยบายคุ้มครองข้อมูลส่วนบุคคล (Privacy Policy)", category: "PDPA Policy", year: 2026, domain: "pdpa.localhost" },
        { title: "ประกาศการคุ้มครองข้อมูลส่วนบุคคล (Privacy Notice)", category: "PDPA Notice", year: 2026, domain: "pdpa.localhost" },
        { title: "แบบคำร้องขอใช้สิทธิของเจ้าของข้อมูล (SAR)", category: "PDPA Form", year: 2026, domain: "pdpa.localhost" }
    ],
    timelines: [
        // DataGOV Timeline
        { year: "2566", title: "ก่อตั้งศูนย์บัญชาการข้อมูล", description: "เริ่มติดตั้งโครงสร้างพื้นฐานด้านข้อมูลขนาดใหญ่", domain: "localhost", order: 1 },
        { year: "2567", title: "ประกาศใช้นโยบายธรรมาภิบาล", description: "วางระเบียบแนวทางปฏิบัติการจัดการข้อมูลทุกแผนก", domain: "localhost", order: 2 },
        { year: "2568", title: "เชื่อมโยงข้อมูลระหว่างศาล", description: "สร้างระบบแลกเปลี่ยนข้อมูลอัตโนมัติแบบ Real-time", domain: "localhost", order: 3 },
        { year: "2569", title: "มุ่งสู่ศาลอัจฉริยะ (Smart Court)", description: "นำ AI มาช่วยในการวิเคราะห์และจัดหมวดหมู่ข้อมูลคดี", domain: "localhost", order: 4 },
        // PDPA Timeline
        { year: "2565", title: "เริ่มประกาศใช้นโยบาย", description: "จัดทำร่างนโยบายคุ้มครองข้อมูลส่วนบุคคลฉบับแรก", domain: "pdpa.localhost", order: 1 },
        { year: "2566", title: "แต่งตั้งเจ้าหน้าที่ DPO", description: "จัดตั้งทีมงานเฉพาะกิจเพื่อดูแลด้านความเป็นส่วนตัว", domain: "pdpa.localhost", order: 2 },
        { year: "2567", title: "ระบบ ROPA สมบูรณ์", description: "บันทึกกิจกรรมการประมวลผลข้อมูลครบทุกส่วนงาน", domain: "pdpa.localhost", order: 3 },
        { year: "2568", title: "ยกระดับสู่มาตรฐานสากล", description: "ผ่านการประเมินความมั่นคงปลอดภัยไซเบอร์ระดับดีเยี่ยม", domain: "pdpa.localhost", order: 4 }
    ]
};
// Strapi script to seed data
export default async function seed() {
    try {
        console.log('🌱 Starting comprehensive seeding...');

        // 1. Site Configs - Cleanup redundant domains and seed
        const existingSites = await strapi.documents('api::site-config.site-config').findMany();
        for (const s of existingSites) {
            if (s.domain !== 'localhost' && s.domain !== 'pdpa.localhost') {
                console.log(`🗑 Deleting redundant site-config: ${s.domain}`);
                await strapi.documents('api::site-config.site-config').delete({ documentId: s.documentId });
            }
        }
        for (const config of mockData.siteConfigs) {
            const exist = await strapi.db.query('api::site-config.site-config').findOne({ where: { domain: config.domain } });
            if (!exist) {
                await strapi.documents('api::site-config.site-config').create({ data: config, status: 'published' });
            } else {
                await strapi.db.query('api::site-config.site-config').update({ where: { id: exist.id }, data: config });
            }
        }

        // 1.1 Chatbot Configs - Cleanup redundant domains and seed
        console.log('🤖 Seeding Chatbot Configs...');
        const existingChats = await strapi.documents('api::chatbot-config.chatbot-config').findMany();
        for (const c of existingChats) {
            if (c.domain !== 'localhost' && c.domain !== 'pdpa.localhost') {
                console.log(`🗑 Deleting redundant chatbot-config: ${c.domain}`);
                await strapi.documents('api::chatbot-config.chatbot-config').delete({ documentId: c.documentId });
            }
        }
        for (const chatCfg of mockData.chatbotConfigs) {
            const exist = await strapi.db.query('api::chatbot-config.chatbot-config').findOne({ where: { domain: chatCfg.domain } });
            if (!exist) {
                await strapi.documents('api::chatbot-config.chatbot-config').create({ data: chatCfg, status: 'published' });
            } else {
                await strapi.db.query('api::chatbot-config.chatbot-config').update({ where: { id: exist.id }, data: chatCfg });
            }
        }

        // 2. Categories
        for (const cat of mockData.categories) {
            const exist = await strapi.db.query('api::category.category').findOne({ where: { slug: cat.slug } });
            if (!exist) {
                await strapi.documents('api::category.category').create({ data: cat, status: 'published' });
            }
        }

        // 3. Articles (News) - Seed only if not exist
        console.log('🤖 Seeding Articles...');
        for (const art of mockData.articles) {
            const exist = await strapi.db.query('api::article.article').findOne({ where: { slug: art.slug } });
            if (!exist) {
                await strapi.documents('api::article.article').create({ data: art, status: 'published' });
            }
        }

        // 4. Policy Documents - Seed only if not exist
        console.log('🤖 Seeding Policy Documents...');
        for (const doc of mockData.policyDocuments) {
            const exist = await strapi.db.query('api::policy-document.policy-document').findOne({ where: { title: doc.title, domain: doc.domain } });
            if (!exist) {
                await strapi.documents('api::policy-document.policy-document').create({ data: doc, status: 'published' });
            }
        }

        // 5. Features - Seed only if not exist
        console.log('🤖 Seeding Features...');
        for (const feat of mockData.features) {
            const exist = await strapi.db.query('api::feature.feature').findOne({ where: { title: feat.title, domain: feat.domain } });
            if (!exist) {
                await strapi.documents('api::feature.feature').create({ data: feat, status: 'published' });
            }
        }

        // 6. Timelines - Seed only if not exist
        console.log('🤖 Seeding Timelines...');
        for (const tl of mockData.timelines) {
            const exist = await strapi.db.query('api::timeline.timeline').findOne({ where: { title: tl.title, year: tl.year, domain: tl.domain } });
            if (!exist) {
                await strapi.documents('api::timeline.timeline').create({ data: tl, status: 'published' });
            }
        }

        // 6. Set Permissions
        console.log('🔐 Setting Public Permissions...');
        const publicRole = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'public' } });
        if (publicRole) {
            const permissionsToEnable = {
                'api::site-config': ['find', 'findOne', 'update'],
                'api::article': ['find', 'findOne', 'create', 'update', 'delete'],
                'api::category': ['find', 'findOne', 'create', 'update', 'delete'],
                'api::policy-document': ['find', 'findOne', 'create', 'update', 'delete'],
                'api::page': ['find', 'findOne', 'create', 'update', 'delete'],
                'api::contact-submission': ['create', 'find', 'findOne', 'update', 'delete'],
                'api::feature': ['find', 'findOne', 'create', 'update', 'delete'],
                'api::service': ['find', 'findOne', 'create', 'update', 'delete'],
                'api::policy': ['find', 'findOne', 'create', 'update', 'delete'],
                'api::audit-log': ['find', 'findOne', 'create'],
                'api::chatbot-config': ['find', 'findOne', 'create', 'update', 'delete'],
                'api::hero-slide': ['find', 'findOne', 'create', 'update', 'delete'],
                'api::timeline': ['find', 'findOne', 'create', 'update', 'delete'],
                'api::newsletter-subscriber': ['find', 'findOne', 'create', 'update', 'delete'],
                'api::gallery': ['find', 'findOne', 'create', 'update', 'delete'],
                'plugin::upload.api': ['find', 'findOne', 'destroy', 'upload'],
                'plugin::upload.content-api': ['find', 'findOne', 'destroy', 'upload'],
                'plugin::users-permissions.user': ['find', 'findOne', 'create', 'update', 'destroy'],
            };

            for (const [api, actions] of Object.entries(permissionsToEnable)) {
                for (const action of actions) {
                    let actionId;
                    if (api.startsWith('plugin::')) {
                        // For plugins, format is usually plugin::pluginName.controllerName.action or similar. 
                        // In our list we specified api as plugin::upload.content-api
                        actionId = `${api}.${action}`;
                    } else {
                        const apiName = api.split('::')[1];
                        actionId = `${api}.${apiName}.${action}`;
                    }
                    const exists = await strapi.db.query('plugin::users-permissions.permission').findOne({
                        where: { action: actionId, role: publicRole.id }
                    });
                    if (!exists) {
                        await strapi.db.query('plugin::users-permissions.permission').create({
                            data: { action: actionId, role: publicRole.id }
                        });
                    }
                }
            }
        }

        console.log('🚀 Comprehensive Seeding completed!');
    } catch (error) {
        console.error('❌ Seeding failed:', error);
    }
}
