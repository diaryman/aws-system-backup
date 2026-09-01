const qs = require('qs');

async function main() {
  const query = qs.stringify({
    filters: { domain: 'localhost' },
    populate: {
      content: {
        populate: {
          images: true
        }
      }
    }
  }, { encodeValuesOnly: true });

  const res = await fetch(`http://localhost:1337/api/articles?${query}`);
  const json = await res.json();
  console.log(JSON.stringify(json.data.map(d => Object.assign(d, { content: d.content?.filter(c => c.__component === 'shared.gallery') })).filter(d => d.content?.length > 0), null, 2));
}

main();
