// ============================================================
// app.js — CardControl — Lógica completa do frontend
// ============================================================

const App = {
  user: null,
  data: { people: [], cards: [], purchases: [], parcelas: [] },
  currentPage: 'dashboard',
};

// ── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const raw = sessionStorage.getItem('cc_user') || localStorage.getItem('cardcontrol_session');
  if (!raw) { window.location.href = 'index.html'; return; }
  App.user = JSON.parse(raw);

  document.getElementById('sidebarUserName').textContent = App.user.name;
  document.getElementById('sidebarUserRole').textContent = App.user.role === 'admin' ? 'Admin' : 'Usuário';

  if (App.user.role !== 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
  }

  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.addEventListener('click', () => { navigateTo(el.dataset.page); closeSidebar(); });
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.clear();
    localStorage.removeItem('cardcontrol_session');
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

// ── DATA ─────────────────────────────────────────────────────
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
async function refreshData() { await loadAllData(); }

// ── NAVIGATION ───────────────────────────────────────────────
function navigateTo(page) {
  App.currentPage = page;
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  const titles = {
    dashboard:'Dashboard', people:'Pessoas', cards:'Cartões',
    purchases:'Compras', parcelas:'Parcelas', calendar:'Calendário',
    closing:'Fechamento', charges:'Cobranças', users:'Usuários', backup:'Backup'
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
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), duration);
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
  return 'R$ ' + parseFloat(val||0).toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.');
}
function fmtDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  return isNaN(d) ? str : d.toLocaleDateString('pt-BR',{timeZone:'UTC'});
}
function personName(id) {
  const p = App.data.people.find(x => x.id === id);
  return p ? p.name : '—';
}
function cardLabel(id) {
  const c = App.data.cards.find(x => x.id === id);
  return c ? `${c.bank} ••••${c.lastDigits}` : '—';
}
function statusBadge(s) {
  const map = {
    paga:     '<span class="badge badge-success">✓ Paga</span>',
    aberta:   '<span class="badge badge-primary">● Aberta</span>',
    atrasada: '<span class="badge badge-danger">! Atrasada</span>',
  };
  return map[s] || `<span class="badge badge-gray">${s}</span>`;
}

// ── DASHBOARD ─────────────────────────────────────────────────
async function renderDashboard() {
  const content = document.getElementById('pageContent');
  content.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><p>Carregando...</p></div>';
  const res = await API.getDashboard(App.user.username);
  if (!res.success) { showToast(res.error,'error'); return; }
  const d = res.data;
  content.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total do Mês</div>
        <div class="stat-value primary">${fmt(d.totalMes)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Pago</div>
        <div class="stat-value success">${fmt(d.totalPago)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Em Aberto</div>
        <div class="stat-value warning">${fmt(d.totalAberto)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Atrasadas</div>
        <div class="stat-value danger">${d.atrasadas} parcela(s)</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Vencem em 7 dias</div>
        <div class="stat-value info">${d.proximosDias} parcela(s)</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Cartões</div>
        <div class="stat-value">${d.totalCartoes}</div>
      </div>
    </div>
    ${d.alertasFechamento && d.alertasFechamento.length ? `
    <div class="card mb-4">
      <div class="card-header"><span class="card-title">⚠️ Fechamento Próximo</span></div>
      <div class="card-body">
        ${d.alertasFechamento.map(a => `
          <div class="alert alert-warning">
            💳 <b>${a.card.bank} ••••${a.card.lastDigits}</b> fecha em <b>${a.daysLeft === 0 ? 'hoje' : a.daysLeft + ' dia(s)'}</b>
          </div>`).join('')}
      </div>
    </div>` : ''}
    <div class="card">
      <div class="card-header"><span class="card-title">📋 Parcelas deste Mês</span></div>
      <div class="card-body">
        ${!d.parcelasDoMes || !d.parcelasDoMes.length
          ? '<div class="empty-state"><div class="empty-icon">🎉</div><p>Nenhuma parcela este mês.</p></div>'
          : `<div class="table-wrapper"><table>
              <thead><tr><th>Pessoa</th><th>Descrição</th><th>Vencimento</th><th class="text-right">Valor</th><th>Status</th></tr></thead>
              <tbody>${d.parcelasDoMes.map(p => `
                <tr>
                  <td>${personName(p.personId)}</td>
                  <td>${p.description} <small>${p.number}/${p.totalInstallments}</small></td>
                  <td>${fmtDate(p.dueDate)}</td>
                  <td class="text-right">${fmt(p.value)}</td>
                  <td>${statusBadge(p.status)}</td>
                </tr>`).join('')}
              </tbody>
            </table></div>`}
      </div>
    </div>`;
}

// ── PESSOAS ───────────────────────────────────────────────────
function renderPeople() {
  document.getElementById('topbarActions').innerHTML =
    `<button class="btn-primary btn-sm" onclick="openPersonModal()">+ Nova Pessoa</button>`;
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="search-bar">
      <input class="search-input" id="peopleSearch" placeholder="Buscar pessoa..." oninput="filterPeople()"/>
    </div>
    <div class="card">
      <div class="card-body" id="peopleTableWrap">${renderPeopleTable(App.data.people)}</div>
    </div>`;
}
function filterPeople() {
  const q = document.getElementById('peopleSearch').value.toLowerCase();
  const f = App.data.people.filter(p => p.name.toLowerCase().includes(q) || String(p.phone).includes(q));
  document.getElementById('peopleTableWrap').innerHTML = renderPeopleTable(f);
}
function renderPeopleTable(people) {
  if (!people.length) return '<div class="empty-state"><div class="empty-icon">👥</div><p>Nenhuma pessoa cadastrada.</p></div>';
  return `<div class="table-wrapper"><table>
    <thead><tr><th>Nome</th><th>Telefone</th><th>Observação</th><th>Ações</th></tr></thead>
    <tbody>${people.map(p => `
      <tr>
        <td><b>${p.name}</b></td>
        <td>${p.phone||'—'}</td>
        <td>${p.note||'—'}</td>
        <td>
          <button class="btn-icon" onclick="openPersonModal('${p.id}')">✏️</button>
          <button class="btn-icon" onclick="deletePerson('${p.id}')">🗑️</button>
        </td>
      </tr>`).join('')}
    </tbody></table></div>`;
}
function openPersonModal(id) {
  const p = id ? App.data.people.find(x => x.id === id) : {};
  openModal(id ? 'Editar Pessoa' : 'Nova Pessoa', `
    <div class="form-group"><label>Nome *</label><input id="pName" value="${p.name||''}" placeholder="Nome completo"/></div>
    <div class="form-group"><label>Telefone (WhatsApp)</label><input id="pPhone" value="${p.phone||''}" placeholder="11999999999"/></div>
    <div class="form-group"><label>Observação</label><input id="pNote" value="${p.note||''}" placeholder="Opcional"/></div>`,
    `<button class="btn-secondary" onclick="closeModal()">Cancelar</button>
     <button class="btn-primary" onclick="savePerson('${id||''}')">Salvar</button>`);
}
async function savePerson(id) {
  const person = { name: document.getElementById('pName').value.trim(), phone: document.getElementById('pPhone').value.trim(), note: document.getElementById('pNote').value.trim() };
  if (id) person.id = id;
  const res = await API.savePerson(App.user.username, person);
  if (res.success) { showToast('Pessoa salva!','success'); closeModal(); await refreshData(); renderPeople(); }
  else showToast(res.error,'error');
}
async function deletePerson(id) {
  if (!confirm('Excluir esta pessoa?')) return;
  const res = await API.deletePerson(App.user.username, id);
  if (res.success) { showToast('Excluída.','success'); await refreshData(); renderPeople(); }
  else showToast(res.error,'error');
}

// ── CARTÕES ───────────────────────────────────────────────────
function renderCards() {
  document.getElementById('topbarActions').innerHTML =
    `<button class="btn-primary btn-sm" onclick="openCardModal()">+ Novo Cartão</button>`;
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="card"><div class="card-body" id="cardsWrap">${renderCardsGrid(App.data.cards)}</div></div>`;
}
function renderCardsGrid(cards) {
  if (!cards.length) return '<div class="empty-state"><div class="empty-icon">💳</div><p>Nenhum cartão cadastrado.</p></div>';
  return `<div class="cards-grid">${cards.map(c => `
    <div class="credit-card" style="background:${c.color||'#6366f1'}">
      <div class="credit-card-bank">${c.bank}</div>
      <div class="credit-card-number">•••• •••• •••• ${c.lastDigits}</div>
      <div class="credit-card-info">
        <span>Limite: ${fmt(c.limit)}</span>
        <span>Fecha dia ${c.closingDay} | Vence dia ${c.dueDay}</span>
      </div>
      <div class="credit-card-actions">
        <button class="btn-icon-white" onclick="openCardModal('${c.id}')">✏️</button>
        <button class="btn-icon-white" onclick="deleteCard('${c.id}')">🗑️</button>
      </div>
    </div>`).join('')}</div>`;
}
function openCardModal(id) {
  const c = id ? App.data.cards.find(x => x.id === id) : {};
  const colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#1e293b'];
  openModal(id ? 'Editar Cartão' : 'Novo Cartão', `
    <div class="form-row">
      <div class="form-group"><label>Banco *</label><input id="cBank" value="${c.bank||''}" placeholder="Ex: Nubank"/></div>
      <div class="form-group"><label>Últimos 4 dígitos *</label><input id="cDigits" value="${c.lastDigits||''}" maxlength="4" placeholder="0000"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Limite</label><input id="cLimit" type="number" value="${c.limit||''}" placeholder="0.00"/></div>
      <div class="form-group"><label>Dia Fechamento</label><input id="cClose" type="number" min="1" max="31" value="${c.closingDay||''}"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Dia Vencimento</label><input id="cDue" type="number" min="1" max="31" value="${c.dueDay||''}"/></div>
      <div class="form-group"><label>Observação</label><input id="cNote" value="${c.note||''}"/></div>
    </div>
    <div class="form-group"><label>Cor</label>
      <div class="color-picker">${colors.map(col =>
        `<div class="color-opt${(c.color||'#6366f1')===col?' selected':''}" style="background:${col}" onclick="selectColor('${col}')"></div>`
      ).join('')}</div>
      <input type="hidden" id="cColor" value="${c.color||'#6366f1'}"/>
    </div>`,
    `<button class="btn-secondary" onclick="closeModal()">Cancelar</button>
     <button class="btn-primary" onclick="saveCard('${id||''}')">Salvar</button>`);
}
function selectColor(col) {
  document.getElementById('cColor').value = col;
  document.querySelectorAll('.color-opt').forEach(el => {
    el.classList.toggle('selected', el.style.background === col || el.style.backgroundColor === col);
  });
}
async function saveCard(id) {
  const card = {
    bank: document.getElementById('cBank').value.trim(),
    lastDigits: document.getElementById('cDigits').value.trim(),
    limit: document.getElementById('cLimit').value,
    closingDay: document.getElementById('cClose').value,
    dueDay: document.getElementById('cDue').value,
    note: document.getElementById('cNote').value.trim(),
    color: document.getElementById('cColor').value,
  };
  if (id) card.id = id;
  const res = await API.saveCard(App.user.username, card);
  if (res.success) { showToast('Cartão salvo!','success'); closeModal(); await refreshData(); renderCards(); }
  else showToast(res.error,'error');
}
async function deleteCard(id) {
  if (!confirm('Excluir este cartão?')) return;
  const res = await API.deleteCard(App.user.username, id);
  if (res.success) { showToast('Excluído.','success'); await refreshData(); renderCards(); }
  else showToast(res.error,'error');
}

// ── COMPRAS ───────────────────────────────────────────────────
function renderPurchases() {
  document.getElementById('topbarActions').innerHTML =
    `<button class="btn-primary btn-sm" onclick="openPurchaseModal()">+ Nova Compra</button>`;
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="search-bar">
      <input class="search-input" id="purchaseSearch" placeholder="Buscar compra..." oninput="filterPurchases()"/>
    </div>
    <div class="card"><div class="card-body" id="purchasesWrap">${renderPurchasesTable(App.data.purchases)}</div></div>`;
}
function filterPurchases() {
  const q = document.getElementById('purchaseSearch').value.toLowerCase();
  const f = App.data.purchases.filter(p =>
    p.description.toLowerCase().includes(q) || personName(p.personId).toLowerCase().includes(q)
  );
  document.getElementById('purchasesWrap').innerHTML = renderPurchasesTable(f);
}
function renderPurchasesTable(purchases) {
  if (!purchases.length) return '<div class="empty-state"><div class="empty-icon">🛒</div><p>Nenhuma compra registrada.</p></div>';
  return `<div class="table-wrapper"><table>
    <thead><tr><th>Pessoa</th><th>Descrição</th><th>Cartão</th><th>Parcelas</th><th class="text-right">Total</th><th>Data</th><th>Ações</th></tr></thead>
    <tbody>${purchases.map(p => `
      <tr>
        <td>${personName(p.personId)}</td>
        <td>${p.description}</td>
        <td>${cardLabel(p.cardId)}</td>
        <td>${p.installments}x</td>
        <td class="text-right">${fmt(p.totalValue)}</td>
        <td>${fmtDate(p.purchaseDate)}</td>
        <td>
          <button class="btn-icon" onclick="openPurchaseModal('${p.id}')">✏️</button>
          <button class="btn-icon" onclick="deletePurchase('${p.id}')">🗑️</button>
        </td>
      </tr>`).join('')}
    </tbody></table></div>`;
}
function openPurchaseModal(id) {
  const p = id ? App.data.purchases.find(x => x.id === id) : {};
  const peopleOpts = App.data.people.map(x => `<option value="${x.id}"${p.personId===x.id?' selected':''}>${x.name}</option>`).join('');
  const cardOpts   = App.data.cards.map(x => `<option value="${x.id}"${p.cardId===x.id?' selected':''}>${x.bank} ••••${x.lastDigits}</option>`).join('');
  openModal(id ? 'Editar Compra' : 'Nova Compra', `
    <div class="form-row">
      <div class="form-group"><label>Pessoa *</label><select id="purPerson"><option value="">Selecione</option>${peopleOpts}</select></div>
      <div class="form-group"><label>Cartão *</label><select id="purCard"><option value="">Selecione</option>${cardOpts}</select></div>
    </div>
    <div class="form-group"><label>Descrição *</label><input id="purDesc" value="${p.description||''}" placeholder="Ex: Supermercado"/></div>
    <div class="form-row">
      <div class="form-group"><label>Valor Total *</label><input id="purValue" type="number" step="0.01" value="${p.totalValue||''}" placeholder="0.00"/></div>
      <div class="form-group"><label>Parcelas *</label><input id="purInst" type="number" min="1" value="${p.installments||1}"/></div>
    </div>
    <div class="form-group"><label>Data da Compra</label><input id="purDate" type="date" value="${p.purchaseDate?p.purchaseDate.toString().split('T')[0]:''}"/></div>`,
    `<button class="btn-secondary" onclick="closeModal()">Cancelar</button>
     <button class="btn-primary" onclick="savePurchase('${id||''}')">Salvar</button>`);
}
async function savePurchase(id) {
  const purchase = {
    personId: document.getElementById('purPerson').value,
    cardId:   document.getElementById('purCard').value,
    description: document.getElementById('purDesc').value.trim(),
    totalValue:  document.getElementById('purValue').value,
    installments: document.getElementById('purInst').value,
    purchaseDate: document.getElementById('purDate').value || new Date().toISOString().split('T')[0],
  };
  if (id) purchase.id = id;
  const res = await API.savePurchase(App.user.username, purchase);
  if (res.success) { showToast('Compra salva!','success'); closeModal(); await refreshData(); renderPurchases(); }
  else showToast(res.error,'error');
}
async function deletePurchase(id) {
  if (!confirm('Excluir esta compra e todas as parcelas?')) return;
  const res = await API.deletePurchase(App.user.username, id);
  if (res.success) { showToast('Excluída.','success'); await refreshData(); renderPurchases(); }
  else showToast(res.error,'error');
}
// ── PARCELAS ─────────────────────────────────────────────────
function renderParcelas() {
  document.getElementById('topbarActions').innerHTML = `
    <select id="parFilterStatus" onchange="filterParcelas()" class="select-sm">
      <option value="">Todos os status</option>
      <option value="aberta">Abertas</option>
      <option value="atrasada">Atrasadas</option>
      <option value="paga">Pagas</option>
    </select>
    <select id="parFilterPerson" onchange="filterParcelas()" class="select-sm">
      <option value="">Todas as pessoas</option>
      ${App.data.people.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
    </select>`;
  const content = document.getElementById('pageContent');
  content.innerHTML = `<div class="card"><div class="card-body" id="parcelasWrap">${renderParcelasTable(App.data.parcelas)}</div></div>`;
}
function filterParcelas() {
  const status = document.getElementById('parFilterStatus').value;
  const person = document.getElementById('parFilterPerson').value;
  let f = App.data.parcelas;
  if (status) f = f.filter(p => p.status === status);
  if (person) f = f.filter(p => p.personId === person);
  document.getElementById('parcelasWrap').innerHTML = renderParcelasTable(f);
}
function renderParcelasTable(parcelas) {
  if (!parcelas.length) return '<div class="empty-state"><div class="empty-icon">📋</div><p>Nenhuma parcela encontrada.</p></div>';
  return `<div class="table-wrapper"><table>
    <thead><tr>
      <th><input type="checkbox" id="checkAll" onchange="toggleCheckAll(this)"/></th>
      <th>Pessoa</th><th>Descrição</th><th>Parcela</th><th>Vencimento</th>
      <th class="text-right">Valor</th><th>Status</th><th>Ações</th>
    </tr></thead>
    <tbody>${parcelas.map(p => `
      <tr>
        <td><input type="checkbox" class="par-check" value="${p.id}" ${p.status==='paga'?'disabled':''}/></td>
        <td>${personName(p.personId)}</td>
        <td>${p.description}</td>
        <td>${p.number}/${p.totalInstallments}</td>
        <td>${fmtDate(p.dueDate)}</td>
        <td class="text-right">${fmt(p.value)}</td>
        <td>${statusBadge(p.status)}</td>
        <td>
          <button class="btn-icon" onclick="openParcelaModal('${p.id}')" title="Editar">✏️</button>
          ${p.status!=='paga'
            ? `<button class="btn-icon" onclick="markOnePaid('${p.id}')" title="Marcar paga">✅</button>`
            : `<button class="btn-icon" onclick="unmarkPaid('${p.id}')" title="Desmarcar">↩️</button>`}
          <button class="btn-icon" onclick="openRenegModal('${p.id}')" title="Renegociar">🔄</button>
          <button class="btn-icon" onclick="deleteParcela('${p.id}')" title="Excluir">🗑️</button>
        </td>
      </tr>`).join('')}
    </tbody></table></div>
  <div class="bulk-actions">
    <button class="btn-primary btn-sm" onclick="markSelectedPaid()">✅ Marcar Selecionadas como Pagas</button>
  </div>`;
}
function toggleCheckAll(el) {
  document.querySelectorAll('.par-check:not(:disabled)').forEach(c => c.checked = el.checked);
}
async function markOnePaid(id) {
  const today = new Date().toISOString().split('T')[0];
  const res = await API.markPaid(App.user.username, [id], today);
  if (res.success) { showToast('Marcada como paga!','success'); await refreshData(); renderParcelas(); }
  else showToast(res.error,'error');
}
async function markSelectedPaid() {
  const ids = [...document.querySelectorAll('.par-check:checked')].map(c => c.value);
  if (!ids.length) { showToast('Selecione ao menos uma parcela.','warning'); return; }
  const today = new Date().toISOString().split('T')[0];
  const res = await API.markPaid(App.user.username, ids, today);
  if (res.success) { showToast(`${ids.length} parcela(s) marcada(s)!`,'success'); await refreshData(); renderParcelas(); }
  else showToast(res.error,'error');
}
async function unmarkPaid(id) {
  if (!confirm('Desmarcar pagamento desta parcela?')) return;
  const res = await API.unmarkPaid(App.user.username, id);
  if (res.success) { showToast('Pagamento desmarcado.','info'); await refreshData(); renderParcelas(); }
  else showToast(res.error,'error');
}
async function deleteParcela(id) {
  if (!confirm('Excluir esta parcela?')) return;
  const res = await API.deleteParcela(App.user.username, id);
  if (res.success) { showToast('Parcela excluída.','success'); await refreshData(); renderParcelas(); }
  else showToast(res.error,'error');
}
function openParcelaModal(id) {
  const p = App.data.parcelas.find(x => x.id === id);
  if (!p) return;
  openModal('Editar Parcela', `
    <div class="form-group"><label>Valor</label><input id="parVal" type="number" step="0.01" value="${p.value}"/></div>
    <div class="form-group"><label>Vencimento</label><input id="parDue" type="date" value="${p.dueDate?p.dueDate.toString().split('T')[0]:''}"/></div>
    <div class="form-group"><label>Observação</label><input id="parNote" value="${p.note||''}"/></div>`,
    `<button class="btn-secondary" onclick="closeModal()">Cancelar</button>
     <button class="btn-primary" onclick="saveParcela('${id}')">Salvar</button>`);
}
async function saveParcela(id) {
  const parcela = {
    id,
    value:   document.getElementById('parVal').value,
    dueDate: document.getElementById('parDue').value,
    note:    document.getElementById('parNote').value.trim(),
  };
  const res = await API.updateParcela(App.user.username, parcela);
  if (res.success) { showToast('Parcela atualizada!','success'); closeModal(); await refreshData(); renderParcelas(); }
  else showToast(res.error,'error');
}
function openRenegModal(id) {
  const p = App.data.parcelas.find(x => x.id === id);
  if (!p) return;
  openModal('Renegociar Parcela', `
    <p class="mb-3">Parcela atual: <b>${fmt(p.value)}</b> — vence <b>${fmtDate(p.dueDate)}</b></p>
    <div class="form-group"><label>Nº de novas parcelas</label>
      <input id="renN" type="number" min="1" value="2" oninput="buildRenegFields()"/>
    </div>
    <div id="renegFields"></div>`,
    `<button class="btn-secondary" onclick="closeModal()">Cancelar</button>
     <button class="btn-primary" onclick="confirmReneg('${id}')">Confirmar</button>`);
  buildRenegFields();
}
function buildRenegFields() {
  const n = parseInt(document.getElementById('renN').value) || 1;
  const today = new Date().toISOString().split('T')[0];
  let html = '';
  for (let i = 0; i < n; i++) {
    const d = new Date(); d.setMonth(d.getMonth() + i + 1);
    const due = d.toISOString().split('T')[0];
    html += `<div class="form-row">
      <div class="form-group"><label>Valor ${i+1}</label><input id="renV${i}" type="number" step="0.01" placeholder="0.00"/></div>
      <div class="form-group"><label>Vencimento ${i+1}</label><input id="renD${i}" type="date" value="${due}"/></div>
    </div>`;
  }
  document.getElementById('renegFields').innerHTML = html;
}
async function confirmReneg(id) {
  const n = parseInt(document.getElementById('renN').value) || 1;
  const values = [], dates = [];
  for (let i = 0; i < n; i++) {
    values.push(parseFloat(document.getElementById(`renV${i}`).value) || 0);
    dates.push(document.getElementById(`renD${i}`).value);
  }
  const res = await API.renegotiate(App.user.username, id, n, values, dates);
  if (res.success) { showToast('Renegociação concluída!','success'); closeModal(); await refreshData(); renderParcelas(); }
  else showToast(res.error,'error');
}

// ── CALENDÁRIO ────────────────────────────────────────────────
function renderCalendar() {
  const now = new Date();
  App._calMonth = App._calMonth || now.getMonth();
  App._calYear  = App._calYear  || now.getFullYear();
  drawCalendar();
}
function drawCalendar() {
  const m = App._calMonth, y = App._calYear;
  const names = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const parcelas = App.data.parcelas.filter(p => {
    const d = new Date(p.dueDate);
    return d.getMonth() === m && d.getFullYear() === y;
  });
  const byDay = {};
  parcelas.forEach(p => {
    const day = new Date(p.dueDate).getUTCDate();
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(p);
  });
  let cells = '';
  for (let i = 0; i < firstDay; i++) cells += '<div class="cal-cell empty"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const ps = byDay[d] || [];
    const dots = ps.map(p => `<span class="cal-dot ${p.status}"></span>`).join('');
    cells += `<div class="cal-cell${ps.length?' has-events':''}" onclick="openCalDay(${d},${m},${y})">
      <span class="cal-day">${d}</span>
      <div class="cal-dots">${dots}</div>
    </div>`;
  }
  document.getElementById('pageContent').innerHTML = `
    <div class="card">
      <div class="card-header">
        <button class="btn-icon" onclick="calNav(-1)">◀</button>
        <span class="card-title">${names[m]} ${y}</span>
        <button class="btn-icon" onclick="calNav(1)">▶</button>
      </div>
      <div class="card-body">
        <div class="cal-grid-header"><span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span></div>
        <div class="cal-grid">${cells}</div>
        <div class="cal-legend">
          <span><span class="cal-dot aberta"></span> Aberta</span>
          <span><span class="cal-dot atrasada"></span> Atrasada</span>
          <span><span class="cal-dot paga"></span> Paga</span>
        </div>
      </div>
    </div>`;
}
function calNav(dir) {
  App._calMonth += dir;
  if (App._calMonth < 0)  { App._calMonth = 11; App._calYear--; }
  if (App._calMonth > 11) { App._calMonth = 0;  App._calYear++; }
  drawCalendar();
}
function openCalDay(d, m, y) {
  const ps = App.data.parcelas.filter(p => {
    const dt = new Date(p.dueDate);
    return dt.getUTCDate() === d && dt.getMonth() === m && dt.getFullYear() === y;
  });
  if (!ps.length) return;
  const body = ps.map(p => `
    <div class="cal-detail-item">
      <div><b>${personName(p.personId)}</b> — ${p.description} (${p.number}/${p.totalInstallments})</div>
      <div>${fmt(p.value)} ${statusBadge(p.status)}</div>
    </div>`).join('');
  openModal(`Parcelas — ${d.toString().padStart(2,'0')}/${(m+1).toString().padStart(2,'0')}/${y}`, body);
}

// ── FECHAMENTO ────────────────────────────────────────────────
function renderClosing() {
  const now = new Date();
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="card mb-4">
      <div class="card-body">
        <div class="form-row">
          <div class="form-group">
            <label>Mês</label>
            <select id="closeMonth" class="select-sm">
              ${[...Array(12)].map((_,i) => `<option value="${i+1}"${i+1===now.getMonth()+1?' selected':''}>${['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][i]}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Ano</label>
            <input id="closeYear" type="number" value="${now.getFullYear()}" class="select-sm" style="width:90px"/>
          </div>
          <div class="form-group" style="align-self:flex-end">
            <button class="btn-primary btn-sm" onclick="loadClosing()">Consultar</button>
          </div>
        </div>
      </div>
    </div>
    <div id="closingResult"></div>`;
}
async function loadClosing() {
  const m = document.getElementById('closeMonth').value;
  const y = document.getElementById('closeYear').value;
  const res = await API.getClosing(App.user.username, m, y);
  if (!res.success) { showToast(res.error,'error'); return; }
  const { resultado } = res.data;
  const wrap = document.getElementById('closingResult');
  if (!resultado.length) {
    wrap.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div><p>Nenhuma parcela neste período.</p></div>';
    return;
  }
  wrap.innerHTML = resultado.map(r => `
    <div class="card mb-4">
      <div class="card-header">
        <span class="card-title">👤 ${r.pessoa.name}</span>
        <span class="badge badge-primary">${fmt(r.totalAberto)} em aberto</span>
      </div>
      <div class="card-body">
        <div class="table-wrapper"><table>
          <thead><tr><th>Descrição</th><th>Parcela</th><th>Vencimento</th><th class="text-right">Valor</th><th>Status</th></tr></thead>
          <tbody>${r.parcelas.map(p => `
            <tr>
              <td>${p.description}</td>
              <td>${p.number}/${p.totalInstallments}</td>
              <td>${fmtDate(p.dueDate)}</td>
              <td class="text-right">${fmt(p.value)}</td>
              <td>${statusBadge(p.status)}</td>
            </tr>`).join('')}
          </tbody>
        </table></div>
        <div class="closing-summary">
          <span>Total: <b>${fmt(r.total)}</b></span>
          <span>Pago: <b class="text-success">${fmt(r.totalPago)}</b></span>
          <span>Em aberto: <b class="text-danger">${fmt(r.totalAberto)}</b></span>
        </div>
        ${r.pessoa.phone ? `
        <div class="mt-3">
          <button class="btn-whatsapp" onclick="sendWhatsApp('${r.pessoa.id}','${r.pessoa.phone}',${m},${y})">
            📲 Cobrar pelo WhatsApp
          </button>
        </div>` : ''}
      </div>
    </div>`).join('');
}
async function sendWhatsApp(personId, phone, month, year) {
  const res = await API.getClosing(App.user.username, month, year);
  if (!res.success) return;
  const r = res.data.resultado.find(x => x.pessoa.id === personId);
  if (!r) return;
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  let msg = `Olá ${r.pessoa.name}! 👋\n\nSegue o resumo de *${meses[month-1]}/${year}*:\n\n`;
  r.parcelas.filter(p => p.status !== 'paga').forEach(p => {
    msg += `• ${p.description} (${p.number}/${p.totalInstallments}) — *${fmt(p.value)}* — vence ${fmtDate(p.dueDate)}\n`;
  });
  msg += `\n*Total em aberto: ${fmt(r.totalAberto)}*\n\nObrigado! 😊`;
  const tel = phone.replace(/\D/g,'');
  const url = `https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`;
  window.open(url,'_blank');
  await API.saveCharge(App.user.username, { personId, period: `${month}/${year}`, method: 'whatsapp', preview: msg.substring(0,200) });
  showToast('WhatsApp aberto!','success');
}
// ── COBRANÇAS ─────────────────────────────────────────────────
function renderCharges() {
  document.getElementById('topbarActions').innerHTML = `
    <select id="chargeFilterPerson" onchange="loadCharges()" class="select-sm">
      <option value="">Todas as pessoas</option>
      ${App.data.people.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
    </select>`;
  document.getElementById('pageContent').innerHTML =
    `<div class="card"><div class="card-body" id="chargesWrap"><div class="empty-state"><div class="empty-icon">⏳</div><p>Selecione uma pessoa ou carregue tudo.</p></div></div></div>`;
  loadCharges();
}
async function loadCharges() {
  const personId = document.getElementById('chargeFilterPerson')?.value || '';
  const res = await API.getCharges(App.user.username, personId);
  const wrap = document.getElementById('chargesWrap');
  if (!res.success) { wrap.innerHTML = `<p class="text-danger">${res.error}</p>`; return; }
  const charges = res.data;
  if (!charges.length) {
    wrap.innerHTML = '<div class="empty-state"><div class="empty-icon">💬</div><p>Nenhuma cobrança registrada.</p></div>';
    return;
  }
  wrap.innerHTML = `<div class="table-wrapper"><table>
    <thead><tr><th>Pessoa</th><th>Período</th><th>Método</th><th>Enviado em</th><th>Prévia</th></tr></thead>
    <tbody>${charges.map(c => `
      <tr>
        <td>${personName(c.personId)}</td>
        <td>${c.period}</td>
        <td>${c.method}</td>
        <td>${fmtDate(c.sentAt)}</td>
        <td><small>${c.preview||'—'}</small></td>
      </tr>`).join('')}
    </tbody></table></div>`;
}

// ── USUÁRIOS (ADMIN) ──────────────────────────────────────────
async function renderUsers() {
  if (App.user.role !== 'admin') { showToast('Acesso negado.','error'); return; }
  document.getElementById('topbarActions').innerHTML =
    `<button class="btn-primary btn-sm" onclick="openUserModal()">+ Novo Usuário</button>`;
  const res = await API.getUsers(App.user.username);
  const content = document.getElementById('pageContent');
  if (!res.success) { content.innerHTML = `<p class="text-danger">${res.error}</p>`; return; }
  const users = res.data;
  content.innerHTML = `
    <div class="card"><div class="card-body">
      ${!users.length ? '<div class="empty-state"><p>Nenhum usuário.</p></div>' :
      `<div class="table-wrapper"><table>
        <thead><tr><th>Usuário</th><th>Nome</th><th>Perfil</th><th>Criado em</th><th>Ações</th></tr></thead>
        <tbody>${users.map(u => `
          <tr>
            <td><b>${u.username}</b></td>
            <td>${u.name}</td>
            <td><span class="badge ${u.role==='admin'?'badge-primary':'badge-gray'}">${u.role}</span></td>
            <td>${fmtDate(u.createdAt)}</td>
            <td>${u.username !== 'admin'
              ? `<button class="btn-icon" onclick="deleteUser('${u.username}')">🗑️</button>`
              : '—'}
            </td>
          </tr>`).join('')}
        </tbody></table></div>`}
    </div></div>`;
}
function openUserModal() {
  openModal('Novo Usuário', `
    <div class="form-group"><label>Usuário *</label><input id="uUser" placeholder="login"/></div>
    <div class="form-group"><label>Nome *</label><input id="uName" placeholder="Nome completo"/></div>
    <div class="form-group"><label>Senha *</label><input id="uPass" type="password" placeholder="senha"/></div>
    <div class="form-group"><label>Perfil</label>
      <select id="uRole">
        <option value="user">Usuário Comum</option>
        <option value="admin">Admin</option>
      </select>
    </div>`,
    `<button class="btn-secondary" onclick="closeModal()">Cancelar</button>
     <button class="btn-primary" onclick="createUser()">Criar</button>`);
}
async function createUser() {
  const newUser = {
    username: document.getElementById('uUser').value.trim(),
    name:     document.getElementById('uName').value.trim(),
    password: document.getElementById('uPass').value,
    role:     document.getElementById('uRole').value,
  };
  if (!newUser.username || !newUser.name || !newUser.password) {
    showToast('Preencha todos os campos.','warning'); return;
  }
  const res = await API.createUser(App.user.username, newUser);
  if (res.success) { showToast('Usuário criado!','success'); closeModal(); renderUsers(); }
  else showToast(res.error,'error');
}
async function deleteUser(username) {
  if (!confirm(`Excluir usuário "${username}" e todos os dados dele?`)) return;
  const res = await API.deleteUser(App.user.username, username);
  if (res.success) { showToast('Usuário excluído.','success'); renderUsers(); }
  else showToast(res.error,'error');
}

// ── BACKUP (ADMIN) ─────────────────────────────────────────────
async function renderBackup() {
  if (App.user.role !== 'admin') { showToast('Acesso negado.','error'); return; }
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="card mb-4">
      <div class="card-header"><span class="card-title">💾 Backup Geral</span></div>
      <div class="card-body">
        <p class="mb-3">Cria uma cópia completa de toda a planilha no Google Drive.</p>
        <button class="btn-primary" onclick="doBackup()">🔒 Fazer Backup Agora</button>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title">📋 Log de Backups</span></div>
      <div class="card-body" id="backupLogWrap"><div class="empty-state"><div class="empty-icon">⏳</div><p>Carregando...</p></div></div>
    </div>`;
  loadBackupLog();
}
async function doBackup() {
  showToast('Iniciando backup...','info');
  const res = await API.triggerBackup(App.user.username);
  if (res.success) { showToast(`Backup criado: ${res.data.backupName}`,'success'); loadBackupLog(); }
  else showToast(res.error,'error');
}
async function loadBackupLog() {
  const res = await API.getBackupLog(App.user.username);
  const wrap = document.getElementById('backupLogWrap');
  if (!res.success) { wrap.innerHTML = `<p class="text-danger">${res.error}</p>`; return; }
  const logs = res.data;
  if (!logs.length) { wrap.innerHTML = '<div class="empty-state"><p>Nenhum backup realizado ainda.</p></div>'; return; }
  wrap.innerHTML = `<div class="table-wrapper"><table>
    <thead><tr><th>Data/Hora</th><th>Tipo</th><th>Status</th><th>Nome</th></tr></thead>
    <tbody>${logs.map(l => `
      <tr>
        <td>${fmtDate(l.triggeredAt)}</td>
        <td>${l.type}</td>
        <td><span class="badge ${l.status==='ok'?'badge-success':'badge-danger'}">${l.status}</span></td>
        <td><small>${l.detail||'—'}</small></td>
      </tr>`).join('')}
    </tbody></table></div>`;
}
