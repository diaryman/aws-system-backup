const fs = require('fs');
const path = require('path');

const apiPath = path.join(__dirname, 'src', 'api');
const contentTypes = ['article', 'category', 'page', 'policy-document', 'site-config'];

contentTypes.forEach(type => {
  const typeDir = path.join(apiPath, type);
  
  // Create directories if not exist
  ['controllers', 'routes', 'services'].forEach(sub => {
    const dir = path.join(typeDir, sub);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  // 1. Controller
  const controllerContent = `import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::${type}.${type}');`;
  fs.writeFileSync(path.join(typeDir, 'controllers', `${type}.ts`), controllerContent);

  // 2. Router
  const routerContent = `import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::${type}.${type}');`;
  fs.writeFileSync(path.join(typeDir, 'routes', `${type}.ts`), routerContent);

  // 3. Service
  const serviceContent = `import { factories } from '@strapi/strapi';
export default factories.createCoreService('api::${type}.${type}');`;
  fs.writeFileSync(path.join(typeDir, 'services', `${type}.ts`), serviceContent);

  console.log(`✅ Fixed ${type}`);
});
