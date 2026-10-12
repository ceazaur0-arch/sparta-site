const PIN = 'https://api.pinata.cloud/pinning';
const H = { Authorization: `Bearer ${process.env.PINATA_JWT}` };

export default async (req) => {
  try {
    const { name, symbol, description, image, imageType } = await req.json();
    const form = new FormData();
    form.append('file', new Blob([Buffer.from(image, 'base64')], { type: imageType }), 'logo');
    const img = await (await fetch(`${PIN}/pinFileToIPFS`, { method: 'POST', headers: H, body: form })).json();
    if (!img.IpfsHash) throw new Error('image upload failed');
    const imageUrl = `https://gateway.pinata.cloud/ipfs/${img.IpfsHash}`;
    const meta = await (await fetch(`${PIN}/pinJSONToIPFS`, {
      method: 'POST',
      headers: { ...H, 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinataContent: {
        name, symbol, description, image: imageUrl,
        properties: { files: [{ uri: imageUrl, type: imageType }] },
      } }),
    })).json();
    if (!meta.IpfsHash) throw new Error('metadata upload failed');
    return Response.json({ uri: `https://gateway.pinata.cloud/ipfs/${meta.IpfsHash}` });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
};
