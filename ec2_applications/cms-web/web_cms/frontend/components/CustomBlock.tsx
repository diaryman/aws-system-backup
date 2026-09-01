import React from "react";

interface CustomBlockProps {
    data: {
        id: string;
        title: string;
        content: string;
        bgColor?: string;
    };
}

export default function CustomBlock({ data }: CustomBlockProps) {
    if (!data) return null;

    return (
        <section
            id={data.id}
            className="py-24 relative overflow-hidden transition-all duration-300"
            style={{ backgroundColor: data.bgColor || "transparent" }}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {data.title && (
                    <h2 className="text-3xl md:text-4xl font-extrabold font-heading mb-8" style={{ color: "var(--foreground)" }}>
                        {data.title}
                    </h2>
                )}
                {data.content && (
                    <div
                        className="prose prose-lg dark:prose-invert max-w-none text-gray-700 dark:text-gray-300"
                        dangerouslySetInnerHTML={{ __html: data.content }}
                    />
                )}
            </div>
        </section>
    );
}
