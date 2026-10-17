// ============================================================
// app.js — CardControl Frontend Logic — PARTE 1
// ============================================================

// ── STATE ────────────────────────────────────────────────────
const App = {
  user: null,
  data: { people: [], cards: [], purchases: [], parcelas: [] },
  currentPage: 'dashboard',
};

// ── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const raw = sessionStorage.getItem('cc_user');
  if (!raw) { window.location.href = 'index.html'; return; }
  App.user = JSON.parse(raw);

  document.getElementById('sidebarUserName').textContent = App.user.name;
  document.getElementById('sidebarUserRole').textContent = App.user.role === 'admin' ? 'Admin' : 'Usuário';

  if (App.user.role !== 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
  }

  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.addEventListener('click', () => {
      navigateTo(el.dataset.page);
      closeSidebar();
    });
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.clear();
    window.location.href = 'index.html';
  });

  document.getElementById('menuBtn').addEventListener('click', toggleSidebar);
  document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });

  loadAllData().then(() => navigateTo('dashboard'));
});

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('hidden');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.add('hidden');
}

// ── DATA LOADING ─────────────────────────────────────────────
async function loadAllData() {
  try {
    const [people, cards, purchases, parcelas] = await Promise.all([
      API.getPeople(App.user.username),
      API.getCards(App.user.username),
      API.getPurchases(App.user.username),
      API.getParcelas(App.user.username),
    ]);
    if (people.success)    App.data.people    = people.data;
    if (cards.success)     App.data.cards     = cards.data;
    if (purchases.success) App.data.purchases = purchases.data;
    if (parcelas.success)  App.data.parcelas  = parcelas.data;
  } catch(e) { showToast('Erro ao carregar dados', 'error'); }
}

async function refreshData() {
  await loadAllData();
}

// ── NAVIGATION ───────────────────────────────────────────────
function navigateTo(page) {
  App.currentPage = page;
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  const titles = {
    dashboard: 'Dashboard', people: 'Pessoas', cards: 'Cartões',
    purchases: 'Compras', parcelas: 'Parcelas', calendar: 'Calendário',
    closing: 'Fechamento', charges: 'Cobranças', users: 'Usuários', backup: 'Backup'
  };
  document.getElementById('topbarTitle').textContent = titles[page] || page;
  document.getElementById('topbarActions').innerHTML = '';
  const pages = {
    dashboard: renderDashboard, people: renderPeople, cards: renderCards,
    purchases: renderPurchases, parcelas: renderParcelas, calendar: renderCalendar,
    closing: renderClosing, charges: renderCharges, users: renderUsers, backup: renderBackup
  };
  if (pages[page]) pages[page]();
}

// ── TOAST ─────────────────────────────────────────────────────
function showToast(msg, type = 'info', duration = 3500) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

// ── MODAL ─────────────────────────────────────────────────────
function openModal(title, bodyHTML, footerHTML = '') {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('modalFooter').innerHTML = footerHTML;
  document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
}

// ── HELPERS ───────────────────────────────────────────────────
function fmt(val) {
  return 'R$ ' + parseFloat(val || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function fmtDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function personName(id) {
  const p = App.data.people.find(x => x.id === id);
  return p ? p.name : '—';
}

function cardLabel(id) {
  const c = App.data.cards.find(x => x.id === id);
  return c ? `${c.bank} ••••${c.lastDigits}` : '—';
}

function statusBadge(status) {
  const map = {
    paga:     '<span class="badge badge-success">✓ Paga</span>',
    aberta:   '<span class="badge badge-primary">● Aberta</span>',
    atrasada: '<span class="badge badge-danger">! Atrasada</span>',
  };
  return map[status] || `<span class="badge badge-gray">${status}</span>`;
}

// ── DASHBOARD ─────────────────────────────────────────────────
async function renderDashboard() {
  const content = document.getElementById('pageContent');
  content.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><p>Carregando...</p></div>';
  const res = await API.getDashboard(App.user.username);
  if (!res.success) { showToast(res.error, 'error'); return; }
  const d = res.data;

  content.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total em Aberto</div>
        <div class="stat-value primary">${fmt(d.totalAberto)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Atrasado</div>
        <div class="stat-value danger">${fmt(d.totalAtrasado)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Pago este mês</div>
        <div class="stat-value success">${fmt(d.totalPagoMes)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">A vencer este mês</div>
        <div class="stat-value warning">${fmt(d.totalAbertoMes)}</div>
      </div>
    </div>

    ${d.alertas.length ? `
    <div class="card mb-4">
      <div class="card-header"><span class="card-title">⚠️ Alertas</span></div>
      <div class="card-body">
        ${d.alertas.map(a => {
          if (a.type === 'atrasada') return `<div class="alert alert-danger">📛 <b>${personName(a.personId)}</b> — ${a.description} — ${fmt(a.value)} — venceu em ${fmtDate(a.dueDate)}</div>`;
          if (a.type === 'vencendo') return `<div class="alert alert-warning">⏰ <b>${personName(a.personId)}</b> — ${a.description} — ${fmt(a.value)} — vence em ${a.daysUntil === 0 ? 'hoje' : a.daysUntil + 'd'}</div>`;
          if (a.type === 'fechamento') return `<div class="alert alert-info">💳 Cartão <b>${a.bank} ••••${a.lastDigits}</b> fecha em ${a.daysUntil === 0 ? 'hoje' : a.daysUntil + 'd'}</div>`;
          return '';
        }).join('')}
      </div>
    </div>` : ''}

    <div class="card">
      <div class="card-header"><span class="card-title">👥 Devedores</span></div>
      <div class="card-body">
        ${d.devedores.length === 0 ? '<div class="empty-state"><div class="empty-icon">🎉</div><p>Nenhum devedor em aberto!</p></div>' :
        `<div class="table-wrapper"><table>
          <thead><tr><th>Pessoa</th><th class="text-right">Total em Aberto</th></tr></thead>
          <tbody>${d.devedores.map(dev => `
            <tr>
              <td><b>${dev.name}</b></td>
              <td class="text-right"><b>${fmt(dev.total)}</b></td>
            </tr>`).join('')}
          </tbody>
        </table></div>`}
      </div>
    </div>
  `;
}

// ── PESSOAS ───────────────────────────────────────────────────
function renderPeople() {
  const topbar = document.getElementById('topbarActions');
  topbar.innerHTML = `<button class="btn-primary btn-sm" onclick="openPersonModal()">+ Nova Pessoa</button>`;

  const content = document.getElementById('pageContent');
  const people = App.data.people;

  content.innerHTML = `
    <div class="search-bar">
      <input class="search-input" id="peopleSearch" placeholder="Buscar pessoa..." oninput="filterPeople()"/>
    </div>
    <div class="card">
      <div class="card-body" id="peopleTableWrap">
        ${renderPeopleTable(people)}
      </div>
    </div>`;
}

function filterPeople() {
  const q = document.getElementById('peopleSearch').value.toLowerCase();
  const filtered = App.data.people.filter(p => p.name.toLowerCase().includes(q) || String(p.phone).includes(q));
  document.getElementById('peopleTableWrap').innerHTML = renderPeopleTable(filtered);
}

function renderPeopleTable(people) {
  if (!people.length) return '<div class="empty-state"><div class="empty-icon">👥</div><p>Nenhuma pessoa cadastrada.</p></div>';
  return `<div class="table-wrapper"><table>
    <thead><tr><th>Nome</th><th>Telefone</th><th>Observação</th><th>Ações</th></tr></thead>
    <tbody>${people.map(p => `
      <tr>
        <td><b>${p.name}</b></td>
        <td>${p.phone || '—'}</td>
        <td>${p.note || '—'}</td>
        <td>
          <button class="btn-icon" onclick="openPersonModal('${p.id}')" title="Editar">✏️</button>
          <button class="btn-icon" onclick="deletePerson('${p.id}')" title="Excluir">🗑️</button>
        </td>
      </tr>`).join('')}
    </tbody>
  </table></div>`;
}

function openPersonModal(id) {
  const person = id ? App.data.people.find(p => p.id === id) : {};
  const body = `
    <div class="form-group"><label>Nome *</label><input id="pName" value="${person.name || ''}" placeholder="Nome completo"/></div>
    <div class="form-group"><label>Telefone (WhatsApp)</label><input id="pPhone" value="${person.phone || ''}" placeholder="11999999999"/></div>
    <div class="form-group"><label>Observação</label><input id="pNote" value="${person.note || ''}" placeholder="Opcional"/></div>`;
  const footer = `
    <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn-primary" onclick="savePerson('${id || ''}')">Salvar</button>`;
  openModal(id ? 'Editar Pessoa' : 'Nova Pessoa', body, footer);
}

async function savePerson(id) {
  const person = {
    name: document.getElementById('pName').value.trim(),
    phone: document.getElementById('pPhone').value.trim(),
    note: document.getElementById('pNote').value.trim(),
  };
  if (id) person.id = id;
  const res = await API.savePerson(App.user.username, person);
  if (res.success) {
    showToast('Pessoa salva!', 'success');
    closeModal();
    await refreshData();
    renderPeople();
  } else showToast(res.error, 'error');
}

async function deletePerson(id) {
  if (!confirm('Excluir esta pessoa?')) return;
  const res = await API.deletePerson(App.user.username, id);
  if (res.success) {
    showToast('Pessoa excluída.', 'success');
    await refreshData();
    renderPeople();
  } else showToast(res.error, 'error');
}

// ── CARTÕES ───────────────────────────────────────────────────
function renderCards() {
  document.getElementById('topbarActions').innerHTML =
    `<button class="btn-primary btn-sm" onclick="openCardModal()">+ Novo Cartão</button>`;
  const content = document.getElementById('pageContent');
  const cards = App.data.cards;

  content.innerHTML = `
    <div class="card">
      <div class="card-body">
        ${!cards.length ? '<div class="empty-state"><div class="empty-icon">💳</div><p>Nenhum cartão cadastrado.</p></div>' :
        `<div class="table-wrapper"><table>
          <thead><tr><th>Banco</th><th>Final</th><th>Limite</th><th>Fechamento</th><th>Vencimento</th><th>Ações</th></tr></thead>
          <tbody>${cards.map(c => `
            <tr>
              <td><span class="color-dot" style="background:${c.color||'#6366f1'}"></span> <b>${c.bank}</b></td>
              <td>••••${c.lastDigits}</td>
              <td>${c.limit ? fmt(c.limit) : '—'}</td>
              <td>Dia ${c.closingDay || '—'}</td>
              <td>Dia ${c.dueDay || '—'}</td>
              <td>
                <button class="btn-icon" onclick="openCardModal('${c.id}')">✏️</button>
                <button class="btn-icon" onclick="deleteCard('${c.id}')">🗑️</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table></div>`}
      </div>
    </div>`;
}

function openCardModal(id) {
  const c = id ? App.data.cards.find(x => x.id === id) : {};
  const body = `
    <div class="form-grid-2">
      <div class="form-group"><label>Banco *</label><input id="cBank" value="${c.bank||''}" placeholder="Nubank, Itaú..."/></div>
      <div class="form-group"><label>4 Últimos Dígitos *</label><input id="cDigits" value="${c.lastDigits||''}" maxlength="4" placeholder="1234"/></div>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label>Limite</label><input id="cLimit" type="number" value="${c.limit||''}" placeholder="5000"/></div>
      <div class="form-group"><label>Cor</label><input id="cColor" type="color" value="${c.color||'#6366f1'}"/></div>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label>Dia Fechamento</label><input id="cClosing" type="number" min="1" max="31" value="${c.closingDay||''}" placeholder="10"/></div>
      <div class="form-group"><label>Dia Vencimento</label><input id="cDue" type="number" min="1" max="31" value="${c.dueDay||''}" placeholder="17"/></div>
    </div>
    <div class="form-group"><label>Observação</label><input id="cNote" value="${c.note||''}" placeholder="Opcional"/></div>`;
  const footer = `
    <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn-primary" onclick="saveCard('${id||''}')">Salvar</button>`;
  openModal(id ? 'Editar Cartão' : 'Novo Cartão', body, footer);
}

async function saveCard(id) {
  const card = {
    bank: document.getElementById('cBank').value.trim(),
    lastDigits: document.getElementById('cDigits').value.trim(),
    limit: document.getElementById('cLimit').value,
    color: document.getElementById('cColor').value,
    closingDay: document.getElementById('cClosing').value,
    dueDay: document.getElementById('cDue').value,
    note: document.getElementById('cNote').value.trim(),
  };
  if (id) card.id = id;
  const res = await API.saveCard(App.user.username, card);
  if (res.success) {
    showToast('Cartão salvo!', 'success');
    closeModal();
    await refreshData();
    renderCards();
  } else showToast(res.error, 'error');
}

async function deleteCard(id) {
  if (!confirm('Excluir este cartão?')) return;
  const res = await API.deleteCard(App.user.username, id);
  if (res.success) {
    showToast('Cartão excluído.', 'success');
    await refreshData();
    renderCards();
  } else showToast(res.error, 'error');
}
// ── COMPRAS ───────────────────────────────────────────────────
function renderPurchases() {
  document.getElementById('topbarActions').innerHTML =
    `<button class="btn-primary btn-sm" onclick="openPurchaseModal()">+ Nova Compra</button>`;
  const content = document.getElementById('pageContent');
  const purchases = App.data.purchases;

  content.innerHTML = `
    <div class="search-bar">
      <input class="search-input" id="purchSearch" placeholder="Buscar compra..." oninput="filterPurchases()"/>
    </div>
    <div class="card"><div class="card-body" id="purchTableWrap">
      ${renderPurchasesTable(purchases)}
    </div></div>`;
}

function filterPurchases() {
  const q = document.getElementById('purchSearch').value.toLowerCase();
  const filtered = App.data.purchases.filter(p =>
    (p.description||'').toLowerCase().includes(q) ||
    personName(p.personId).toLowerCase().includes(q)
  );
  document.getElementById('purchTableWrap').innerHTML = renderPurchasesTable(filtered);
}

function renderPurchasesTable(purchases) {
  if (!purchases.length) return '<div class="empty-state"><div class="empty-icon">🛒</div><p>Nenhuma compra registrada.</p></div>';
  return `<div class="table-wrapper"><table>
    <thead><tr><th>Pessoa</th><th>Cartão</th><th>Descrição</th><th>Valor</th><th>Parcelas</th><th>Data</th><th>Ações</th></tr></thead>
    <tbody>${purchases.map(p => `
      <tr>
        <td>${personName(p.personId)}</td>
        <td>${cardLabel(p.cardId)}</td>
        <td>${p.description||'—'}</td>
        <td>${fmt(p.totalValue)}</td>
        <td>${p.installments}x</td>
        <td>${fmtDate(p.purchaseDate)}</td>
        <td>
          <button class="btn-icon" onclick="openPurchaseModal('${p.id}')">✏️</button>
          <button class="btn-icon" onclick="deletePurchase('${p.id}')">🗑️</button>
        </td>
      </tr>`).join('')}
    </tbody>
  </table></div>`;
}

function openPurchaseModal(id) {
  const p = id ? App.data.purchases.find(x => x.id === id) : {};
  const peopleOpts = App.data.people.map(x => `<option value="${x.id}" ${p.personId===x.id?'selected':''}>${x.name}</option>`).join('');
  const cardOpts   = App.data.cards.map(x => `<option value="${x.id}" ${p.cardId===x.id?'selected':''}>${x.bank} ••••${x.lastDigits}</option>`).join('');
  const body = `
    <div class="form-group"><label>Pessoa *</label><select id="pPerson"><option value="">Selecione</option>${peopleOpts}</select></div>
    <div class="form-group"><label>Cartão *</label><select id="pCard"><option value="">Selecione</option>${cardOpts}</select></div>
    <div class="form-group"><label>Descrição</label><input id="pDesc" value="${p.description||''}" placeholder="Ex: Compra no Mercado"/></div>
    <div class="form-grid-2">
      <div class="form-group"><label>Valor Total *</label><input id="pValue" type="number" step="0.01" value="${p.totalValue||''}" placeholder="0,00"/></div>
      <div class="form-group"><label>Parcelas *</label><input id="pInst" type="number" min="1" value="${p.installments||1}"/></div>
    </div>
    <div class="form-group"><label>Data da Compra</label><input id="pDate" type="date" value="${p.purchaseDate?p.purchaseDate.toString().split('T')[0]:''}"/></div>`;
  const footer = `
    <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn-primary" onclick="savePurchase('${id||''}')">Salvar</button>`;
  openModal(id ? 'Editar Compra' : 'Nova Compra', body, footer);
}

async function savePurchase(id) {
  const purchase = {
    personId: document.getElementById('pPerson').value,
    cardId: document.getElementById('pCard').value,
    description: document.getElementById('pDesc').value.trim(),
    totalValue: parseFloat(document.getElementById('pValue').value) || 0,
    installments: parseInt(document.getElementById('pInst').value) || 1,
    purchaseDate: document.getElementById('pDate').value || new Date().toISOString().split('T')[0],
  };
  if (id) purchase.id = id;
  const res = await API.savePurchase(App.user.username, purchase);
  if (res.success) {
    showToast('Compra salva!', 'success');
    closeModal();
    await refreshData();
    renderPurchases();
  } else showToast(res.error, 'error');
}

async function deletePurchase(id) {
  if (!confirm('Excluir esta compra e todas as parcelas?')) return;
  const res = await API.deletePurchase(App.user.username, id);
  if (res.success) {
    showToast('Compra excluída.', 'success');
    await refreshData();
    renderPurchases();
  } else showToast(res.error, 'error');
}

// ── PARCELAS ──────────────────────────────────────────────────
function renderParcelas() {
  document.getElementById('topbarActions').innerHTML = '';
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="filter-chips">
      <span class="chip active" onclick="filterParcelas('todas', this)">Todas</span>
      <span class="chip" onclick="filterParcelas('aberta', this)">Abertas</span>
      <span class="chip" onclick="filterParcelas('atrasada', this)">Atrasadas</span>
      <span class="chip" onclick="filterParcelas('paga', this)">Pagas</span>
    </div>
    <div class="card"><div class="card-body" id="parcelasWrap">
      ${renderParcelasTable(App.data.parcelas)}
    </div></div>`;
}

function filterParcelas(status, el) {
  document.querySelectorAll('.filter-chips .chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  const filtered = status === 'todas' ? App.data.parcelas : App.data.parcelas.filter(p => p.status === status);
  document.getElementById('parcelasWrap').innerHTML = renderParcelasTable(filtered);
}

function renderParcelasTable(parcelas) {
  if (!parcelas.length) return '<div class="empty-state"><div class="empty-icon">📋</div><p>Nenhuma parcela encontrada.</p></div>';
  return `<div class="table-wrapper"><table>
    <thead><tr>
      <th><input type="checkbox" id="checkAll" onchange="toggleAllParcelas(this)"/></th>
      <th>Pessoa</th><th>Descrição</th><th>Parcela</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>Ações</th>
    </tr></thead>
    <tbody>${parcelas.map(p => `
      <tr>
        <td><input type="checkbox" class="parc-check" value="${p.id}" ${p.status==='paga'?'disabled':''}></td>
        <td>${personName(p.personId)}</td>
        <td>${p.description||'—'}</td>
        <td>${p.number}/${p.totalInstallments}</td>
        <td>${fmt(p.value)}</td>
        <td>${fmtDate(p.dueDate)}</td>
        <td>${statusBadge(p.status)}</td>
        <td>
          ${p.status !== 'paga'
            ? `<button class="btn-icon" title="Marcar paga" onclick="markOnePaid('${p.id}')">✅</button>`
            : `<button class="btn-icon" title="Desmarcar" onclick="unmarkPaid('${p.id}')">↩️</button>`}
          <button class="btn-icon" title="Renegociar" onclick="openRenegModal('${p.id}')">🔄</button>
          <button class="btn-icon" title="Editar" onclick="openParcelaEditModal('${p.id}')">✏️</button>
          <button class="btn-icon" title="Excluir" onclick="deleteParcela('${p.id}')">🗑️</button>
        </td>
      </tr>`).join('')}
    </tbody>
  </table></div>
  <div class="flex items-center gap-2 mt-4">
    <button class="btn-primary btn-sm" onclick="markSelectedPaid()">✅ Marcar Selecionadas como Pagas</button>
  </div>`;
}

function toggleAllParcelas(el) {
  document.querySelectorAll('.parc-check:not(:disabled)').forEach(c => c.checked = el.checked);
}

async function markOnePaid(id) {
  const res = await API.markPaid(App.user.username, [id], new Date().toISOString().split('T')[0]);
  if (res.success) { showToast('Parcela marcada como paga!', 'success'); await refreshData(); renderParcelas(); }
  else showToast(res.error, 'error');
}

async function unmarkPaid(id) {
  const res = await API.unmarkPaid(App.user.username, id);
  if (res.success) { showToast('Parcela desmarcada.', 'success'); await refreshData(); renderParcelas(); }
  else showToast(res.error, 'error');
}

async function markSelectedPaid() {
  const ids = [...document.querySelectorAll('.parc-check:checked')].map(c => c.value);
  if (!ids.length) { showToast('Selecione ao menos uma parcela.', 'warning'); return; }
  const res = await API.markPaid(App.user.username, ids, new Date().toISOString().split('T')[0]);
  if (res.success) { showToast(`${ids.length} parcela(s) pagas!`, 'success'); await refreshData(); renderParcelas(); }
  else showToast(res.error, 'error');
}

async function deleteParcela(id) {
  if (!confirm('Excluir esta parcela?')) return;
  const res = await API.deleteParcela(App.user.username, id);
  if (res.success) { showToast('Parcela excluída.', 'success'); await refreshData(); renderParcelas(); }
  else showToast(res.error, 'error');
}

function openParcelaEditModal(id) {
  const p = App.data.parcelas.find(x => x.id === id);
  if (!p) return;
  const body = `
    <div class="form-group"><label>Valor</label><input id="eValue" type="number" step="0.01" value="${p.value}"/></div>
    <div class="form-group"><label>Vencimento</label><input id="eDue" type="date" value="${p.dueDate?p.dueDate.toString().split('T')[0]:''}"/></div>
    <div class="form-group"><label>Observação</label><input id="eNote" value="${p.note||''}"/></div>`;
  const footer = `
    <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn-primary" onclick="saveParcelaEdit('${id}')">Salvar</button>`;
  openModal('Editar Parcela', body, footer);
}

async function saveParcelaEdit(id) {
  const p = App.data.parcelas.find(x => x.id === id);
  const updated = { ...p, value: parseFloat(document.getElementById('eValue').value), dueDate: document.getElementById('eDue').value, note: document.getElementById('eNote').value };
  const res = await API.updateParcela(App.user.username, updated);
  if (res.success) { showToast('Parcela atualizada!', 'success'); closeModal(); await refreshData(); renderParcelas(); }
  else showToast(res.error, 'error');
}

function openRenegModal(id) {
  const body = `
    <div class="form-group"><label>Dividir em quantas parcelas?</label>
    <input id="renegN" type="number" min="2" value="2" placeholder="Mínimo 2"/></div>`;
  const footer = `
    <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn-primary" onclick="doRenegotiate('${id}')">Renegociar</button>`;
  openModal('Renegociar Parcela', body, footer);
}

async function doRenegotiate(id) {
  const n = parseInt(document.getElementById('renegN').value);
  if (n < 2) { showToast('Mínimo 2 parcelas.', 'warning'); return; }
  const res = await API.renegotiate(App.user.username, id, n);
  if (res.success) { showToast('Parcela renegociada!', 'success'); closeModal(); await refreshData(); renderParcelas(); }
  else showToast(res.error, 'error');
}

// ── CALENDÁRIO ────────────────────────────────────────────────
function renderCalendar() {
  document.getElementById('topbarActions').innerHTML = '';
  const now = new Date();
  let month = now.getMonth(), year = now.getFullYear();
  drawCalendar(month, year);
}

function drawCalendar(month, year) {
  const content = document.getElementById('pageContent');
  const monthName = new Date(year, month, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const parcelas = App.data.parcelas.filter(p => {
    const d = new Date(p.dueDate);
    return d.getMonth() === month && d.getFullYear() === year;
  });

  const dayMap = {};
  parcelas.forEach(p => {
    const d = new Date(p.dueDate);
    const day = d.getUTCDate();
    if (!dayMap[day]) dayMap[day] = [];
    dayMap[day].push(p);
  });

  let cells = '';
  for (let i = 0; i < firstDay; i++) cells += '<div></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
    const events = (dayMap[d] || []).slice(0, 3).map(p =>
      `<div class="cal-event ${p.status}" title="${personName(p.personId)} — ${fmt(p.value)}">${personName(p.personId).split(' ')[0]} ${fmt(p.value)}</div>`
    ).join('');
    const more = (dayMap[d]||[]).length > 3 ? `<div class="cal-event aberta">+${(dayMap[d]||[]).length - 3} mais</div>` : '';
    cells += `<div class="cal-day ${isToday ? 'today' : ''}"><div class="cal-day-num">${d}</div>${events}${more}</div>`;
  }

  content.innerHTML = `
    <div class="card">
      <div class="card-header" style="padding:20px">
        <button class="btn-secondary btn-sm" onclick="drawCalendar(${month === 0 ? 11 : month - 1}, ${month === 0 ? year - 1 : year})">‹ Anterior</button>
        <span class="card-title" style="text-transform:capitalize">${monthName}</span>
        <button class="btn-secondary btn-sm" onclick="drawCalendar(${month === 11 ? 0 : month + 1}, ${month === 11 ? year + 1 : year})">Próximo ›</button>
      </div>
      <div class="card-body">
        <div class="calendar-grid">
          ${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => `<div class="cal-header">${d}</div>`).join('')}
          ${cells}
        </div>
      </div>
    </div>`;
}

// ── FECHAMENTO ────────────────────────────────────────────────
function renderClosing() {
  document.getElementById('topbarActions').innerHTML = '';
  const now = new Date();
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="card mb-4">
      <div class="card-body">
        <div class="flex items-center gap-2 flex-wrap">
          <div class="form-group" style="margin:0">
            <select id="closingMonth">
              ${Array.from({length:12},(_,i) => `<option value="${i+1}" ${i===now.getMonth()?'selected':''}>${new Date(2000,i,1).toLocaleString('pt-BR',{month:'long'})}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="margin:0">
            <input id="closingYear" type="number" value="${now.getFullYear()}" style="width:90px"/>
          </div>
          <button class="btn-primary btn-sm" onclick="loadClosing()">Buscar</button>
        </div>
      </div>
    </div>
    <div id="closingResult"></div>`;
  loadClosing();
}

async function loadClosing() {
  const month = document.getElementById('closingMonth').value;
  const year  = document.getElementById('closingYear').value;
  const res   = await API.getClosing(App.user.username, month, year);
  const wrap  = document.getElementById('closingResult');
  if (!res.success) { wrap.innerHTML = `<div class="alert alert-danger">${res.error}</div>`; return; }
  if (!res.data.length) { wrap.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div><p>Nenhum dado para este período.</p></div>'; return; }

  wrap.innerHTML = res.data.map(d => `
    <div class="card mb-4">
      <div class="card-header">
        <span class="card-title">👤 ${d.name}</span>
        <div class="flex gap-2">
          <span class="badge badge-danger">Aberto: ${fmt(d.aberto)}</span>
          <span class="badge badge-success">Pago: ${fmt(d.pago)}</span>
          <button class="btn-primary btn-sm" onclick="openChargeModal('${d.personId}','${month}','${year}')">💬 Cobrar</button>
        </div>
      </div>
      <div class="card-body">
        <div class="table-wrapper"><table>
          <thead><tr><th>Descrição</th><th>Parcela</th><th>Valor</th><th>Vencimento</th><th>Status</th></tr></thead>
          <tbody>${d.parcelas.map(p => `
            <tr>
              <td>${p.description||'—'}</td>
              <td>${p.number}/${p.totalInstallments}</td>
              <td>${fmt(p.value)}</td>
              <td>${fmtDate(p.dueDate)}</td>
              <td>${statusBadge(p.status)}</td>
            </tr>`).join('')}
          </tbody>
        </table></div>
      </div>
    </div>`).join('');
}

// ── COBRANÇAS ─────────────────────────────────────────────────
function renderCharges() {
  document.getElementById('topbarActions').innerHTML = '';
  const content = document.getElementById('pageContent');
  content.innerHTML = `<div class="card"><div class="card-body" id="chargesWrap"><div class="empty-state"><div class="empty-icon">⏳</div><p>Carregando...</p></div></div></div>`;
  API.getCharges(App.user.username).then(res => {
    if (!res.success) { document.getElementById('chargesWrap').innerHTML = `<div class="alert alert-danger">${res.error}</div>`; return; }
    const charges = res.data;
    if (!charges.length) { document.getElementById('chargesWrap').innerHTML = '<div class="empty-state"><div class="empty-icon">💬</div><p>Nenhuma cobrança registrada.</p></div>'; return; }
    document.getElementById('chargesWrap').innerHTML = `<div class="table-wrapper"><table>
      <thead><tr><th>Pessoa</th><th>Período</th><th>Enviado em</th><th>Método</th></tr></thead>
      <tbody>${charges.map(c => `
        <tr>
          <td>${personName(c.personId)}</td>
          <td>${c.period||'—'}</td>
          <td>${fmtDate(c.sentAt)}</td>
          <td>${c.method||'—'}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
  });
}

function openChargeModal(personId, month, year) {
  const person = App.data.people.find(p => p.id === personId);
  if (!person) return;
  const parcelas = App.data.parcelas.filter(p =>
    p.personId === personId && p.status !== 'paga'
  );
  const total = parcelas.reduce((s, p) => s + (parseFloat(p.value)||0), 0);
  const monthName = new Date(year, parseInt(month)-1, 1).toLocaleString('pt-BR', { month: 'long' });

  const msg = `Olá, ${person.name}! 😊\n\nSegue seu resumo de *${monthName}/${year}*:\n\n` +
    parcelas.map(p => `• ${p.description||'Compra'} — Parcela ${p.number}/${p.totalInstallments} — *${fmt(p.value)}* — Vence: ${fmtDate(p.dueDate)}`).join('\n') +
    `\n\n*Total em aberto: ${fmt(total)}*\n\nQualquer dúvida, me avise! 🙏`;

  const body = `
    <div class="form-group"><label>Mensagem para envio</label>
    <textarea id="chargeMsg" rows="10" style="font-family:monospace;font-size:12px">${msg}</textarea></div>`;
  const footer = `
    <button class="btn-secondary" onclick="closeModal()">Fechar</button>
    ${person.phone ? `<button class="btn-primary" onclick="sendWhatsApp('${personId}','${month}','${year}','${person.phone}')">📱 WhatsApp</button>` : ''}
    <button class="btn-primary" onclick="registerCharge('${personId}','${month}/${year}')">✓ Registrar</button>`;
  openModal(`Cobrança — ${person.name}`, body, footer);
}

function sendWhatsApp(personId, month, year, phone) {
  const msg = document.getElementById('chargeMsg').value;
  const clean = phone.replace(/\D/g, '');
  window.open(`https://wa.me/55${clean}?text=${encodeURIComponent(msg)}`, '_blank');
  registerCharge(personId, `${month}/${year}`);
}

async function registerCharge(personId, period) {
  const charge = { personId, period, method: 'whatsapp', preview: document.getElementById('chargeMsg')?.value || '' };
  const res = await API.saveCharge(App.user.username, charge);
  if (res.success) { showToast('Cobrança registrada!', 'success'); closeModal(); }
  else showToast(res.error, 'error');
}

// ── USUÁRIOS (ADMIN) ──────────────────────────────────────────
function renderUsers() {
  if (App.user.role !== 'admin') { navigateTo('dashboard'); return; }
  document.getElementById('topbarActions').innerHTML =
    `<button class="btn-primary btn-sm" onclick="openCreateUserModal()">+ Novo Usuário</button>`;
  const content = document.getElementById('pageContent');
  content.innerHTML = `<div class="card"><div class="card-body" id="usersWrap"><div class="empty-state"><div class="empty-icon">⏳</div><p>Carregando...</p></div></div></div>`;

  API.getUsers(App.user.username).then(res => {
    if (!res.success) { document.getElementById('usersWrap').innerHTML = `<div class="alert alert-danger">${res.error}</div>`; return; }
    const users = res.data;
    document.getElementById('usersWrap').innerHTML = `<div class="table-wrapper"><table>
      <thead><tr><th>Nome</th><th>Usuário</th><th>Perfil</th><th>Criado em</th><th>Ações</th></tr></thead>
      <tbody>${users.map(u => `
        <tr>
          <td><b>${u.name}</b></td>
          <td>${u.username}</td>
          <td><span class="badge ${u.role==='admin'?'badge-primary':'badge-gray'}">${u.role}</span></td>
          <td>${fmtDate(u.createdAt)}</td>
          <td>${u.username !== 'admin' ? `<button class="btn-icon" onclick="deleteUser('${u.username}')">🗑️</button>` : '—'}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
  });
}

function openCreateUserModal() {
  const body = `
    <div class="form-group"><label>Nome completo *</label><input id="uName" placeholder="João Silva"/></div>
    <div class="form-group"><label>Usuário *</label><input id="uUser" placeholder="joao"/></div>
    <div class="form-group"><label>Senha *</label><input id="uPass" type="password" placeholder="Senha inicial"/></div>`;
  const footer = `
    <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn-primary" onclick="createUser()">Criar</button>`;
  openModal('Novo Usuário', body, footer);
}

async function createUser() {
  const newUser = {
    name: document.getElementById('uName').value.trim(),
    username: document.getElementById('uUser').value.trim(),
    password: document.getElementById('uPass').value,
  };
  if (!newUser.name || !newUser.username || !newUser.password) { showToast('Preencha todos os campos.', 'warning'); return; }
  const res = await API.createUser(App.user.username, newUser);
  if (res.success) { showToast('Usuário criado!', 'success'); closeModal(); renderUsers(); }
  else showToast(res.error, 'error');
}

async function deleteUser(targetUsername) {
  if (!confirm(`Excluir usuário "${targetUsername}" e todos os dados dele?`)) return;
  const res = await API.deleteUser(App.user.username, targetUsername);
  if (res.success) { showToast('Usuário excluído.', 'success'); renderUsers(); }
  else showToast(res.error, 'error');
}

// ── BACKUP (ADMIN) ────────────────────────────────────────────
function renderBackup() {
  if (App.user.role !== 'admin') { navigateTo('dashboard'); return; }
  document.getElementById('topbarActions').innerHTML = '';
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="card mb-4">
      <div class="card-header"><span class="card-title">💾 Backup Geral</span></div>
      <div class="card-body">
        <p style="color:var(--text2);margin-bottom:16px">Cria uma cópia completa da planilha no seu Google Drive.</p>
        <button class="btn-primary" onclick="doBackup()">🔄 Fazer Backup Agora</button>
        <div id="backupResult" style="margin-top:16px"></div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title">📋 Histórico de Backups</span></div>
      <div class="card-body" id="backupLog"><div class="empty-state"><div class="empty-icon">⏳</div><p>Carregando...</p></div></div>
    </div>`;
  loadBackupLog();
}

async function doBackup() {
  const btn = event.target;
  btn.disabled = true; btn.textContent = '⏳ Fazendo backup...';
  const res = await API.triggerBackup(App.user.username);
  btn.disabled = false; btn.textContent = '🔄 Fazer Backup Agora';
  if (res.success) {
    document.getElementById('backupResult').innerHTML =
      `<div class="alert alert-success">✅ Backup criado! <a href="${res.data.url}" target="_blank">Abrir no Drive</a></div>`;
    loadBackupLog();
  } else {
    document.getElementById('backupResult').innerHTML = `<div class="alert alert-danger">${res.error}</div>`;
  }
}

async function loadBackupLog() {
  const res = await API.getBackupLog(App.user.username);
  const wrap = document.getElementById('backupLog');
  if (!res.success || !res.data.length) { wrap.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>Nenhum backup registrado.</p></div>'; return; }
  wrap.innerHTML = `<div class="table-wrapper"><table>
    <thead><tr><th>Data</th><th>Tipo</th><th>Status</th><th>Link</th></tr></thead>
    <tbody>${res.data.map(b => `
      <tr>
        <td>${fmtDate(b.triggeredAt)}</td>
        <td>${b.type}</td>
        <td><span class="badge ${b.status==='success'?'badge-success':'badge-danger'}">${b.status}</span></td>
        <td>${b.detail ? `<a href="${b.detail}" target="_blank">Abrir</a>` : '—'}</td>
      </tr>`).join('')}
    </tbody>
  </table></div>`;
}