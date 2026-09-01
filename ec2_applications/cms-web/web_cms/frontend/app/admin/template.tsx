"use client";

import { motion } from "motion/react";
import React from "react";

export default function AdminTemplate({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
            }}
            className="w-full h-full"
            style={{ transform: "none" }}
        >
            {children}
        </motion.div>
    );
}
