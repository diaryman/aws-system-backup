import Link from "next/link";
import { Facebook, Youtube, Mail, Phone, MapPin, ShieldCheck, ChevronRight, Globe } from "lucide-react";
import { fetchAPI } from "@/lib/api";
import { isPDPADomain, getCrossSiteURL } from "@/lib/siteConfig";

export default async function Footer({ domain = "localhost" }: { domain?: string }) {
    let config = null;
    try {
        const data = await fetchAPI("/site-configs", {
            filters: { domain }
        });
        config = data.data?.[0] || null;
    } catch (e) {
        console.error("Error fetching site config for footer", e);
    }

    const siteName = config?.siteName || (isPDPADomain(domain) ? "PDPA Administrative Court" : "DataGOV");
    const currentYear = new Date().getFullYear();

    const footerStyle = config?.footerStyle || "style-1";

    return (
        <footer id="contact" className="relative pt-24 pb-12 overflow-hidden scroll-mt-premium" style={{ backgroundColor: 'var(--primary-color)', color: 'var(--primary-foreground)' }}>
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-1" style={{ background: `linear-gradient(to right, var(--accent-color), var(--accent-dark), var(--accent-color))` }}></div>
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-cubes"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {footerStyle === "style-3" ? (
                    <div className="flex flex-col lg:flex-row gap-16 mb-20">
                        {/* Left Column: Brand & Big Info */}
                        <div className="flex-1 space-y-8">
                            <Link href="/" className="flex items-center gap-3 group">
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: 'var(--accent-color)' }}>
                                    <ShieldCheck size={36} style={{ color: 'var(--primary-foreground)' }} />
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black font-heading tracking-tighter" style={{ color: 'var(--primary-foreground)' }}>{siteName}</h3>
                                    <p className="text-xs font-bold uppercase tracking-widest leading-none mt-1" style={{ color: 'var(--accent-light)' }}>Admin Court Thailand</p>
                                </div>
                            </Link>
                            <p className="leading-relaxed text-sm lg:text-base opacity-70 whitespace-pre-line max-w-md">
                                {config?.heroSubheadline || "มุ่งมั่นสู่การเป็นศูนย์กลางข้อมูลธรรมาภิบาลที่มีมาตรฐาน โปร่งใส และปลอดภัยสูงสุด"}
                            </p>
                            <div className="space-y-4 pt-4 border-t border-white/10 max-w-md">
                                <div className="flex items-center gap-4 text-sm opacity-80"><MapPin size={18} className="text-accent flex-shrink-0" /> {config?.address || "120 หมู่ที่ 3 ถนนแจ้งวัฒนะ กรุงเทพฯ"}</div>
                                <div className="flex items-center gap-4 text-sm opacity-80"><Phone size={18} className="text-accent flex-shrink-0" /> {config?.phone || "0 2141 1111"}</div>
                                <div className="flex items-center gap-4 text-sm opacity-80"><Mail size={18} className="text-accent flex-shrink-0" /> {config?.email || "admin@admincourt.go.th"}</div>
                            </div>
                        </div>

                        {/* Right Column: Split layout container for links and action */}
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-8 bg-white/5 p-8 lg:p-12 rounded-3xl border border-white/10 backdrop-blur-sm">
                            <div>
                                <h4 className="text-sm font-bold uppercase tracking-widest text-accent mb-6">เมนูลัด</h4>
                                <ul className="space-y-4">
                                    {(config?.footerMenu || []).map((item: any, idx: number) => (
                                        <li key={idx}><Link href={item.href} className="hover:text-white flex items-center gap-2 transition-all duration-300 text-sm group opacity-60 hover:opacity-100"><ChevronRight size={14} className="text-accent" />{item.label || item.name}</Link></li>
                                    ))}
                                    {(!config?.footerMenu || config.footerMenu.length === 0) && (
                                        <li><Link href="/" className="hover:text-white flex items-center gap-2 text-sm opacity-60"><ChevronRight size={14} className="text-accent" />หน้าแรก</Link></li>
                                    )}
                                </ul>
                            </div>
                            <div className="space-y-8">
                                <div>
                                    <h4 className="text-sm font-bold uppercase tracking-widest text-accent mb-6">Social Media</h4>
                                    <div className="flex items-center gap-3">
                                        <Link href={config?.socialLinks?.facebook || "#"} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-accent transition-colors"><Facebook size={20} /></Link>
                                        <Link href={config?.socialLinks?.youtube || "#"} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-accent transition-colors"><Youtube size={20} /></Link>
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-white/10">
                                    <p className="text-xs opacity-50 mb-4">บริการเสริมศูนย์ช่วยเหลือ</p>
                                    <Link href="/help" className="inline-flex px-6 py-3 bg-white hover:bg-white/90 text-primary rounded-xl text-sm font-bold transition-all shadow-lg">แจ้งปัญหา / รับบริการ</Link>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : footerStyle === "style-2" ? (
                    <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-20 space-y-12">
                        <Link href="/" className="flex flex-col items-center gap-4 group">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl" style={{ backgroundColor: 'var(--accent-color)' }}>
                                <ShieldCheck size={36} style={{ color: 'var(--primary-foreground)' }} />
                            </div>
                            <h3 className="text-3xl sm:text-4xl font-black font-heading tracking-tighter" style={{ color: 'var(--primary-foreground)' }}>{siteName}</h3>
                        </Link>

                        <div className="flex flex-wrap justify-center gap-6 sm:gap-10 text-sm font-bold">
                            {(config?.footerMenu || [{ name: "หน้าแรก", href: "/" }, { name: "ติดต่อเรา", href: "/contact" }]).map((item: any, idx: number) => (
                                <Link key={idx} href={item.href} className="opacity-60 hover:opacity-100 hover:text-accent transition-all uppercase tracking-wider">{item.label || item.name}</Link>
                            ))}
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 opacity-70 text-sm">
                            <span className="flex items-center gap-2"><Phone size={16} className="text-accent" /> {config?.phone || "0 2141 1111"}</span>
                            <span className="flex items-center gap-2"><Mail size={16} className="text-accent" /> {config?.email || "admin@admincourt.go.th"}</span>
                        </div>

                        <div className="flex items-center gap-4 justify-center pt-8 border-t border-white/10 w-full max-w-md">
                            <Link href={config?.socialLinks?.facebook || "#"} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-accent hover:-translate-y-1 transition-all"><Facebook size={20} /></Link>
                            <Link href={config?.socialLinks?.youtube || "#"} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-accent hover:-translate-y-1 transition-all"><Youtube size={20} /></Link>
                            <Link href="/help" className="px-6 py-3 rounded-full bg-white/10 border border-white/20 ml-2 font-bold text-sm hover:bg-white hover:text-primary transition-colors">ศูนย์ช่วยเหลือ</Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
                        {/* Brand Section */}
                        <div className="space-y-6">
                            <Link href="/" className="flex items-center gap-3 group">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: 'var(--accent-color)' }}>
                                    <ShieldCheck size={28} style={{ color: 'var(--primary-foreground)' }} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black font-heading tracking-tighter" style={{ color: 'var(--primary-foreground)' }}>{siteName}</h3>
                                    <p className="text-[10px] font-bold uppercase tracking-widest leading-none mt-1" style={{ color: 'var(--accent-light)' }}>Admin Court Thailand</p>
                                </div>
                            </Link>
                            <p className="leading-relaxed text-sm max-w-xs opacity-60 whitespace-pre-line">
                                {config?.heroSubheadline || "มุ่งมั่นสู่การเป็นศูนย์กลางข้อมูลธรรมาภิบาลที่มีมาตรฐาน โปร่งใส และปลอดภัยสูงสุด"}
                            </p>
                            <div className="flex items-center gap-4">
                                {config?.socialLinks?.facebook && (
                                    <Link href={config.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-accent hover:text-white transition-all duration-300">
                                        <Facebook size={18} />
                                    </Link>
                                )}
                                {config?.socialLinks?.youtube && (
                                    <Link href={config.socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-accent hover:text-white transition-all duration-300">
                                        <Youtube size={18} />
                                    </Link>
                                )}
                                {(!config?.socialLinks?.facebook && !config?.socialLinks?.youtube) && (
                                    // Fallback placeholder icons if not configured
                                    [Facebook, Youtube].map((Icon, idx) => (
                                        <span key={idx} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center opacity-30">
                                            <Icon size={18} />
                                        </span>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div>
                            <h4 className="text-sm font-bold uppercase tracking-widest text-accent mb-8">เมนูลัด</h4>
                            <ul className="space-y-4">
                                {config?.footerMenu && config.footerMenu.length > 0 ? (
                                    config.footerMenu.map((item: any, idx: number) => (
                                        <li key={idx}>
                                            <Link href={item.href} className="hover:text-white flex items-center gap-2 transition-all duration-300 text-sm group opacity-60 hover:opacity-100">
                                                <ChevronRight size={14} className="text-accent/40 group-hover:text-accent transition-colors" />
                                                {item.label}
                                            </Link>
                                        </li>
                                    ))
                                ) : (
                                    [
                                        { name: "หน้าแรก", href: "/" },
                                        { name: "ข่าวกิจกรรมล่าสุด", href: "/news" },
                                        { name: "ประกาศและการแจ้งเตือน", href: "/#announcements" },
                                        { name: "ติดต่อเจ้าหน้าที่ DPO", href: isPDPADomain(domain) ? "/contact" : `${getCrossSiteURL("pdpa")}/contact` }
                                    ].map((item, idx) => (
                                        <li key={idx}>
                                            <Link href={item.href} className="hover:text-white flex items-center gap-2 transition-all duration-300 text-sm group opacity-60 hover:opacity-100">
                                                <ChevronRight size={14} className="text-accent/40 group-hover:text-accent transition-colors" />
                                                {item.name}
                                            </Link>
                                        </li>
                                    ))
                                )}
                            </ul>
                        </div>

                        {/* Contact Info */}
                        <div>
                            <h4 className="text-sm font-bold uppercase tracking-widest text-accent mb-8">ติดต่อหน่วยงาน</h4>
                            <ul className="space-y-6">
                                <li className="flex gap-4 group">
                                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/10 transition-colors">
                                        <MapPin size={20} className="text-accent" />
                                    </div>
                                    <p className="text-sm opacity-60 leading-relaxed whitespace-pre-line">
                                        {config?.address || "120 หมู่ที่ 3 ถนนแจ้งวัฒนะ \nเขตหลักสี่ กรุงเทพมหานคร 10210"}
                                    </p>
                                </li>
                                <li className="flex items-center gap-4 group">
                                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/10 transition-colors">
                                        <Phone size={18} className="text-accent" />
                                    </div>
                                    <p className="text-sm opacity-60">{config?.phone || "0 2141 1111"}</p>
                                </li>
                                <li className="flex items-center gap-4 group">
                                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/10 transition-colors">
                                        <Mail size={18} className="text-accent" />
                                    </div>
                                    <p className="text-sm opacity-60">{config?.email || "admin@admincourt.go.th"}</p>
                                </li>
                            </ul>
                        </div>

                        {/* Help Section */}
                        <div>
                            <h4 className="text-sm font-bold uppercase tracking-widest text-accent mb-8">บริการเสริม</h4>
                            <div className="bg-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur-sm">
                                <p className="text-xs opacity-50 mb-4 leading-relaxed">
                                    ต้องการความช่วยเหลือในการใช้งานระบบธรรมาภิบาลข้อมูล?
                                </p>
                                <Link href="/help" className="flex items-center justify-center px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all border border-white/5">
                                    ศูนย์ช่วยเหลือผู้ใช้
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-40">
                        {config?.footerText || `© ${currentYear} OFFICE OF THE ADMINISTRATIVE COURTS`}
                    </p>
                    <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest opacity-40">
                        <Link href="/privacy-policy" className="hover:text-accent hover:opacity-100 transition-all">นโยบายความเป็นส่วนตัว</Link>
                        <Link href="/cookie-policy" className="hover:text-accent hover:opacity-100 transition-all">นโยบายคุกกี้</Link>
                        <Link href="/terms-of-use" className="hover:text-accent hover:opacity-100 transition-all">ข้อตกลงการใช้งาน</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
