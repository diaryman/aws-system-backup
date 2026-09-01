"use client";

import Link from "next/link";
import { MoveLeft } from "lucide-react";
import Gallery from "./Gallery";

// Simple Block Renderer for Strapi 5 Blocks JSON
const BlockRenderer = ({ blocks }: { blocks: any[] }) => {
    if (!blocks) return null;

    return (
        <div className="space-y-6 leading-relaxed" style={{ color: 'var(--foreground)' }}>
            <style jsx global>{`
                .html-content img {
                    max-width: 100%;
                    height: auto;
                    border-radius: 1.5rem;
                    margin: 2.5rem auto;
                    display: block;
                    box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
                }
                .html-content h1 { font-size: 2.25rem; font-weight: 800; margin-top: 2rem; margin-bottom: 1rem; color: var(--primary); }
                .html-content h2 { font-size: 1.875rem; font-weight: 700; margin-top: 1.8rem; margin-bottom: 0.8rem; color: var(--primary); }
                .html-content h3 { font-size: 1.5rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.6rem; color: var(--primary); }
                .html-content p { margin-bottom: 1.25rem; }
                .html-content ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1.25rem; }
                .html-content ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1.25rem; }
                .html-content blockquote {
                    border-left: 6px solid var(--accent-color, #2563eb);
                    padding: 1.5rem 2rem;
                    background: #f8fafc;
                    font-style: italic;
                    border-radius: 0 1.5rem 1.5rem 0;
                    margin: 2rem 0;
                    color: #475569;
                }
                .html-content a {
                    color: var(--accent-color, #2563eb);
                    text-decoration: underline;
                    font-weight: 600;
                }
            `}</style>
            {blocks.map((block, index) => {
                switch (block.__component) {
                    case "shared.rich-text":
                        let richTextContent = block.body || block.content;
                        // Check if content is a string (HTML) or array (Blocks)
                        if (typeof richTextContent === 'string') {
                            // Fix missing images: convert relative /uploads/ path to absolute Strapi URL
                            const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || "";
                            if (strapiUrl) {
                                richTextContent = richTextContent.replace(/(src|href)=["'](\/uploads\/[^"']+)["']/gi, `$1="${strapiUrl}$2"`);
                            }

                            return (
                                <div
                                    key={index}
                                    className="html-content"
                                    dangerouslySetInnerHTML={{ __html: richTextContent }}
                                />
                            );
                        }

                        // Original block rendering logic
                        return (
                            <div key={index}>
                                {Array.isArray(block.content) && block.content.map((innerBlock: any, i: number) => {
                                    if (innerBlock.type === 'paragraph') {
                                        return (
                                            <p key={i} className="mb-4">
                                                {innerBlock.children?.map((child: any, c: number) => {
                                                    if (child.bold) return <strong key={c}>{child.text}</strong>;
                                                    if (child.italic) return <em key={c}>{child.text}</em>;
                                                    return <span key={c}>{child.text}</span>;
                                                })}
                                            </p>
                                        )
                                    }
                                    return null;
                                })}
                            </div>
                        )
                    case "shared.hero":
                        return (
                            <div key={index} className="my-8 rounded-xl overflow-hidden shadow-lg">
                                <img src="https://placehold.co/800x400/1e3a8a/FFF?text=Hero+Image" alt="Hero" className="w-full h-auto object-cover" />
                            </div>
                        )
                    case "shared.gallery":
                        return <Gallery key={index} images={block.images} layout={block.layout} />;
                    default:
                        return null;
                }
            })}
        </div>
    );
};

export default BlockRenderer;
