const user = Auth.requireRole('admin');
if (user) {
  document.getElementById('who-name').textContent = `${user.name || user.email} · admin`;
  document.getElementById('logout').addEventListener('click', () => { Auth.clear(); window.location.href = '/index.html'; });
  document.getElementById('delete-account').addEventListener('click', async () => {
    if (!confirm('Delete YOUR admin account permanently? If this is the only admin, you will lose all admin access. This cannot be undone.')) return;
    try {
      await api('/auth/me', { method: 'DELETE' });
      Auth.clear();
      window.location.href = '/index.html';
    } catch (e) {
      alert(e.message);
    }
  });
  document.getElementById('new-owner-btn').addEventListener('click', openNewOwnerModal);
  document.getElementById('new-business-btn').addEventListener('click', openNewBusinessModal);
  loadRequests();
  loadOwners();
  loadBusinesses();
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let OWNERS_CACHE = [];

async function loadRequests() {
  const list = document.getElementById('requests-list');
  let requests;
  try {
    requests = await api('/auth/requests');
  } catch (e) {
    list.innerHTML = `<p class="error">${e.message}</p>`;
    return;
  }
  if (requests.length === 0) {
    list.innerHTML = `<div class="empty">No pending requests.</div>`;
    return;
  }
  list.innerHTML = requests.map((r) => `
    <div class="card" id="req-${r.id}">
      <h3>${escapeHtml(r.business_name)}</h3>
      <div class="meta">${escapeHtml(r.name || '')} · ${escapeHtml(r.email)}</div>
      ${r.google_match
        ? `<div class="live-tag" style="margin:8px 0;"><span class="dot"></span>Google match: ${escapeHtml(r.google_match.name)} · ${r.google_match.rating ?? '—'}★</div>`
        : `<div class="meta" style="color:var(--alert);">No automatic Google match — verify manually before approving.</div>`}
      <div class="row-actions">
        <button class="small" id="approve-${r.id}">Approve</button>
        <button class="danger small" id="reject-${r.id}">Reject</button>
      </div>
    </div>`).join('');
  requests.forEach((r) => {
    document.getElementById(`approve-${r.id}`).addEventListener('click', async () => {
      try {
        await api(`/auth/requests/${r.id}/approve`, { method: 'POST' });
        loadRequests(); loadOwners(); loadBusinesses();
      } catch (e) { alert(e.message); }
    });
    document.getElementById(`reject-${r.id}`).addEventListener('click', async () => {
      if (!confirm(`Reject request from ${r.email}?`)) return;
      try {
        await api(`/auth/requests/${r.id}/reject`, { method: 'POST' });
        loadRequests();
      } catch (e) { alert(e.message); }
    });
  });
}

async function loadOwners() {
  const list = document.getElementById('owners-list');
  try {
    OWNERS_CACHE = await api('/auth/owners');
  } catch (e) {
    list.innerHTML = `<p class="error">${e.message}</p>`;
    return;
  }
  if (OWNERS_CACHE.length === 0) {
    list.innerHTML = `<div class="empty">No owner accounts yet. Create one to link a business.</div>`;
    return;
  }
  list.innerHTML = OWNERS_CACHE.map((o) => `
    <div class="card">
      <h3>${escapeHtml(o.name || o.email)}</h3>
      <div class="meta">${escapeHtml(o.email)} · owner id #${o.id}</div>
      <div class="row-actions">
        <button class="danger small" id="del-owner-${o.id}">Delete account</button>
      </div>
    </div>`).join('');
  OWNERS_CACHE.forEach((o) => {
    document.getElementById(`del-owner-${o.id}`).addEventListener('click', async () => {
      if (!confirm(`Delete ${o.email}'s account? This also deletes their business and chat history. Cannot be undone.`)) return;
      try {
        await api(`/auth/owners/${o.id}`, { method: 'DELETE' });
        loadOwners(); loadBusinesses();
      } catch (e) { alert(e.message); }
    });
  });
}

async function loadBusinesses() {
  const list = document.getElementById('businesses-list');
  let businesses;
  try {
    businesses = await api('/businesses');
  } catch (e) {
    list.innerHTML = `<p class="error">${e.message}</p>`;
    return;
  }
  if (businesses.length === 0) {
    list.innerHTML = `<div class="empty">No businesses yet. Add the first Tempe business.</div>`;
    return;
  }
  list.innerHTML = businesses.map(businessCardHtml).join('');
  businesses.forEach((b) => {
    document.getElementById(`refresh-${b.id}`).addEventListener('click', () => fetchLiveData(b));
    document.getElementById(`edit-${b.id}`).addEventListener('click', () => openEditBusinessModal(b));
    document.getElementById(`del-${b.id}`).addEventListener('click', () => deleteBusiness(b));
  });
}

function businessCardHtml(b) {
  const owner = OWNERS_CACHE.find((o) => o.id === b.owner_id);
  return `
  <div class="card" id="card-${b.id}">
    <h3>${escapeHtml(b.name)}</h3>
    <div class="meta">${escapeHtml(b.category || 'Uncategorized')} · owner: ${escapeHtml(owner ? owner.email : `#${b.owner_id}`)}</div>
    <div id="live-${b.id}"><span class="live-tag"><span class="dot"></span>tap refresh for live data</span></div>
    <div class="row-actions">
      <button class="ghost small" id="refresh-${b.id}">Refresh live data</button>
      <button class="ghost small" id="edit-${b.id}">Edit</button>
      <button class="danger small" id="del-${b.id}">Delete</button>
    </div>
  </div>`;
}

async function fetchLiveData(business) {
  const el = document.getElementById(`live-${business.id}`);
  el.innerHTML = `<span class="live-tag"><span class="dot"></span>fetching…</span>`;
  try {
    const data = await api(`/businesses/${business.id}/live-data`);
    const { yelp, google, errors } = data;
    let html = `<div class="stat-row">`;
    if (yelp) html += `<div class="stat"><div class="num">${yelp.rating ?? '—'}</div><div class="label">Yelp</div></div>`;
    if (google) html += `<div class="stat"><div class="num">${google.rating ?? '—'}</div><div class="label">Google</div></div>`;
    html += `</div>`;
    if (!yelp && !google) html += `<div class="meta">${(errors || []).join(' · ') || 'No listing match found.'}</div>`;
    el.innerHTML = html;
  } catch (e) {
    el.innerHTML = `<p class="error">${e.message}</p>`;
  }
}

async function deleteBusiness(b) {
  if (!confirm(`Delete "${b.name}"? This cannot be undone.`)) return;
  try {
    await api(`/businesses/${b.id}`, { method: 'DELETE' });
    loadBusinesses();
  } catch (e) {
    alert(e.message);
  }
}

function openNewOwnerModal() {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal">
      <h3>New owner account</h3>
      <p class="meta">They'll get an email invite to set their own password.</p>
      <label>Name</label><input id="o-name" />
      <label>Email</label><input id="o-email" type="email" />
      <div style="display:flex; gap:8px; margin-top:20px; justify-content:flex-end;">
        <button class="ghost" id="o-cancel">Cancel</button>
        <button id="o-save">Send invite</button>
      </div>
      <p class="error hidden" id="o-err"></p>
    </div>`;
  document.body.appendChild(backdrop);
  backdrop.querySelector('#o-cancel').addEventListener('click', () => backdrop.remove());
  backdrop.querySelector('#o-save').addEventListener('click', async () => {
    try {
      await api('/auth/register-owner', {
        method: 'POST',
        body: {
          name: backdrop.querySelector('#o-name').value,
          email: backdrop.querySelector('#o-email').value
        }
      });
      backdrop.remove();
      loadOwners();
    } catch (e) {
      const err = backdrop.querySelector('#o-err');
      err.textContent = e.message;
      err.classList.remove('hidden');
    }
  });
}

function openNewBusinessModal() {
  if (OWNERS_CACHE.length === 0) {
    alert('Create an owner account first, then add their business.');
    return;
  }
  const ownerOptions = OWNERS_CACHE.map((o) => `<option value="${o.id}">${escapeHtml(o.name || o.email)}</option>`).join('');
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal">
      <h3>New business</h3>
      <label>Owner</label>
      <select id="b-owner">${ownerOptions}</select>
      <label>Business name (matched against Yelp/Google in Tempe)</label>
      <input id="b-name" />
      <label>Category</label><input id="b-category" placeholder="Restaurant, Salon, Cafe…" />
      <label>Address</label><input id="b-address" />
      <label>Phone</label><input id="b-phone" />
      <div style="display:flex; gap:8px; margin-top:20px; justify-content:flex-end;">
        <button class="ghost" id="b-cancel">Cancel</button>
        <button id="b-save">Create</button>
      </div>
      <p class="error hidden" id="b-err"></p>
    </div>`;
  document.body.appendChild(backdrop);
  backdrop.querySelector('#b-cancel').addEventListener('click', () => backdrop.remove());
  backdrop.querySelector('#b-save').addEventListener('click', async () => {
    try {
      await api('/businesses', {
        method: 'POST',
        body: {
          owner_id: backdrop.querySelector('#b-owner').value,
          name: backdrop.querySelector('#b-name').value,
          category: backdrop.querySelector('#b-category').value,
          address: backdrop.querySelector('#b-address').value,
          phone: backdrop.querySelector('#b-phone').value
        }
      });
      backdrop.remove();
      loadBusinesses();
    } catch (e) {
      const err = backdrop.querySelector('#b-err');
      err.textContent = e.message;
      err.classList.remove('hidden');
    }
  });
}

function openEditBusinessModal(b) {
  const ownerOptions = OWNERS_CACHE.map((o) => `<option value="${o.id}" ${o.id === b.owner_id ? 'selected' : ''}>${escapeHtml(o.name || o.email)}</option>`).join('');
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal">
      <h3>Edit ${escapeHtml(b.name)}</h3>
      <label>Owner</label>
      <select id="e-owner">${ownerOptions}</select>
      <label>Name</label><input id="e-name" value="${escapeHtml(b.name)}" />
      <label>Category</label><input id="e-category" value="${escapeHtml(b.category || '')}" />
      <label>Address</label><input id="e-address" value="${escapeHtml(b.address || '')}" />
      <label>Phone</label><input id="e-phone" value="${escapeHtml(b.phone || '')}" />
      <div style="display:flex; gap:8px; margin-top:20px; justify-content:flex-end;">
        <button class="ghost" id="e-cancel">Cancel</button>
        <button id="e-save">Save changes</button>
      </div>
      <p class="error hidden" id="e-err"></p>
    </div>`;
  document.body.appendChild(backdrop);
  backdrop.querySelector('#e-cancel').addEventListener('click', () => backdrop.remove());
  backdrop.querySelector('#e-save').addEventListener('click', async () => {
    try {
      await api(`/businesses/${b.id}`, {
        method: 'PUT',
        body: {
          owner_id: backdrop.querySelector('#e-owner').value,
          name: backdrop.querySelector('#e-name').value,
          category: backdrop.querySelector('#e-category').value,
          address: backdrop.querySelector('#e-address').value,
          phone: backdrop.querySelector('#e-phone').value
        }
      });
      backdrop.remove();
      loadBusinesses();
    } catch (e) {
      const err = backdrop.querySelector('#e-err');
      err.textContent = e.message;
      err.classList.remove('hidden');
    }
  });
}
