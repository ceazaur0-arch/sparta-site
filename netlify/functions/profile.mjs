import { getStore } from '@netlify/blobs';
import nacl from 'tweetnacl';
import { PublicKey } from '@solana/web3.js';

export default async (req) => {
  const { wallet, username, message, signature } = await req.json();

  if (message !== `SPARTA profile: ${username}`) {
    return new Response('Bad message', { status: 400 });
  }

  const ok = nacl.sign.detached.verify(
    new TextEncoder().encode(message),
    Uint8Array.from(signature),
    new PublicKey(wallet).toBytes()
  );
  if (!ok) return new Response('Bad signature', { status: 401 });

  await getStore('profiles').setJSON(wallet, {
    username: username.slice(0, 20)
  });
  return new Response('ok');
};
