import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::article.article', ({ strapi }) => ({
    /**
     * POST /api/articles/:documentId/view
     * Increments the viewCount by 1. Public route — no auth required.
     * Uses documentId (Strapi v5 stable identifier, not numeric id).
     */
    async incrementView(ctx: any) {
        const { documentId } = ctx.params;

        if (!documentId) {
            return ctx.badRequest('documentId is required');
        }

        try {
            // Find existing article by documentId
            const existing = await strapi.documents('api::article.article').findOne({
                documentId,
                fields: ['id', 'viewCount'],
            });

            if (!existing) {
                return ctx.notFound('Article not found');
            }

            const currentViews = (existing as any).viewCount ?? 0;

            // Increment view count
            await strapi.documents('api::article.article').update({
                documentId,
                data: {
                    viewCount: currentViews + 1,
                } as any,
            });

            return ctx.send({ viewCount: currentViews + 1 });
        } catch (err: any) {
            strapi.log.error('[incrementView] Error:', err?.message || err);
            return ctx.internalServerError('Failed to increment view count');
        }
    },
}));