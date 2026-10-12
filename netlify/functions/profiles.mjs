import { getStore } from '@netlify/blobs';

export default async (req) => {
  const wallets = new URL(req.url).searchParams.get('wallets')?.split(',') || [];
  const store = getStore('profiles');
  const names = {};
  for (const w of wallets.slice(0, 100)) {
    const p = await store.get(w, { type: 'json' });
    if (p) names[w] = p.username;
  }
  return Response.json(names);
};
