"use client";

import React from "react";

type ContactPageClientProps = {
    navbar: React.ReactNode;
    footer: React.ReactNode;
    contactForm: React.ReactNode;
    siteConfig?: any;
    domain: string;
}

export default function ContactPageClient({ navbar, footer, contactForm, siteConfig }: ContactPageClientProps) {
    return (
        <main className="min-h-screen bg-[#f8fafc]">
            {navbar}

            {/* Hero header */}
            <div className="pt-[calc(6rem+44px)] pb-20 relative overflow-hidden text-center bg-white border-b border-gray-100">
                <div className="absolute inset-0 bg-cubes opacity-[0.03]" />
                <div className="max-w-4xl mx-auto px-4 relative z-10">
                    <span
                        className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 inline-block"
                        style={{ background: "var(--accent-subtle)", color: "var(--accent-color)" }}
                    >
                        Contact Us
                    </span>
                    <h1 className="text-4xl md:text-6xl font-black font-heading text-slate-900 mb-6 tracking-tight leading-tight">
                        ติดต่อสอบถาม <br />
                        <span style={{ color: "var(--accent-color)" }}>
                            {siteConfig?.siteName || "งานธรรมาภิบาลข้อมูล"}
                        </span>
                    </h1>
                    <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto">
                        หากมีข้อสงสัย ข้อเสนอแนะ หรือต้องการแจ้งเรื่องร้องเรียน สามารถติดต่อเราได้ผ่านช่องทางแบบฟอร์มด้านล่าง หรือช่องทางติดต่อหลักของเรา
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 -mt-10 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

                    {/* Contact Info */}
                    <div className="space-y-8 order-2 lg:order-1">
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-premium border border-gray-100">
                            <h3 className="text-2xl font-bold text-slate-900 mb-6 font-heading">ช่องทางติดต่อหลัก</h3>
                            <ul className="space-y-6">
                                {/* Address */}
                                <li className="flex gap-4 items-start">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                                        style={{ background: "var(--accent-subtle)", color: "var(--accent-color)" }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-lg">ที่อยู่สำนักงาน</h4>
                                        <p className="text-slate-500 leading-relaxed mt-1 whitespace-pre-line">
                                            {siteConfig?.address || "สำนักงานศาลปกครอง\n120 หมู่ที่ 3 ถนนแจ้งวัฒนะ แขวงทุ่งสองห้อง\nเขตหลักสี่ กรุงเทพมหานคร 10210"}
                                        </p>
                                    </div>
                                </li>
                                {/* Phone */}
                                <li className="flex gap-4 items-center">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                                        style={{ background: "var(--accent-subtle)", color: "var(--accent-color)" }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-lg">เบอร์โทรศัพท์</h4>
                                        <p className="text-slate-500 font-medium mt-1">{siteConfig?.phone || "0 2141 1111"}</p>
                                    </div>
                                </li>
                                {/* Email */}
                                <li className="flex gap-4 items-center">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                                        style={{ background: "var(--accent-subtle)", color: "var(--accent-color)" }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-lg">อีเมลติดต่อ</h4>
                                        <p className="text-slate-500 font-medium mt-1">{siteConfig?.email || "admin@admincourt.go.th"}</p>
                                    </div>
                                </li>
                            </ul>
                        </div>

                        {/* Office hours card — primary dark */}
                        <div
                            className="p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden"
                            style={{ background: "var(--primary-color)" }}
                        >
                            <div className="relative z-10">
                                <h3 className="text-2xl font-black font-heading mb-4 text-white">เวลาทำการ</h3>
                                <p className="text-white/80 leading-relaxed mb-6 whitespace-pre-line">
                                    {siteConfig?.officeHours || "วันจันทร์ - วันศุกร์ \nเวลา 08.30 - 16.30 น. \n(ยกเว้นวันหยุดราชการและวันหยุดนักขัตฤกษ์)"}
                                </p>
                            </div>
                            <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full blur-2xl" style={{ background: "var(--accent-glow)" }} />
                        </div>
                    </div>

                    {/* Form side */}
                    <div
                        className="bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl border border-gray-100 order-1 lg:order-2"
                        style={{ boxShadow: "0 40px 80px -20px var(--accent-glow)" }}
                    >
                        <h3 className="text-2xl font-bold text-slate-900 mb-8 font-heading">ส่งข้อความถึงเรา</h3>
                        {contactForm}
                    </div>
                </div>
            </div>

            {footer}
        </main>
    );
}
