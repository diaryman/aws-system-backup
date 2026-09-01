"use server";

import { fetchAPI } from "@/lib/api";

export async function getNotificationCounts(domain: string) {
    try {
        const [auditLogsRes, contactsRes, newsletterRes] = await Promise.all([
            fetchAPI("/audit-logs", {
                filters: { domain, isRead: false },
                pagination: { pageSize: 1, withCount: true }
            }, { revalidate: false }),
            fetchAPI("/contact-submissions", {
                filters: { domain, status: "New" },
                pagination: { pageSize: 1, withCount: true }
            }, { revalidate: false }),
            fetchAPI("/newsletter-subscribers", {
                filters: { domain, isRead: false },
                pagination: { pageSize: 1, withCount: true }
            }, { cache: "no-store" })
        ]);

        const unreadAuditLogs = auditLogsRes?.meta?.pagination?.total || 0;
        const newContacts = contactsRes?.meta?.pagination?.total || 0;
        const newSubscribers = newsletterRes?.meta?.pagination?.total || 0;

        return {
            unreadAuditLogs,
            newContacts,
            newSubscribers,
            total: unreadAuditLogs + newContacts + newSubscribers
        };
    } catch (error) {
        console.error("Failed to fetch notification counts:", error);
        return { unreadAuditLogs: 0, newContacts: 0, newSubscribers: 0, total: 0 };
    }
}

export async function getRecentNotifications(domain: string) {
    try {
        const [auditLogsRes, contactsRes, newsletterRes] = await Promise.all([
            fetchAPI("/audit-logs", {
                filters: { domain, isRead: false },
                sort: ["createdAt:desc"],
                pagination: { pageSize: 5 }
            }, { revalidate: false }),
            fetchAPI("/contact-submissions", {
                filters: { domain, status: "New" },
                sort: ["createdAt:desc"],
                pagination: { pageSize: 5 }
            }, { revalidate: false }),
            fetchAPI("/newsletter-subscribers", {
                filters: { domain, isRead: false },
                sort: ["createdAt:desc"],
                pagination: { pageSize: 5 }
            }, { cache: "no-store" })
        ]);

        return {
            auditLogs: auditLogsRes?.data || [],
            contacts: contactsRes?.data || [],
            subscribers: newsletterRes?.data || []
        };
    } catch (error) {
        console.error("Failed to fetch recent notifications:", error);
        return { auditLogs: [], contacts: [], subscribers: [] };
    }
}
