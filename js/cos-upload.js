const UPLOAD_API = '/api/admin/upload-token';

async function getUploadToken(token, key, contentType) {
  const params = new URLSearchParams();
  if (key) params.set('key', key);
  if (contentType) params.set('content-type', contentType);
  const res = await fetch(`${UPLOAD_API}?${params}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to get upload token');
  return res.json();
}

async function uploadToCos(file, token, key) {
  const contentType = file.type || 'image/jpeg';
  const { uploadUrl, url } = await getUploadToken(token, key, contentType);

  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error('COS upload error response:', body);
    throw new Error(`Upload to COS failed — see console (F12) for details`);
  }
  return { url, key };
}