const toBase64 = (f) => new Promise((res) => {
  const r = new FileReader();
  r.onload = () => res(r.result.split(',')[1]);
  r.readAsDataURL(f);
});

export async function uploadMetadata({ name, symbol, description, file }) {
  const res = await fetch('/.netlify/functions/upload', {
    method: 'POST',
    body: JSON.stringify({
      name, symbol, description,
      image: await toBase64(file),
      imageType: file.type,
    }),
  });
  const data = await res.json();
  if (!data.uri) throw new Error(data.error || 'upload failed');
  return data.uri;
}
