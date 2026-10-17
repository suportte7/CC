// ============================================================
// app.js — CardControl
// ============================================================

const App = {
  user: null,
  data: { people: [], cards: [], purchases: [], parcelas: [] },
  currentPage: 'dashboard',
};

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
  } catch(e) { showToast('Erro ao carregar dados','error'); }
}
async function refreshData() { await loadAllData(); }

function navigateTo(page) {
  App.currentPage = page;
  document.querySelectorAll('.nav-item[data-page]').forEach(el =>
    el.classList.toggle('active', el.dataset.page === page));
  const titles = {
    dashboard:'Dashboard', people:'Pessoas', cards:'Cartões',
    purchases:'Compras', parcelas:'Parcelas', calendar:'Calendário',
    closing:'Fechamento', charges:'Cobranças', users:'Usuários', backup:'Backup'
  };
  document.getElementById('topbarTitle').textContent = titles[page] || page;
  document.getElementById('topbarActions').innerHTML = '';
  const pages = {
    dashboard:renderDashboard, people:renderPeople, cards:renderCards,
    purchases:renderPurchases, parcelas:renderParcelas, calendar:renderCalendar,
    closing:renderClosing, charges:renderCharges, users:renderUsers, backup:renderBackup
  };
  if (pages[page]) pages[page]();
}

function showToast(msg, type='info', duration=3500) {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), duration);
}

function openModal(title, bodyHTML, footerHTML='') {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('modalFooter').innerHTML = footerHTML;
  document.getElementById('modalOverlay').classList.remove('hidden');
}
function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
}

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
    paga:    '<span class="badge badge-success">✓ Paga</span>',
    aberta:  '<span class="badge badge-primary">● Aberta</span>',
    atrasada:'<span class="badge badge-danger">! Atrasada</span>',
  };
  return map[s] || `<span class="badge">${s}</span>`;
}

// ── DASHBOARD ────────────────────────────────────────────────
async function renderDashboard() {
  const el = document.getElementById('pageContent');
  el.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><p>Carregando...</p></div>';
  const res = await API.getDashboard(App.user.username);
  if (!res.success) { showToast(res.error,'error'); return; }
  const d = res.data;
  el.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">Total do Mês</div><div class="stat-value primary">${fmt(d.totalMes)}</div></div>
      <div class="stat-card"><div class="stat-label">Pago</div><div class="stat-value success">${fmt(d.totalPago)}</div></div>
      <div class="stat-card"><div class="stat-label">Em Aberto</div><div class="stat-value warning">${fmt(d.totalAberto)}</div></div>
      <div class="stat-card"><div class="stat-label">Atrasadas</div><div class="stat-value danger">${d.atrasadas} parcela(s)</div></div>
      <div class="stat-card"><div class="stat-label">Vencem em 7 dias</div><div class="stat-value info">${d.proximosDias} parcela(s)</div></div>
      <div class="stat-card"><div class="stat-label">Cartões</div><div class="stat-value">${d.totalCartoes}</div></div>
    </div>
    ${d.alertasFechamento&&d.alertasFechamento.length?`
    <div class="card mb-4">
      <div class="card-header"><span class="card-title">⚠️ Fechamento Próximo</span></div>
      <div class="card-body">
        ${d.alertasFechamento.map(a=>`
          <div class="alert alert-warning">💳 <b>${a.card.bank} ••••${a.card.lastDigits}</b> fecha em <b>${a.daysLeft===0?'hoje':a.daysLeft+' dia(s)'}</b></div>`).join('')}
      </div>
    </div>`:''}
    <div class="card">
      <div class="card-header"><span class="card-title">📋 Parcelas deste Mês</span></div>
      <div class="card-body">
        ${!d.parcelasDoMes||!d.parcelasDoMes.length
          ?'<div class="empty-state"><div class="empty-icon">🎉</div><p>Nenhuma parcela este mês.</p></div>'
          :`<div class="table-wrapper"><table>
            <thead><tr><th>Pessoa</th><th>Descrição</th><th>Vencimento</th><th class="text-right">Valor</th><th>Status</th></tr></thead>
            <tbody>${d.parcelasDoMes.map(p=>`
              <tr>
                <td>${personName(p.personId)}</td>
                <td>${p.description} <small>${p.number}/${p.totalInstallments}</small></td>
                <td>${fmtDate(p.dueDate)}</td>
                <td class="text-right">${fmt(p.value)}</td>
                <td>${statusBadge(p.status)}</td>
              </tr>`).join('')}
            </tbody></table></div>`}
      </div>
    </div>`;
}

// ── PESSOAS ──────────────────────────────────────────────────
function renderPeople() {
  document.getElementById('topbarActions').innerHTML =
    `<button class="btn-primary btn-sm" onclick="openPersonModal()">+ Nova Pessoa</button>`;
  document.getElementById('pageContent').innerHTML = `
    <div class="search-bar">
      <input class="search-input" id="peopleSearch" placeholder="Buscar pessoa..." oninput="filterPeople()"/>
    </div>
    <div class="card"><div class="card-body" id="peopleTableWrap">${renderPeopleTable(App.data.people)}</div></div>`;
}
function filterPeople() {
  const q = document.getElementById('peopleSearch').value.toLowerCase();
  document.getElementById('peopleTableWrap').innerHTML = renderPeopleTable(
    App.data.people.filter(p => p.name.toLowerCase().includes(q)||String(p.phone).includes(q)));
}
function renderPeopleTable(list) {
  if (!list.length) return '<div class="empty-state"><div class="empty-icon">👥</div><p>Nenhuma pessoa cadastrada.</p></div>';
  return `<div class="table-wrapper"><table>
    <thead><tr><th>Nome</th><th>Telefone</th><th>Observação</th><th>Ações</th></tr></thead>
    <tbody>${list.map(p=>`
      <tr>
        <td><b>${p.name}</b></td><td>${p.phone||'—'}</td><td>${p.note||'—'}</td>
        <td>
          <button class="btn-icon" onclick="openPersonModal('${p.id}')">✏️</button>
          <button class="btn-icon" onclick="deletePerson('${p.id}')">🗑️</button>
        </td>
      </tr>`).join('')}
    </tbody></table></div>`;
}
function openPersonModal(id) {
  const p = id ? App.data.people.find(x=>x.id===id)||{} : {};
  openModal(id?'Editar Pessoa':'Nova Pessoa',`
    <div class="form-group"><label>Nome *</label><input id="pName" value="${p.name||''}" placeholder="Nome completo"/></div>
    <div class="form-group"><label>Telefone (WhatsApp)</label><input id="pPhone" value="${p.phone||''}" placeholder="11999999999"/></div>
    <div class="form-group"><label>Observação</label><input id="pNote" value="${p.note||''}" placeholder="Opcional"/></div>`,
    `<button class="btn-secondary" onclick="closeModal()">Cancelar</button>
     <button class="btn-primary" onclick="savePerson('${id||''}')">Salvar</button>`);
}
async function savePerson(id) {
  const person = {
    name:  document.getElementById('pName').value.trim(),
    phone: document.getElementById('pPhone').value.trim(),
    note:  document.getElementById('pNote').value.trim(),
  };
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

// ── CARTÕES ──────────────────────────────────────────────────
function renderCards() {
  document.getElementById('topbarActions').innerHTML =
    `<button class="btn-primary btn-sm" onclick="openCardModal()">+ Novo Cartão</button>`;
  document.getElementById('pageContent').innerHTML =
    `<div class="card"><div class="card-body" id="cardsWrap">${renderCardsGrid(App.data.cards)}</div></div>`;
}
function renderCardsGrid(cards) {
  if (!cards.length) return '<div class="empty-state"><div class="empty-icon">💳</div><p>Nenhum cartão cadastrado.</p></div>';
  return `<div class="cards-grid">${cards.map(c=>`
    <div class="credit-card" style="background:${c.color||'#6366f1'}">
      <div class="cc-bank">${c.bank}</div>
      <div class="cc-number">•••• •••• •••• ${c.lastDigits}</div>
      <div class="cc-info">
        <span>Limite: ${fmt(c.limit)}</span>
        <span>Fecha dia ${c.closingDay} | Vence dia ${c.dueDay}</span>
      </div>
      <div class="cc-actions">
        <button class="btn-icon-white" onclick="openCardModal('${c.id}')">✏️</button>
        <button class="btn-icon-white" onclick="deleteCard('${c.id}')">🗑️</button>
      </div>
    </div>`).join('')}</div>`;
}
function openCardModal(id) {
  const c = id ? App.data.cards.find(x=>x.id===id)||{} : {};
  const colors = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#1e293b'];
  openModal(id?'Editar Cartão':'Novo Cartão',`
    <div class="form-group"><label>Banco *</label><input id="cBank" value="${c.bank||''}" placeholder="Ex: Nubank"/></div>
    <div class="form-group"><label>Últimos 4 dígitos *</label><input id="cDigits" value="${c.lastDigits||''}" maxlength="4" placeholder="0000"/></div>
    <div class="form-group"><label>Limite</label><input id="cLimit" type="number" value="${c.limit||''}" placeholder="0.00"/></div>
    <div class="form-group"><label>Dia de Fechamento</label><input id="cClose" type="number" value="${c.closingDay||''}" min="1" max="31" placeholder="1-31"/></div>
    <div class="form-group"><label>Dia de Vencimento</label><input id="cDue" type="number" value="${c.dueDay||''}" min="1" max="31" placeholder="1-31"/></div>
    <div class="form-group"><label>Cor</label>
      <div class="color-picker">${colors.map(col=>`
        <div class="color-opt${(c.color||'#6366f1')===col?' selected':''}" style="background:${col}" onclick="selectColor('${col}',this)" data-color="${col}"></div>`).join('')}
      </div>
      <input type="hidden" id="cColor" value="${c.color||'#6366f1'}"/>
    </div>
    <div class="form-group"><label>Observação</label><input id="cNote" value="${c.note||''}" placeholder="Opcional"/></div>`,
    `<button class="btn-secondary" onclick="closeModal()">Cancelar</button>
     <button class="btn-primary" onclick="saveCard('${id||''}')">Salvar</button>`);
}
function selectColor(color, el) {
  document.querySelectorAll('.color-opt').forEach(e=>e.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('cColor').value = color;
}
async function saveCard(id) {
  const card = {
    bank: document.getElementById('cBank').value.trim(),
    lastDigits: document.getElementById('cDigits').value.trim(),
    limit: parseFloat(document.getElementById('cLimit').value)||0,
    closingDay: parseInt(document.getElementById('cClose').value)||1,
    dueDay: parseInt(document.getElementById('cDue').value)||1,
    color: document.getElementById('cColor').value,
    note: document.getElementById('cNote').value.trim(),
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
      </div>
    </div>`).join('')}</div>`;
}
function openCardModal(id) {
  const c = id ? App.data.cards.find(x=>x.id===id)||{} : {};
  openModal(id?'Editar Cartão':'Novo Cartão',`
    <div class="form-group"><label>Banco *</label><input id="cBank" value="${c.bank||''}" placeholder="Ex: Nubank"/></div>
    <div class="form-group"><label>Últimos 4 dígitos *</label><input id="cDigits" value="${c.lastDigits||''}" placeholder="0000" maxlength="4"/></div>
    <div class="form-group"><label>Limite</label><input id="cLimit" type="number" value="${c.limit||''}" placeholder="0.00"/></div>
    <div class="form-group"><label>Dia de Fechamento</label><input id="cClose" type="number" value="${c.closingDay||''}" placeholder="1-31" min="1" max="31"/></div>
    <div class="form-group"><label>Dia de Vencimento</label><input id="cDue" type="number" value="${c.dueDay||''}" placeholder="1-31" min="1" max="31"/></div>
    <div class="form-group"><label>Cor</label><input id="cColor" type="color" value="${c.color||'#6366f1'}"/></div>
    <div class="form-group"><label>Observação</label><input id="cNote" value="${c.note||''}" placeholder="Opcional"/></div>`,
    `<button class="btn-secondary" onclick="closeModal()">Cancelar</button>
     <button class="btn-primary" onclick="saveCard('${id||''}')">Salvar</button>`);
}
async function saveCard(id) {
  const card = {
    bank:       document.getElementById('cBank').value.trim(),
    lastDigits: document.getElementById('cDigits').value.trim(),
    limit:      parseFloat(document.getElementById('cLimit').value)||0,
    closingDay: parseInt(document.getElementById('cClose').value)||1,
    dueDay:     parseInt(document.getElementById('cDue').value)||1,
    color:      document.getElementById('cColor').value,
    note:       document.getElementById('cNote').value.trim(),
  };
  if (id) card.id = id;
  const res = await API.saveCard(App.user.username, card);
  if (res.success) { showToast('Cartão salvo!','success'); closeModal(); await refreshData(); renderCards(); }
  else showToast(res.error,'error');
}
async function deleteCard(id) {
  if (!confirm('Excluir este cartão?')) return;
  const res = await API.deleteCard(App.user.username, id);
  if (res.success) { showToast('Cartão excluído.','success'); await refreshData(); renderCards(); }
  else showToast(res.error,'error');
}

// ── COMPRAS ──────────────────────────────────────────────────
function renderPurchases() {
  document.getElementById('topbarActions').innerHTML =
    `<button class="btn-primary btn-sm" onclick="openPurchaseModal()">+ Nova Compra</button>`;
  document.getElementById('pageContent').innerHTML = `
    <div class="search-bar">
      <input class="search-input" id="purchaseSearch" placeholder="Buscar compra..." oninput="filterPurchases()"/>
    </div>
    <div class="card"><div class="card-body" id="purchasesWrap">${renderPurchasesTable(App.data.purchases)}</div></div>`;
}
function filterPurchases() {
  const q = document.getElementById('purchaseSearch').value.toLowerCase();
  document.getElementById('purchasesWrap').innerHTML = renderPurchasesTable(
    App.data.purchases.filter(p =>
      String(p.description).toLowerCase().includes(q) ||
      personName(p.personId).toLowerCase().includes(q)));
}
function renderPurchasesTable(list) {
  if (!list.length) return '<div class="empty-state"><div class="empty-icon">🛒</div><p>Nenhuma compra registrada.</p></div>';
  return `<div class="table-wrapper"><table>
    <thead><tr><th>Pessoa</th><th>Cartão</th><th>Descrição</th><th>Data</th><th class="text-right">Valor</th><th>Parcelas</th><th>Ações</th></tr></thead>
    <tbody>${list.map(p=>`
      <tr>
        <td>${personName(p.personId)}</td>
        <td>${cardLabel(p.cardId)}</td>
        <td>${p.description}</td>
        <td>${fmtDate(p.purchaseDate)}</td>
        <td class="text-right">${fmt(p.totalValue)}</td>
        <td>${p.installments}x</td>
        <td>
          <button class="btn-icon" onclick="openPurchaseModal('${p.id}')">✏️</button>
          <button class="btn-icon" onclick="deletePurchase('${p.id}')">🗑️</button>
        </td>
      </tr>`).join('')}
    </tbody></table></div>`;
}
function openPurchaseModal(id) {
  const p = id ? App.data.purchases.find(x=>x.id===id)||{} : {};
  const peopleOpts = App.data.people.map(x=>`<option value="${x.id}" ${p.personId===x.id?'selected':''}>${x.name}</option>`).join('');
  const cardOpts   = App.data.cards.map(x=>`<option value="${x.id}" ${p.cardId===x.id?'selected':''}>${x.bank} ••••${x.lastDigits}</option>`).join('');
  const dateVal    = p.purchaseDate ? String(p.purchaseDate).split('T')[0] : new Date().toISOString().split('T')[0];
  openModal(id?'Editar Compra':'Nova Compra',`
    <div class="form-group"><label>Pessoa *</label>
      <select id="purPerson"><option value="">Selecione...</option>${peopleOpts}</select></div>
    <div class="form-group"><label>Cartão *</label>
      <select id="purCard"><option value="">Selecione...</option>${cardOpts}</select></div>
    <div class="form-group"><label>Descrição *</label>
      <input id="purDesc" value="${p.description||''}" placeholder="Ex: Mercado"/></div>
    <div class="form-group"><label>Valor Total *</label>
      <input id="purValue" type="number" step="0.01" value="${p.totalValue||''}" placeholder="0.00"/></div>
    <div class="form-group"><label>Data da Compra</label>
      <input id="purDate" type="date" value="${dateVal}"/></div>
    <div class="form-group"><label>Nº de Parcelas *</label>
      <input id="purInst" type="number" min="1" value="${p.installments||1}"/></div>`,
    `<button class="btn-secondary" onclick="closeModal()">Cancelar</button>
     <button class="btn-primary" onclick="savePurchase('${id||''}')">Salvar</button>`);
}
async function savePurchase(id) {
  const purchase = {
    personId:     document.getElementById('purPerson').value,
    cardId:       document.getElementById('purCard').value,
    description:  document.getElementById('purDesc').value.trim(),
    totalValue:   parseFloat(document.getElementById('purValue').value)||0,
    purchaseDate: document.getElementById('purDate').value,
    installments: parseInt(document.getElementById('purInst').value)||1,
  };
  if (id) purchase.id = id;
  const res = await API.savePurchase(App.user.username, purchase);
  if (res.success) { showToast('Compra salva!','success'); closeModal(); await refreshData(); renderPurchases(); }
  else showToast(res.error,'error');
}
async function deletePurchase(id) {
  if (!confirm('Excluir esta compra e todas as parcelas?')) return;
  const res = await API.deletePurchase(App.user.username, id);
  if (res.success) { showToast('Compra excluída.','success'); await refreshData(); renderPurchases(); }
  else showToast(res.error,'error');
}

// ── PARCELAS ─────────────────────────────────────────────────
function renderParcelas() {
  document.getElementById('topbarActions').innerHTML = `
    <select id="parFilterStatus" onchange="filterParcelas()" class="select-sm">
      <option value="">Todos os status</option>
      <option value="aberta">Em Aberto</option>
      <option value="atrasada">Atrasadas</option>
      <option value="paga">Pagas</option>
    </select>`;
  document.getElementById('pageContent').innerHTML = `
    <div class="search-bar" style="display:flex;gap:8px;flex-wrap:wrap">
      <input class="search-input" id="parSearch" placeholder="Buscar..." oninput="filterParcelas()" style="flex:1"/>
      <select id="parFilterPerson" onchange="filterParcelas()" class="select-sm">
        <option value="">Todas as pessoas</option>
        ${App.data.people.map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}
      </select>
    </div>
    <div class="card"><div class="card-body" id="parcelasWrap">${renderParcelasTable(App.data.parcelas)}</div></div>`;
}
function filterParcelas() {
  const q        = (document.getElementById('parSearch')?.value||'').toLowerCase();
  const status   = document.getElementById('parFilterStatus')?.value||'';
  const personId = document.getElementById('parFilterPerson')?.value||'';
  let list = App.data.parcelas;
  if (status)   list = list.filter(p=>p.status===status);
  if (personId) list = list.filter(p=>p.personId===personId);
  if (q)        list = list.filter(p=>String(p.description).toLowerCase().includes(q)||personName(p.personId).toLowerCase().includes(q));
  document.getElementById('parcelasWrap').innerHTML = renderParcelasTable(list);
}
function renderParcelasTable(list) {
  if (!list.length) return '<div class="empty-state"><div class="empty-icon">📋</div><p>Nenhuma parcela encontrada.</p></div>';
  return `<div class="table-wrapper"><table>
    <thead><tr>
      <th><input type="checkbox" id="checkAll" onchange="toggleAllParcelas(this)"/></th>
      <th>Pessoa</th><th>Descrição</th><th>Parcela</th>
      <th>Vencimento</th><th class="text-right">Valor</th><th>Status</th><th>Ações</th>
    </tr></thead>
    <tbody>${list.map(p=>`
      <tr>
        <td><input type="checkbox" class="par-check" value="${p.id}" ${p.status==='paga'?'disabled':''}/>
        <td>${personName(p.personId)}</td>
        <td>${p.description}${p.renegotiated?' <span class="badge badge-warning">Reneg.</span>':''}</td>
        <td>${p.number}/${p.totalInstallments}</td>
        <td>${fmtDate(p.dueDate)}</td>
        <td class="text-right">${fmt(p.value)}</td>
        <td>${statusBadge(p.status)}</td>
        <td>
          ${p.status!=='paga'
            ?`<button class="btn-icon" onclick="markOnePaid('${p.id}')" title="Marcar paga">✅</button>`
            :`<button class="btn-icon" onclick="unmarkPaid('${p.id}')" title="Desmarcar">↩️</button>`}
          <button class="btn-icon" onclick="openEditParcelaModal('${p.id}')" title="Editar">✏️</button>
          <button class="btn-icon" onclick="openRenegModal('${p.id}')" title="Renegociar">🔄</button>
          <button class="btn-icon" onclick="deleteParcela('${p.id}')" title="Excluir">🗑️</button>
        </td>
      </tr>`).join('')}
    </tbody></table></div>
    <div style="margin-top:12px">
      <button class="btn-primary btn-sm" onclick="markSelectedPaid()">✅ Marcar selecionadas como pagas</button>
    </div>`;
}
function toggleAllParcelas(cb) {
  document.querySelectorAll('.par-check:not(:disabled)').forEach(c => c.checked = cb.checked);
}
async function markOnePaid(id) {
  const today = new Date().toISOString().split('T')[0];
  const res = await API.markPaid(App.user.username, [id], today);
  if (res.success) { showToast('Parcela paga!','success'); await refreshData(); renderParcelas(); }
  else showToast(res.error,'error');
}
async function unmarkPaid(id) {
  const res = await API.unmarkPaid(App.user.username, id);
  if (res.success) { showToast('Desmarcada.','success'); await refreshData(); renderParcelas(); }
  else showToast(res.error,'error');
}
async function markSelectedPaid() {
  const ids = [...document.querySelectorAll('.par-check:checked')].map(c=>c.value);
  if (!ids.length) { showToast('Selecione ao menos uma parcela.','warning'); return; }
  const today = new Date().toISOString().split('T')[0];
  const res = await API.markPaid(App.user.username, ids, today);
  if (res.success) { showToast(`${ids.length} parcela(s) pagas!`,'success'); await refreshData(); renderParcelas(); }
  else showToast(res.error,'error');
}
function openEditParcelaModal(id) {
  const p = App.data.parcelas.find(x=>x.id===id)||{};
  const due = p.dueDate ? String(p.dueDate).split('T')[0] : '';
  openModal('Editar Parcela',`
    <div class="form-group"><label>Valor</label><input id="epValue" type="number" step="0.01" value="${p.value||''}"/></div>
    <div class="form-group"><label>Vencimento</label><input id="epDue" type="date" value="${due}"/></div>
    <div class="form-group"><label>Observação</label><input id="epNote" value="${p.note||''}"/></div>`,
    `<button class="btn-secondary" onclick="closeModal()">Cancelar</button>
     <button class="btn-primary" onclick="saveEditParcela('${id}')">Salvar</button>`);
}
async function saveEditParcela(id) {
  const parcela = {
    id,
    value:   parseFloat(document.getElementById('epValue').value)||0,
    dueDate: document.getElementById('epDue').value,
    note:    document.getElementById('epNote').value.trim(),
  };
  const res = await API.updateParcela(App.user.username, parcela);
  if (res.success) { showToast('Parcela atualizada!','success'); closeModal(); await refreshData(); renderParcelas(); }
  else showToast(res.error,'error');
}
async function deleteParcela(id) {
  if (!confirm('Excluir esta parcela?')) return;
  const res = await API.deleteParcela(App.user.username, id);
  if (res.success) { showToast('Parcela excluída.','success'); await refreshData(); renderParcelas(); }
  else showToast(res.error,'error');
}
function openRenegModal(id) {
  const p = App.data.parcelas.find(x=>x.id===id)||{};
  openModal('Renegociar Parcela',`
    <p>Parcela atual: <b>${fmt(p.value)}</b> — vence ${fmtDate(p.dueDate)}</p>
    <div class="form-group"><label>Nº de novas parcelas</label>
      <input id="rnCount" type="number" min="1" value="2" oninput="buildRenegFields()"/></div>
    <div id="rnFields"></div>`,
    `<button class="btn-secondary" onclick="closeModal()">Cancelar</button>
     <button class="btn-primary" onclick="saveReneg('${id}')">Confirmar</button>`);
  buildRenegFields();
}
function buildRenegFields() {
  const n = parseInt(document.getElementById('rnCount')?.value)||1;
  const wrap = document.getElementById('rnFields');
  if (!wrap) return;
  let html = '';
  for (let i=0;i<n;i++) {
    const d = new Date(); d.setMonth(d.getMonth()+i+1);
    const dStr = d.toISOString().split('T')[0];
    html += `<div style="display:flex;gap:8px;margin-bottom:8px">
      <input type="number" step="0.01" id="rnV${i}" placeholder="Valor ${i+1}" style="flex:1"/>
      <input type="date" id="rnD${i}" value="${dStr}" style="flex:1"/>
    </div>`;
  }
  wrap.innerHTML = html;
}
async function saveReneg(id) {
  const n = parseInt(document.getElementById('rnCount').value)||1;
  const vals=[],dates=[];
  for(let i=0;i<n;i++){
    vals.push(parseFloat(document.getElementById(`rnV${i}`).value)||0);
    dates.push(document.getElementById(`rnD${i}`).value);
  }
  const res = await API.renegotiate(App.user.username, id, n, vals, dates);
  if (res.success) { showToast('Renegociado!','success'); closeModal(); await refreshData(); renderParcelas(); }
  else showToast(res.error,'error');
}
ditParcela('${id}')">Salvar</button>`);
}
async function saveEditParcela(id) {
  const parcela = {
    id,
    value:   parseFloat(document.getElementById('epValue').value)||0,
    dueDate: document.getElementById('epDue').value,
    note:    document.getElementById('epNote').value.trim(),
  };
  const res = await API.updateParcela(App.user.username, parcela);
  if (res.success) { showToast('Parcela atualizada!','success'); closeModal(); await refreshData(); renderParcelas(); }
  else showToast(res.error,'error');
}
async function deleteParcela(id) {
  if (!confirm('Excluir esta parcela?')) return;
  const res = await API.deleteParcela(App.user.username, id);
  if (res.success) { showToast('Parcela excluída.','success'); await refreshData(); renderParcelas(); }
  else showToast(res.error,'error');
}
function openRenegModal(id) {
  const p = App.data.parcelas.find(x=>x.id===id)||{};
  openModal('Renegociar Parcela',`
    <p style="margin-bottom:12px">Parcela atual: <b>${fmt(p.value)}</b> — vence em <b>${fmtDate(p.dueDate)}</b></p>
    <div class="form-group"><label>Dividir em quantas parcelas?</label>
      <input id="rnQty" type="number" min="2" max="24" value="2" oninput="buildRenegFields()"/></div>
    <div id="rnFields"></div>`,
    `<button class="btn-secondary" onclick="closeModal()">Cancelar</button>
     <button class="btn-primary" onclick="saveReneg('${id}')">Confirmar</button>`);
  buildRenegFields();
}
function buildRenegFields() {
  const n   = parseInt(document.getElementById('rnQty')?.value)||2;
  const box = document.getElementById('rnFields');
  if (!box) return;
  let html = '';
  for (let i=0;i<n;i++) {
    const due = addMonthsJS(new Date().toISOString().split('T')[0], i+1);
    html += `<div style="display:flex;gap:8px;margin-bottom:8px">
      <input type="number" step="0.01" placeholder="Valor ${i+1}" id="rnVal${i}" style="flex:1"/>
      <input type="date" id="rnDate${i}" value="${due}" style="flex:1"/>
    </div>`;
  }
  box.innerHTML = html;
}
function addMonthsJS(dateStr, n) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth()+n);
  return d.toISOString().split('T')[0];
}
async function saveReneg(id) {
  const n          = parseInt(document.getElementById('rnQty').value)||2;
  const newValues  = [];
  const newDates   = [];
  for (let i=0;i<n;i++) {
    newValues.push(parseFloat(document.getElementById(`rnVal${i}`).value)||0);
    newDates.push(document.getElementById(`rnDate${i}`).value);
  }
  const res = await API.renegotiate(App.user.username, id, n, newValues, newDates);
  if (res.success) { showToast('Renegociado!','success'); closeModal(); await refreshData(); renderParcelas(); }
  else showToast(res.error,'error');
}

// ── CALENDÁRIO ───────────────────────────────────────────────
function renderCalendar() {
  const today = new Date();
  let year  = today.getFullYear();
  let month = today.getMonth();
  function draw() {
    const el = document.getElementById('pageContent');
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month+1, 0).getDate();
    const monthName = new Date(year,month,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
    const parcelas = App.data.parcelas.filter(p=>{
      const d = new Date(p.dueDate);
      return d.getMonth()===month && d.getFullYear()===year;
    });
    const byDay = {};
    parcelas.forEach(p=>{
      const day = new Date(p.dueDate).getUTCDate();
      if (!byDay[day]) byDay[day]=[];
      byDay[day].push(p);
    });
    let cells = '';
    for (let i=0;i<firstDay;i++) cells += '<div class="cal-cell empty"></div>';
    for (let d=1;d<=daysInMonth;d++) {
      const ps = byDay[d]||[];
      const hasAtrasada = ps.some(p=>p.status==='atrasada');
      const hasAberta   = ps.some(p=>p.status==='aberta');
      const cls = hasAtrasada?'has-danger':hasAberta?'has-warning':'';
      cells += `<div class="cal-cell ${cls}">
        <div class="cal-day">${d}</div>
        ${ps.map(p=>`<div class="cal-event ${p.status}" onclick="openParcelaDetail('${p.id}')">
          ${personName(p.personId)} — ${fmt(p.value)}
        </div>`).join('')}
      </div>`;
    }
    el.innerHTML = `
      <div class="card">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
          <button class="btn-secondary btn-sm" onclick="calPrev()">‹ Anterior</button>
          <span class="card-title" style="text-transform:capitalize">${monthName}</span>
          <button class="btn-secondary btn-sm" onclick="calNext()">Próximo ›</button>
        </div>
        <div class="card-body">
          <div class="cal-grid">
            <div class="cal-header">Dom</div><div class="cal-header">Seg</div>
            <div class="cal-header">Ter</div><div class="cal-header">Qua</div>
            <div class="cal-header">Qui</div><div class="cal-header">Sex</div>
            <div class="cal-header">Sáb</div>
            ${cells}
          </div>
        </div>
      </div>`;
  }
  window.calPrev = () => { if (month===0){month=11;year--;}else month--; draw(); };
  window.calNext = () => { if (month===11){month=0;year++;}else month++; draw(); };
  draw();
}
function openParcelaDetail(id) {
  const p = App.data.parcelas.find(x=>x.id===id);
  if (!p) return;
  openModal('Detalhe da Parcela',`
    <div class="detail-grid">
      <div class="detail-row"><span>Pessoa</span><b>${personName(p.personId)}</b></div>
      <div class="detail-row"><span>Cartão</span><b>${cardLabel(p.cardId)}</b></div>
      <div class="detail-row"><span>Descrição</span><b>${p.description}</b></div>
      <div class="detail-row"><span>Parcela</span><b>${p.number}/${p.totalInstallments}</b></div>
      <div class="detail-row"><span>Valor</span><b>${fmt(p.value)}</b></div>
      <div class="detail-row"><span>Vencimento</span><b>${fmtDate(p.dueDate)}</b></div>
      <div class="detail-row"><span>Status</span>${statusBadge(p.status)}</div>
      ${p.paidAt?`<div class="detail-row"><span>Pago em</span><b>${fmtDate(p.paidAt)}</b></div>`:''}
      ${p.note?`<div class="detail-row"><span>Obs.</span><b>${p.note}</b></div>`:''}
    </div>`,
    `<button class="btn-secondary" onclick="closeModal()">Fechar</button>
     ${p.status!=='paga'?`<button class="btn-primary" onclick="markOnePaid('${p.id}');closeModal()">✅ Marcar Paga</button>`:''}`);
}

// ── FECHAMENTO ───────────────────────────────────────────────
async function renderClosing() {
  const today = new Date();
  let month = today.getMonth()+1;
  let year  = today.getFullYear();
  async function draw() {
    const el = document.getElementById('pageContent');
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><p>Carregando...</p></div>';
    const res = await API.getClosing(App.user.username, month, year);
    if (!res.success) { showToast(res.error,'error'); return; }
    const { resultado } = res.data;
    el.innerHTML = `
      <div class="card mb-4">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
          <button class="btn-secondary btn-sm" onclick="closingPrev()">‹ Anterior</button>
          <span class="card-title">Fechamento — ${String(month).padStart(2,'0')}/${year}</span>
          <button class="btn-secondary btn-sm" onclick="closingNext()">Próximo ›</button>
        </div>
      </div>
      ${!resultado.length
        ?'<div class="empty-state"><div class="empty-icon">🎉</div><p>Nenhuma parcela neste período.</p></div>'
        :resultado.map(r=>`
        <div class="card mb-4">
          <div class="card-header">
            <span class="card-title">👤 ${r.pessoa.name}</span>
            <span style="font-size:13px;color:#64748b">${r.pessoa.phone||''}</span>
          </div>
          <div class="card-body">
            <div class="table-wrapper"><table>
              <thead><tr><th>Descrição</th><th>Parcela</th><th>Vencimento</th><th class="text-right">Valor</th><th>Status</th></tr></thead>
              <tbody>${r.parcelas.map(p=>`
                <tr>
                  <td>${p.description}</td>
                  <td>${p.number}/${p.totalInstallments}</td>
                  <td>${fmtDate(p.dueDate)}</td>
                  <td class="text-right">${fmt(p.value)}</td>
                  <td>${statusBadge(p.status)}</td>
                </tr>`).join('')}
              </tbody>
            </table></div>
            <div class="closing-totals">
              <span>Total: <b>${fmt(r.total)}</b></span>
              <span>Pago: <b class="success">${fmt(r.totalPago)}</b></span>
              <span>Em aberto: <b class="danger">${fmt(r.totalAberto)}</b></span>
            </div>
            <div style="margin-top:12px;display:flex;gap:8px">
              <button class="btn-primary btn-sm" onclick="sendWhatsApp('${r.pessoa.id}',${month},${year})">💬 Cobrar via WhatsApp</button>
              <button class="btn-secondary btn-sm" onclick="viewChargeHistory('${r.pessoa.id}')">📋 Histórico de Cobranças</button>
            </div>
          </div>
        </div>`).join('')}`;
  }
  window.closingPrev = () => { if(month===1){month=12;year--;}else month--; draw(); };
  window.closingNext = () => { if(month===12){month=1;year++;}else month++; draw(); };
  draw();
}
async function sendWhatsApp(personId, month, year) {
  const pessoa = App.data.people.find(p=>p.id===personId);
  if (!pessoa||!pessoa.phone) { showToast('Pessoa sem telefone cadastrado.','warning'); return; }
  const res = await API.getClosing(App.user.username, month, year);
  if (!res.success) return;
  const r = res.data.resultado.find(x=>x.pessoa.id===personId);
  if (!r) return;
  const lines = r.parcelas.filter(p=>p.status!=='paga').map(p=>
    `• ${p.description} (${p.number}/${p.totalInstallments}) — ${fmt(p.value)} — vence ${fmtDate(p.dueDate)}`).join('\n');
  const text = `Olá ${pessoa.name}! 👋\n\nSegue seu resumo de ${String(month).padStart(2,'0')}/${year}:\n\n${lines}\n\n💰 *Total em aberto: ${fmt(r.totalAberto)}*\n\nQualquer dúvida, é só falar! 😊`;
  const phone = String(pessoa.phone).replace(/\D/g,'');
  window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(text)}`,'_blank');
  await API.saveCharge(App.user.username,{
    personId, period:`${month}/${year}`, method:'whatsapp', preview: text.substring(0,200)
  });
  showToast('Cobrança registrada!','success');
}

// ── COBRANÇAS ────────────────────────────────────────────────
async function renderCharges() {
  const el = document.getElementById('pageContent');
  el.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><p>Carregando...</p></div>';
  const res = await API.getCharges(App.user.username);
  if (!res.success) { showToast(res.error,'error'); return; }
  const charges = res.data;
  el.innerHTML = `
    <div class="card"><div class="card-body">
      ${!charges.length
        ?'<div class="empty-state"><div class="empty-icon">💬</div><p>Nenhuma cobrança registrada.</p></div>'
        :`<div class="table-wrapper"><table>
          <thead><tr><th>Pessoa</th><th>Período</th><th>Enviado em</th><th>Método</th><th>Preview</th></tr></thead>
          <tbody>${charges.map(c=>`
            <tr>
              <td>${personName(c.personId)}</td>
              <td>${c.period}</td>
              <td>${fmtDate(c.sentAt)}</td>
              <td>${c.method||'—'}</td>
              <td style="font-size:12px;color:#64748b;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.preview||'—'}</td>
            </tr>`).join('')}
          </tbody></table></div>`}
    </div></div>`;
}
async function viewChargeHistory(personId) {
  const res = await API.getCharges(App.user.username, personId);
  if (!res.success) return;
  const charges = res.data;
  const pessoa  = App.data.people.find(p=>p.id===personId);
  openModal(`Cobranças — ${pessoa?.name||''}`,
    !charges.length
      ?'<p>Nenhuma cobrança registrada para esta pessoa.</p>'
      :`<div class="table-wrapper"><table>
        <thead><tr><th>Período</th><th>Enviado em</th><th>Método</th></tr></thead>
        <tbody>${charges.map(c=>`
          <tr><td>${c.period}</td><td>${fmtDate(c.sentAt)}</td><td>${c.method||'—'}</td></tr>`).join('')}
        </tbody></table></div>`,
    `<button class="btn-secondary" onclick="closeModal()">Fechar</button>`);
}

// ── USUÁRIOS (admin) ─────────────────────────────────────────
async function renderUsers() {
  if (App.user.role!=='admin') return;
  document.getElementById('topbarActions').innerHTML =
    `<button class="btn-primary btn-sm" onclick="openCreateUserModal()">+ Novo Usuário</button>`;
  const el = document.getElementById('pageContent');
  el.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><p>Carregando...</p></div>';
  const res = await API.getUsers(App.user.username);
  if (!res.success) { showToast(res.error,'error'); return; }
  const users = res.data;
  el.innerHTML = `
    <div class="card"><div class="card-body">
      <div class="table-wrapper"><table>
        <thead><tr><th>Usuário</th><th>Nome</th><th>Perfil</th><th>Criado em</th><th>Ações</th></tr></thead>
        <tbody>${users.map(u=>`
          <tr>
            <td><b>${u.username}</b></td>
            <td>${u.name}</td>
            <td><span class="badge ${u.role==='admin'?'badge-primary':'badge-gray'}">${u.role}</span></td>
            <td>${fmtDate(u.createdAt)}</td>
            <td>${u.username==='admin'?'—':`<button class="btn-icon" onclick="deleteUser('${u.username}')">🗑️</button>`}</td>
          </tr>`).join('')}
        </tbody></table></div>
    </div></div>`;
}
function openCreateUserModal() {
  openModal('Novo Usuário',`
    <div class="form-group"><label>Usuário *</label><input id="nuUser" placeholder="login"/></div>
    <div class="form-group"><label>Nome *</label><input id="nuName" placeholder="Nome completo"/></div>
    <div class="form-group"><label>Senha *</label><input id="nuPass" type="password" placeholder="senha"/></div>
    <div class="form-group"><label>Perfil</label>
      <select id="nuRole"><option value="user">Usuário</option><option value="admin">Admin</option></select></div>`,
    `<button class="btn-secondary" onclick="closeModal()">Cancelar</button>
     <button class="btn-primary" onclick="createUser()">Criar</button>`);
}
async function createUser() {
  const newUser = {
    username: document.getElementById('nuUser').value.trim(),
    name:     document.getElementById('nuName').value.trim(),
    password: document.getElementById('nuPass').value,
    role:     document.getElementById('nuRole').value,
  };
  const res = await API.createUser(App.user.username, newUser);
  if (res.success) { showToast('Usuário criado!','success'); closeModal(); renderUsers(); }
  else showToast(res.error,'error');
}
async function deleteUser(targetUsername) {
  if (!confirm(`Excluir usuário "${targetUsername}" e todos os dados?`)) return;
  const res = await API.deleteUser(App.user.username, targetUsername);
  if (res.success) { showToast('Usuário excluído.','success'); renderUsers(); }
  else showToast(res.error,'error');
}

// ── BACKUP (admin) ───────────────────────────────────────────
async function renderBackup() {
  if (App.user.role!=='admin') return;
  const el = document.getElementById('pageContent');
  el.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><p>Carregando...</p></div>';
  const res = await API.getBackupLog(App.user.username);
  const logs = res.success ? res.data : [];
  el.innerHTML = `
    <div class="card mb-4">
      <div class="card-header"><span class="card-title">💾 Backup Geral</span></div>
      <div class="card-body">
        <p style="margin-bottom:16px;color:#64748b">Cria uma cópia completa de toda a planilha no Google Drive.</p>
        <button class="btn-primary" onclick="doBackup()">🔒 Fazer Backup Agora</button>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title">📋 Histórico de Backups</span></div>
      <div class="card-body">
        ${!logs.length
          ?'<div class="empty-state"><div class="empty-icon">📋</div><p>Nenhum backup realizado.</p></div>'
          :`<div class="table-wrapper"><table>
            <thead><tr><th>Data</th><th>Por</th><th>Tipo</th><th>Status</th><th>Nome</th></tr></thead>
            <tbody>${logs.map(l=>`
              <tr>
                <td>${fmtDate(l.triggeredAt)}</td>
                <td>${l.triggeredBy}</td>
                <td>${l.type}</td>
                <td><span class="badge ${l.status==='ok'?'badge-success':'badge-danger'}">${l.status}</span></td>
                <td style="font-size:12px">${l.detail||'—'}</td>
              </tr>`).join('')}
            </tbody></table></div>`}
      </div>
    </div>`;
}
async function doBackup() {
  showToast('Iniciando backup...','info');
  const res = await API.triggerBackup(App.user.username);
  if (res.success) { showToast('Backup realizado com sucesso!','success'); renderBackup(); }
  else showToast(res.error,'error');
}
