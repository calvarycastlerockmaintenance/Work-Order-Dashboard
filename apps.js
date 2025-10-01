/***** SET THIS TO YOUR DEPLOYED WEB APP URL (no query string) *****/
const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbwcBt4XJBgd_SunOcvD425reYfF9bz7d2WdEqoG6vINzree0mFIJYRZGUf05NAffPikjw/exec';

/***** DOM *****/
const list = document.getElementById('list');
const statusFilter = document.getElementById('statusFilter');
const categoryFilter = document.getElementById('categoryFilter');
const searchBox = document.getElementById('searchBox');
const refreshBtn = document.getElementById('refreshBtn');

const dlg = document.getElementById('updDlg');
const dlgTicket = document.getElementById('dlgTicket');
const dlgStatus = document.getElementById('dlgStatus');
const dlgName = document.getElementById('dlgName');
const dlgCode = document.getElementById('dlgCode');
const dlgMsg = document.getElementById('dlgMsg');
const dlgSave = document.getElementById('dlgSave');

/***** STATE *****/
let STATUS_OPTIONS = [];
let CATEGORIES = [];
let TICKETS = [];

/***** HELPERS *****/
const qs = (o) => new URL(BACKEND_URL + '?' + new URLSearchParams(o));

function renderFilters() {
  statusFilter.innerHTML = '<option value="">All Statuses</option>' +
    STATUS_OPTIONS.map(s => `<option>${s}</option>`).join('');
  categoryFilter.innerHTML = '<option value="">All Categories</option>' +
    CATEGORIES.map(c => `<option>${c}</option>`).join('');
}

function ticketCard(t) {
  const photos = (t.ImageURLArray || []).map(u => 
    `<a href="${u}" target="_blank" rel="noopener"><img loading="lazy" src="${u}" alt="photo"/></a>`
  ).join('');
  const statusBadge = `<span class="badge">${t.Status || 'Open'}</span>`;
  return `
  <article class="card">
    <div class="head">
      <div>
        <div class="id">${t.TicketID}</div>
        <div class="meta">${t.Category || ''} • ${t.Room || ''}</div>
      </div>
      ${statusBadge}
    </div>
    <div class="desc">${(t.Description||'').replace(/\n/g,'<br>')}</div>
    ${photos ? `<div class="photos">${photos}</div>` : ''}
    <div class="foot">
      <div class="who">${t.Name || ''} • ${t.Email || ''} • ${t.Phone || ''}</div>
      <div class="time">${t.Timestamp || ''}</div>
    </div>
    <div class="actions">
      <button class="btn small" data-upd="${t.TicketID}">Update Status</button>
    </div>
  </article>`;
}

function applyFilters() {
  const s = statusFilter.value.toLowerCase();
  const c = categoryFilter.value.toLowerCase();
  const q = searchBox.value.trim().toLowerCase();
  const filtered = TICKETS.filter(t => {
    const okS = !s || (t.Status||'').toLowerCase() === s;
    const okC = !c || (t.Category||'').toLowerCase() === c;
    const blob = [t.TicketID,t.Name,t.Email,t.Room,t.Description].join(' ').toLowerCase();
    const okQ = !q || blob.includes(q);
    return okS && okC && okQ;
  });
  list.innerHTML = filtered.map(ticketCard).join('') || `<div class="empty">No tickets match.</div>`;
}

async function loadConfig() {
  const r = await fetch(qs({action:'getconfig'}));
  if (!r.ok) throw new Error('config fetch failed');
  const j = await r.json();
  STATUS_OPTIONS = j.statusOptions || ['Open','In Progress','On Hold','Completed','Canceled'];
  CATEGORIES = j.categories || [];
  renderFilters();
  dlgStatus.innerHTML = STATUS_OPTIONS.map(s => `<option>${s}</option>`).join('');
}

async function loadTickets() {
  const r = await fetch(qs({action:'gettickets'}));
  if (!r.ok) throw new Error('tickets fetch failed');
  const j = await r.json();
  TICKETS = Array.isArray(j) ? j : (j.items || []);
  applyFilters();
}

/***** EVENTS *****/
refreshBtn.addEventListener('click', () => loadTickets().catch(()=>{}));
statusFilter.addEventListener('change', applyFilters);
categoryFilter.addEventListener('change', applyFilters);
searchBox.addEventListener('input', applyFilters);

list.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-upd]');
  if (!btn) return;
  const id = btn.getAttribute('data-upd');
  dlgTicket.value = id;
  dlgStatus.value = STATUS_OPTIONS[0] || 'Open';
  dlgName.value = '';
  dlgCode.value = '';
  dlgMsg.textContent = '';
  dlg.showModal();
});

dlgSave.addEventListener('click', async (e) => {
  e.preventDefault();
  dlgMsg.textContent = 'Saving…';
  try {
    const payload = {
      ticketId: dlgTicket.value,
      newStatus: dlgStatus.value,
      maintCode: dlgCode.value,
      updaterName: dlgName.value
    };
    const r = await fetch(qs({action:'updatestatus'}), {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    const j = await r.json();
    if (j.ok) {
      dlgMsg.textContent = '✅ Updated';
      await loadTickets();
      setTimeout(()=>dlg.close(), 250);
    } else {
      dlgMsg.textContent = '❌ ' + (j.error || 'Failed');
    }
  } catch (err) {
    dlgMsg.textContent = '❌ Network error';
  }
});

/***** INIT *****/
(async function init(){
  try {
    await loadConfig();
    await loadTickets();
  } catch (err) {
    list.innerHTML = `<div class="empty">Couldn’t load data. Check BACKEND_URL and deployment access.</div>`;
  }
})();
