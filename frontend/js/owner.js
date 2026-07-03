const user = Auth.requireRole('business_owner');
if (user) {
  document.getElementById('who-name').textContent = `${user.name || user.email} · owner`;
  document.getElementById('logout').addEventListener('click', () => { Auth.clear(); window.location.href = '/index.html'; });
  document.getElementById('delete-account').addEventListener('click', async () => {
    if (!confirm('Delete your account and business permanently? This cannot be undone.')) return;
    try {
      await api('/auth/me', { method: 'DELETE' });
      Auth.clear();
      window.location.href = '/index.html';
    } catch (e) {
      alert(e.message);
    }
  });
  loadBusinesses();
}

async function loadBusinesses() {
  const content = document.getElementById('content');
  let businesses;
  try {
    businesses = await api('/businesses');
  } catch (e) {
    content.innerHTML = `<p class="error">${e.message}</p>`;
    return;
  }

  if (businesses.length === 0) {
    content.innerHTML = `<div class="empty">No business assigned to your account yet. Ask your admin to link one.</div>`;
    return;
  }

  content.innerHTML = businesses.map(businessCardHtml).join('');
  businesses.forEach((b) => {
    document.getElementById(`refresh-${b.id}`).addEventListener('click', () => fetchLiveData(b));
    document.getElementById(`edit-${b.id}`).addEventListener('click', () => openEditModal(b));
  });

  // Bind chatbot to the first business
  initChatbot(businesses[0].id);
  // Auto-pull live data for the first business on load
  fetchLiveData(businesses[0]);
}

function businessCardHtml(b) {
  return `
  <div class="card" id="card-${b.id}" style="margin-bottom:20px;">
    <div style="display:flex; justify-content:space-between; align-items:start;">
      <div>
        <h3>${escapeHtml(b.name)}</h3>
        <div class="meta">${escapeHtml(b.category || 'Uncategorized')} · ${escapeHtml(b.address || 'No address on file')}</div>
      </div>
      <div class="row-actions">
        <button class="ghost small" id="refresh-${b.id}">Refresh live data</button>
        <button class="ghost small" id="edit-${b.id}">Edit details</button>
      </div>
    </div>
    <div id="live-${b.id}"><span class="live-tag"><span class="dot"></span>fetching live data…</span></div>
  </div>`;
}

async function fetchLiveData(business) {
  const el = document.getElementById(`live-${business.id}`);
  el.innerHTML = `<span class="live-tag"><span class="dot"></span>fetching live data…</span>`;
  try {
    const data = await api(`/businesses/${business.id}/live-data`);
    el.innerHTML = renderLiveData(data);
  } catch (e) {
    el.innerHTML = `<p class="error">${e.message}</p>`;
  }
}

function renderLiveData(data) {
  const { yelp, google, errors } = data;
  let html = `<div class="stat-row">`;
  if (yelp) {
    html += stat(yelp.rating != null ? yelp.rating.toFixed(1) : '—', 'Yelp rating');
    html += stat(yelp.review_count ?? '—', 'Yelp reviews');
  }
  if (google) {
    html += stat(google.rating != null ? google.rating.toFixed(1) : '—', 'Google rating');
    html += stat(google.review_count ?? '—', 'Google reviews');
    html += stat(google.is_open_now === null ? '—' : (google.is_open_now ? 'Open' : 'Closed'), 'Right now');
  }
  html += `</div>`;

  if (!yelp && !google) {
    html += `<div class="empty">No live data yet. ${errors && errors.length ? errors.join(' · ') : 'Add a Yelp/Google API key or check that the business name matches a listing in Tempe.'}</div>`;
  }

  if (google && google.reviews && google.reviews.length) {
    html += `<div class="reviews"><div class="eyebrow" style="margin-bottom:6px;">Recent Google reviews</div>`;
    google.reviews.forEach((r) => {
      html += `<div class="review"><div class="rev-head"><span>${escapeHtml(r.author)}</span><span>${r.rating}★ · ${escapeHtml(r.time || '')}</span></div>${escapeHtml(r.text || '')}</div>`;
    });
    html += `</div>`;
  }

  if (errors && errors.length && (yelp || google)) {
    html += `<p class="meta" style="margin-top:10px;">${errors.join(' · ')}</p>`;
  }

  return html;
}

function stat(num, label) {
  return `<div class="stat"><div class="num">${num}</div><div class="label">${label}</div></div>`;
}

function openEditModal(b) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal">
      <h3>Edit ${escapeHtml(b.name)}</h3>
      <label>Category</label>
      <input id="m-category" value="${escapeHtml(b.category || '')}" />
      <label>Address</label>
      <input id="m-address" value="${escapeHtml(b.address || '')}" />
      <label>Phone</label>
      <input id="m-phone" value="${escapeHtml(b.phone || '')}" />
      <div style="display:flex; gap:8px; margin-top:20px; justify-content:flex-end;">
        <button class="ghost" id="m-cancel">Cancel</button>
        <button id="m-save">Save changes</button>
      </div>
      <p class="error hidden" id="m-err"></p>
    </div>`;
  document.body.appendChild(backdrop);

  backdrop.querySelector('#m-cancel').addEventListener('click', () => backdrop.remove());
  backdrop.querySelector('#m-save').addEventListener('click', async () => {
    try {
      await api(`/businesses/${b.id}`, {
        method: 'PUT',
        body: {
          category: backdrop.querySelector('#m-category').value,
          address: backdrop.querySelector('#m-address').value,
          phone: backdrop.querySelector('#m-phone').value
        }
      });
      backdrop.remove();
      loadBusinesses();
    } catch (e) {
      const err = backdrop.querySelector('#m-err');
      err.textContent = e.message;
      err.classList.remove('hidden');
    }
  });
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
