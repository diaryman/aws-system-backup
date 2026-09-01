const Database = require('./backend/node_modules/better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'backend/.tmp/data.db'));

try {
    const runStr = () => {
        const roles = db.prepare("SELECT id, document_id, type FROM up_roles WHERE type IN ('public', 'authenticated')").all();

        roles.forEach(role => {
            const createPerm = (action) => {
                let perm = db.prepare("SELECT id, document_id FROM up_permissions WHERE action = ?").get(action);

                if (!perm) {
                    const docId = Math.random().toString(36).substring(2, 15);
                    const info = db.prepare("INSERT INTO up_permissions (document_id, action, created_at, updated_at, published_at) VALUES (?, ?, datetime('now'), datetime('now'), datetime('now'))").run(docId, action);
                    perm = { id: info.lastInsertRowid, document_id: docId };
                }

                const existingLink = db.prepare('SELECT id FROM up_permissions_role_lnk WHERE permission_id = ? AND role_id = ?').get(perm.id, role.id);
                if (!existingLink) {
                    db.prepare('INSERT INTO up_permissions_role_lnk (permission_id, role_id) VALUES (?, ?)').run(perm.id, role.id);
                }
            };

            createPerm('api::page-view.page-view.find');
            createPerm('api::page-view.page-view.findOne');
            createPerm('api::page-view.page-view.create');
        });
        console.log('Granted permissions to API!');
    };
    db.transaction(runStr)();
} catch (e) {
    console.error('Error:', e.message);
} finally {
    db.close();
}
