const axios = require('axios');

async function addPdpaSite() {
    const url = 'http://127.0.0.1:1337/api/site-configs';
    const data = {
        data: {
            siteName: "PDPA Administrative Court",
            domain: "pdpa.localhost",
            announcement: "ศูนย์คุ้มครองข้อมูลส่วนบุคคล สำนักงานศาลปกครอง (PDPA Center)",
            footerText: "© 2026PDPA Administrative Court. All rights reserved."
        }
    };

    try {
        const response = await axios.post(url, data);
        console.log('✅ PDPA Site Config added:', response.data);
    } catch (error) {
        console.error('❌ Failed to add PDPA Site Config:', error.response?.data || error.message);
    }
}

addPdpaSite();
