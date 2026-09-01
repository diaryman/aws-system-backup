import React from "react";

interface SectionDividerProps {
    /** fill color of the wave shape (should match the NEXT section's bg) */
    fill?: string;
    /** bg color of this wrapper (should match the CURRENT section's bg) */
    bg?: string;
    /** flip the wave horizontally for variety */
    flip?: boolean;
    /** choose from wave presets */
    variant?: "wave" | "tilt" | "curve" | "layered" | "arrow";
    /** height of the divider in pixels */
    height?: number;
}

export default function SectionDivider({
    fill = "#ffffff",
    bg = "transparent",
    flip = false,
    variant = "wave",
    height = 80,
}: SectionDividerProps) {

    const shapes: Record<string, React.JSX.Element> = {
        wave: (
            <svg
                viewBox="0 0 1440 80"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
                className="block w-full"
                style={{ height }}
            >
                <path
                    d="M0,40 C180,80 360,0 540,40 C720,80 900,0 1080,40 C1260,80 1380,20 1440,40 L1440,80 L0,80 Z"
                    fill={fill}
                />
            </svg>
        ),
        tilt: (
            <svg
                viewBox="0 0 1440 80"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
                className="block w-full"
                style={{ height }}
            >
                <polygon points="0,80 1440,0 1440,80" fill={fill} />
            </svg>
        ),
        curve: (
            <svg
                viewBox="0 0 1440 80"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
                className="block w-full"
                style={{ height }}
            >
                <path
                    d="M0,80 C480,0 960,0 1440,80 L1440,80 L0,80 Z"
                    fill={fill}
                />
            </svg>
        ),
        layered: (
            <svg
                viewBox="0 0 1440 100"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
                className="block w-full"
                style={{ height: height * 1.2 }}
            >
                <path
                    d="M0,60 C360,100 720,20 1080,60 C1260,80 1380,50 1440,60 L1440,100 L0,100 Z"
                    fill={fill}
                    opacity="0.4"
                />
                <path
                    d="M0,70 C300,30 600,90 900,50 C1100,20 1300,70 1440,70 L1440,100 L0,100 Z"
                    fill={fill}
                    opacity="0.7"
                />
                <path
                    d="M0,80 C200,60 500,100 800,75 C1050,55 1250,85 1440,80 L1440,100 L0,100 Z"
                    fill={fill}
                />
            </svg>
        ),
        arrow: (
            <svg
                viewBox="0 0 1440 80"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
                className="block w-full"
                style={{ height }}
            >
                <path
                    d="M0,0 L720,70 L1440,0 L1440,80 L0,80 Z"
                    fill={fill}
                />
            </svg>
        ),
    };

    return (
        <div
            style={{
                backgroundColor: bg,
                transform: flip ? "scaleX(-1)" : undefined,
                lineHeight: 0,
                overflow: "hidden",
                display: "block",
            }}
        >
            {shapes[variant] ?? shapes.wave}
        </div>
    );
}
