export default {
    routes: [
        {
            method: 'GET',
            path: '/policies',
            handler: 'policy.find',
            config: {
                policies: [],
                middlewares: [],
            },
        },
        {
            method: 'GET',
            path: '/policies/:id',
            handler: 'policy.findOne',
            config: {
                policies: [],
                middlewares: [],
            },
        },
        {
            method: 'POST',
            path: '/policies',
            handler: 'policy.create',
            config: {
                policies: [],
                middlewares: [],
            },
        },
        {
            method: 'PUT',
            path: '/policies/:id',
            handler: 'policy.update',
            config: {
                policies: [],
                middlewares: [],
            },
        },
        {
            method: 'DELETE',
            path: '/policies/:id',
            handler: 'policy.delete',
            config: {
                policies: [],
                middlewares: [],
            },
        },
    ],
};
