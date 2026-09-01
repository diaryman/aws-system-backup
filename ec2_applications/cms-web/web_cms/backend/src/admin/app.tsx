import type { StrapiApp } from '@strapi/strapi/admin';

export default {
    config: {
        locales: [
            'th',
            'en',
        ],
        translations: {
            th: {
                "Auth.form.welcome.title": "ยินดีต้อนรับสู่ระบบจัดการเว็บไซต์ DataGOV & PDPA",
                "Auth.form.welcome.subtitle": "เข้าสู่ระบบเพื่อจัดการเนื้อหา",
                "app.components.LeftMenu.navbrand.title": "DataGOV & PDPA CMS",
                "app.components.LeftMenu.navbrand.workplace": "แผงควบคุม",
            },
        },
    },
    bootstrap(app: StrapiApp) {
        console.log(app);
    },
};
