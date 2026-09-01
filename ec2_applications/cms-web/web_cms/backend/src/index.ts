// import type { Core } from '@strapi/strapi';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) { },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    try {
      const seed = require('./scripts/seed').default;
      await seed();
    } catch (e) {
      console.error('Bootstrap seeding error:', e);
    }

    // Auto-setup permissions for chatbot-knowledge
    try {
      const pluginStore = strapi.store({ type: 'plugin', name: 'users-permissions' });
      const existingPerms = await pluginStore.get({ key: 'advanced' });

      // Grant public API access to chatbot-knowledge (find, findOne, create, update, delete)
      const publicRole = await strapi.db.query('plugin::users-permissions.role').findOne({
        where: { type: 'public' },
      });

      if (publicRole) {
        const contentType = 'api::chatbot-knowledge.chatbot-knowledge';
        const actions = ['find', 'findOne', 'create', 'update', 'delete'];

        for (const action of actions) {
          const existingPerm = await strapi.db.query('plugin::users-permissions.permission').findOne({
            where: {
              action: `${contentType}.${action}`,
              role: publicRole.id,
            },
          });

          if (!existingPerm) {
            await strapi.db.query('plugin::users-permissions.permission').create({
              data: {
                action: `${contentType}.${action}`,
                role: publicRole.id,
                enabled: true,
              },
            });
            console.log(`✅ Created permission: ${contentType}.${action} for Public role`);
          }
        }
      }
    } catch (permErr) {
      console.error('Permission setup error:', permErr);
    }

    // Subscribe to lifecycles for Audit Logging
    const trackedModels = [
      'api::article.article',
      'api::policy-document.policy-document',
      'api::site-config.site-config',
      'api::timeline.timeline',
      'api::feature.feature',
      'api::service.service',
      'api::policy.policy',
      'api::chatbot-config.chatbot-config',
      'api::chatbot-knowledge.chatbot-knowledge',
      'api::hero-slide.hero-slide',
      'api::gallery.gallery',
      'api::category.category',
      'api::contact-submission.contact-submission',
      'api::newsletter-subscriber.newsletter-subscriber'
    ];

    strapi.db.lifecycles.subscribe({
      models: trackedModels,
      async afterCreate(event) {
        const { result, model } = event;
        await strapi.service('api::audit-log.audit-log').create({
          data: {
            action: 'CREATE',
            contentType: model.singularName,
            entityId: result.id.toString(),
            entityTitle: result.title || result.name || result.domain || 'Unnamed Entry',
            domain: result.domain || 'N/A',
            userEmail: 'admin@system.local', // Placeholder as we're using generic API in this demo
            details: result
          }
        });
      },
      async afterUpdate(event) {
        const { result, model } = event;
        await strapi.service('api::audit-log.audit-log').create({
          data: {
            action: 'UPDATE',
            contentType: model.singularName,
            entityId: result.id.toString(),
            entityTitle: result.title || result.name || result.domain || 'Unnamed Entry',
            domain: result.domain || 'N/A',
            userEmail: 'admin@system.local',
            details: result
          }
        });
      },
      async afterDelete(event) {
        const { result, model } = event;
        // In some Strapi versions, result might be the deleted item or its ID
        await strapi.service('api::audit-log.audit-log').create({
          data: {
            action: 'DELETE',
            contentType: model.singularName,
            entityId: result?.id?.toString() || 'unknown',
            entityTitle: result?.title || result?.name || 'Deleted Entry',
            domain: result?.domain || 'N/A',
            userEmail: 'admin@system.local',
            details: result
          }
        });
      },
    });
  },
};
