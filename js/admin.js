const API = '/api/admin';
let token = sessionStorage.getItem('penta_token');
let editingId = null;
let sortField = 'id';
let sortDir = 'desc';

function show(sel) {
  document.querySelectorAll('.page').forEach(el => el.style.display = 'none');
  const el = document.querySelector(sel);
  if (el) el.style.display = 'block';
}

function showLogin() {
  show('#loginPage');
}

function showAdmin() {
  show('#adminPage');
  loadPentas();
  loadStats();
  loadCosConfig();
}

document.addEventListener('DOMContentLoaded', () => {
  if (token) {
    showAdmin();
  } else {
    showLogin();
  }

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('password').value;
    try {
      const res = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (!res.ok) throw new Error('Login failed');
      const data = await res.json();
      token = data.token;
      sessionStorage.setItem('penta_token', token);
      showAdmin();
    } catch (err) {
      alert('Login failed: ' + err.message);
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    token = null;
    sessionStorage.removeItem('penta_token');
    showLogin();
  });

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab' + tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1)).classList.add('active');
    });
  });

  document.getElementById('addBtn').addEventListener('click', () => openModal());
  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  document.getElementById('pentaForm').addEventListener('submit', handleFormSubmit);

  document.getElementById('imageFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const uploadBtn = document.getElementById('uploadBtn');
    const imageUrlInput = document.getElementById('imageUrl');
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';
    try {
      const result = await uploadToCos(file, token);
      imageUrlInput.value = result.url;
      uploadBtn.textContent = 'Uploaded';
      uploadBtn.style.background = '#2ea043';
    } catch (err) {
      alert('Upload failed: ' + err.message);
      uploadBtn.disabled = false;
      uploadBtn.textContent = 'Upload';
    }
  });

  document.getElementById('saveCosBtn').addEventListener('click', saveCosConfig);
  document.getElementById('testCosBtn').addEventListener('click', testCosConnection);
  document.getElementById('changePasswordBtn').addEventListener('click', changePassword);
});

async function loadPentas() {
  try {
    const res = await fetch(`${API}/pentas`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const pentas = await res.json();
    renderTable(pentas);
  } catch (err) {
    document.getElementById('tableBody').innerHTML = '<tr><td colspan="6">Failed to load</td></tr>';
  }
}

async function loadStats() {
  try {
    const res = await fetch('/api/pentas/stats');
    const s = await res.json();
    document.getElementById('adminStats').innerHTML =
      `Total: ${s.total} | Champions: ${Object.keys(s.byChampion).length} | Years: ${Object.keys(s.byYear).length}`;
  } catch (e) {}
}

function sortBy(field) {
  if (field === sortField) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  else { sortField = field; sortDir = 'asc'; }
  document.querySelectorAll('th[data-field]').forEach(th => {
    th.textContent = th.textContent.replace(/ [▲▼]$/, '');
    if (th.dataset.field === sortField) th.textContent += sortDir === 'asc' ? ' ▲' : ' ▼';
  });
  loadPentas();
}

function renderTable(pentas) {
  const tbody = document.getElementById('tableBody');
  if (pentas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7">No pentas yet</td></tr>';
    return;
  }
  pentas.sort((a, b) => {
    let va = sortField === 'id' ? a[sortField] : (a[sortField] || '').toLowerCase();
    let vb = sortField === 'id' ? b[sortField] : (b[sortField] || '').toLowerCase();
    if (sortField === 'date') {
      va = new Date(va); vb = new Date(vb);
      return sortDir === 'asc' ? va - vb : vb - va;
    }
    if (typeof va === 'number') return sortDir === 'asc' ? va - vb : vb - va;
    return sortDir === 'asc' ? (''+va).localeCompare(''+vb) : (''+vb).localeCompare(''+va);
  });
  tbody.innerHTML = pentas.map(p => `
    <tr>
      <td>${p.id}</td>
      <td><img src="${p.imageUrl || p.screenshot || ''}" style="width:60px;height:34px;object-fit:cover;border-radius:4px" alt=""></td>
      <td>${p.name}</td>
      <td>${p.title || '-'}</td>
      <td>${p.map || '-'}</td>
      <td>${p.date.slice(0, 10)}</td>
      <td class="actions">
        <button onclick="editPenta(${p.id})">Edit</button>
        <button class="danger" onclick="deletePenta(${p.id})">Del</button>
      </td>
    </tr>
  `).join('');
}

function openModal(penta) {
  editingId = penta ? penta.id : null;
  document.getElementById('modalTitle').textContent = penta ? 'Edit Penta' : 'Add Penta';
  document.getElementById('heroId').value = penta ? (penta.heroId || '') : '';
  document.getElementById('championName').value = penta ? penta.champion : '';
  document.getElementById('championZh').value = penta ? (penta.name || '') : '';
  document.getElementById('championTitle').value = penta ? (penta.title || '') : '';
  document.getElementById('pentaDate').value = penta ? penta.date.slice(0, 16) : '';
  document.getElementById('pentaMap').value = penta ? (penta.map || '') : '';
  document.getElementById('imageUrl').value = penta ? (penta.imageUrl || '') : '';
  document.getElementById('imageFile').value = '';
  document.getElementById('uploadBtn').textContent = 'Upload';
  document.getElementById('uploadBtn').disabled = false;
  document.getElementById('uploadBtn').style.background = '';
  document.getElementById('modalOverlay').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modalOverlay').style.display = 'none';
  editingId = null;
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const data = {
    heroId: document.getElementById('heroId').value,
    champion: document.getElementById('championName').value,
    name: document.getElementById('championZh').value || document.getElementById('championName').value,
    title: document.getElementById('championTitle').value,
    map: document.getElementById('pentaMap').value || undefined,
    date: (() => {
      const val = document.getElementById('pentaDate').value;
      if (!val) return new Date().toISOString();
      const d = new Date(val);
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
    })(),
    imageUrl: document.getElementById('imageUrl').value
  };

  if (!data.champion || !data.imageUrl) {
    alert('Champion name and image URL are required');
    return;
  }

  try {
    const url = editingId ? `${API}/pentas/${editingId}` : `${API}/pentas`;
    const method = editingId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Save failed');
    closeModal();
    loadPentas();
    loadStats();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function editPenta(id) {
  try {
    const res = await fetch(`/api/pentas/${id}`);
    const penta = await res.json();
    openModal(penta);
  } catch (err) {
    alert('Failed to load penta');
  }
}

async function deletePenta(id) {
  if (!confirm('Delete this penta?')) return;
  try {
    const res = await fetch(`${API}/pentas/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Delete failed');
    loadPentas();
    loadStats();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function loadCosConfig() {
  const statusEl = document.getElementById('cosStatus');
  try {
    const res = await fetch(`${API}/config/cos`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.configured) {
      statusEl.className = 'status ok';
      statusEl.textContent = 'COS configured';
      document.getElementById('cosSecretId').value = data.config.secretId || '';
      document.getElementById('cosBucket').value = data.config.bucket || '';
      document.getElementById('cosRegion').value = data.config.region || '';
      document.getElementById('cosPathPrefix').value = data.config.pathPrefix || '';
      document.getElementById('cosCdnDomain').value = data.config.cdnDomain || '';
    } else {
      statusEl.className = 'status warn';
      statusEl.textContent = 'COS not configured — image upload won\'t work';
    }
  } catch (err) {
    statusEl.className = 'status warn';
    statusEl.textContent = 'Failed to load COS config: ' + err.message;
  }
}

async function saveCosConfig() {
  const data = {
    secretId: document.getElementById('cosSecretId').value.trim(),
    secretKey: document.getElementById('cosSecretKey').value.trim(),
    bucket: document.getElementById('cosBucket').value.trim(),
    region: document.getElementById('cosRegion').value.trim(),
    pathPrefix: document.getElementById('cosPathPrefix').value.trim(),
    cdnDomain: document.getElementById('cosCdnDomain').value.trim()
  };

  if (!data.secretId || !data.secretKey || !data.bucket || !data.region) {
    alert('Secret ID, Secret Key, Bucket and Region are required');
    return;
  }

  try {
    const res = await fetch(`${API}/config/cos`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Save failed');
    alert('COS config saved');
    loadCosConfig();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function testCosConnection() {
  const btn = document.getElementById('testCosBtn');
  btn.disabled = true;
  btn.textContent = 'Testing...';
  try {
    // Try to get an upload token as a connection test
    const res = await fetch(`${API}/upload-token`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      alert('Connection OK — presigned URL generated successfully');
    } else {
      const err = await res.json();
      alert('Connection failed: ' + (err.error || res.statusText));
    }
  } catch (err) {
    alert('Connection failed: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Test Connection';
  }
}

async function changePassword() {
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;

  if (!currentPassword || !newPassword) {
    alert('Please fill in both fields');
    return;
  }

  if (newPassword.length < 4) {
    alert('New password must be at least 4 characters');
    return;
  }

  try {
    const res = await fetch(`${API}/config/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    if (res.status === 401) {
      alert('Session expired. Please login again.');
      document.getElementById('logoutBtn').click();
      return;
    }

    const data = await res.json();

    if (!res.ok) {
      alert('Failed: ' + (data.error || res.statusText));
      return;
    }

    alert('Password changed successfully');
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
  } catch (err) {
    alert('Error: ' + err.message);
  }
}
