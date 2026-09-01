import { factories } from '@strapi/strapi';

export default {
    routes: [
        // Custom: increment view count (public, no auth required)
        {
            method: 'POST',
            path: '/articles/:documentId/view',
            handler: 'api::article.article.incrementView',
            config: {
                auth: false,
                policies: [],
                middlewares: [],
            },
        },
        // Default CRUD routes
        {
            method: 'GET',
            path: '/articles',
            handler: 'api::article.article.find',
            config: { auth: false },
        },
        {
            method: 'GET',
            path: '/articles/:id',
            handler: 'api::article.article.findOne',
            config: { auth: false },
        },
        {
            method: 'POST',
            path: '/articles',
            handler: 'api::article.article.create',
            config: {},
        },
        {
            method: 'PUT',
            path: '/articles/:id',
            handler: 'api::article.article.update',
            config: {},
        },
        {
            method: 'DELETE',
            path: '/articles/:id',
            handler: 'api::article.article.delete',
            config: {},
        },
    ],
};