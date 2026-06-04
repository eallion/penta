const UPLOAD_API = '/api/admin/upload-token';

async function getUploadToken(token) {
  const res = await fetch(UPLOAD_API, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to get upload token');
  return res.json();
}

async function uploadToCos(file, token) {
  const { uploadUrl, url, key } = await getUploadToken(token);

  const res = await fetch(uploadUrl, {
    method: 'PUT',
    body: file
  });

  if (!res.ok) throw new Error('Upload to COS failed');
  return { url, key };
}
