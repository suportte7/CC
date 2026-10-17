// ============================================================
// api.js — CardControl — versão corrigida para Apps Script
// ============================================================

const API_URL = 'https://script.google.com/macros/s/AKfycbwTmtM_imbxOND9o7orrbUDWg73ol_q7UD8nwYfW4RSyLIOrMQJSXELyyvHXxI2K_DMyw/exec';

async function apiCall(action, data = {}) {
  try {
    const params = new URLSearchParams();
    params.append('action', action);
    params.append('data', JSON.stringify(data));

    const res = await fetch(`${API_URL}?${params.toString()}`, {
      method: 'GET',
      redirect: 'follow'
    });

    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { success: false, error: 'Resposta inválida do servidor: ' + text.substring(0, 100) };
    }
  } catch (err) {
    return { success: false, error: 'Erro de conexão: ' + err.message };
  }
}

// ── AUTH ─────────────────────────────────────────────────────

async function apiLogin(username, password) {
  return await apiCall('login', { username, password });
}

// ── PESSOAS ──────────────────────────────────────────────────

async function apiGetPeople() {
  const user = getSession();
  return await apiCall('getPeople', { username: user.username });
}

async function apiSavePerson(person) {
  const user = getSession();
  return await apiCall('savePerson', { username: user.username, person });
}

async function apiDeletePerson(personId) {
  const user = getSession();
  return await apiCall('deletePerson', { username: user.username, personId });
}

// ── CARTÕES ──────────────────────────────────────────────────

async function apiGetCards() {
  const user = getSession();
  return await apiCall('getCards', { username: user.username });
}

async function apiSaveCard(card) {
  const user = getSession();
  return await apiCall('saveCard', { username: user.username, card });
}

async function apiDeleteCard(cardId) {
  const user = getSession();
  return await apiCall('deleteCard', { username: user.username, cardId });
}

// ── COMPRAS ──────────────────────────────────────────────────

async function apiGetPurchases() {
  const user = getSession();
  return await apiCall('getPurchases', { username: user.username });
}

async function apiSavePurchase(purchase) {
  const user = getSession();
  return await apiCall('savePurchase', { username: user.username, purchase });
}

async function apiDeletePurchase(purchaseId) {
  const user = getSession();
  return await apiCall('deletePurchase', { username: user.username, purchaseId });
}

// ── PARCELAS ─────────────────────────────────────────────────

async function apiGetParcelas(filters = {}) {
  const user = getSession();
  return await apiCall('getParcelas', { username: user.username, ...filters });
}

async function apiUpdateParcela(parcela) {
  const user = getSession();
  return await apiCall('updateParcela', { username: user.username, parcela });
}

async function apiDeleteParcela(parcelaId) {
  const user = getSession();
  return await apiCall('deleteParcela', { username: user.username, parcelaId });
}

async function apiMarkPaid(parcelaIds, paidAt) {
  const user = getSession();
  return await apiCall('markPaid', { username: user.username, parcelaIds, paidAt });
}

async function apiUnmarkPaid(parcelaId) {
  const user = getSession();
  return await apiCall('unmarkPaid', { username: user.username, parcelaId });
}

async function apiRenegotiate(parcelaId, newInstallments, newValues, newDates) {
  const user = getSession();
  return await apiCall('renegotiate', {
    username: user.username,
    parcelaId,
    newInstallments,
    newValues,
    newDates
  });
}

// ── DASHBOARD ────────────────────────────────────────────────

async function apiGetDashboard() {
  const user = getSession();
  return await apiCall('getDashboard', { username: user.username });
}

// ── FECHAMENTO ───────────────────────────────────────────────

async function apiGetClosing(month, year) {
  const user = getSession();
  return await apiCall('getClosing', { username: user.username, month, year });
}

// ── COBRANÇAS ────────────────────────────────────────────────

async function apiSaveCharge(charge) {
  const user = getSession();
  return await apiCall('saveCharge', { username: user.username, charge });
}

async function apiGetCharges(personId) {
  const user = getSession();
  return await apiCall('getCharges', { username: user.username, personId });
}

// ── USUÁRIOS (ADMIN) ─────────────────────────────────────────

async function apiGetUsers() {
  const user = getSession();
  return await apiCall('getUsers', { username: user.username });
}

async function apiCreateUser(newUser) {
  const user = getSession();
  return await apiCall('createUser', { username: user.username, newUser });
}

async function apiDeleteUser(targetUsername) {
  const user = getSession();
  return await apiCall('deleteUser', { username: user.username, targetUsername });
}

// ── BACKUP (ADMIN) ───────────────────────────────────────────

async function apiTriggerBackup() {
  const user = getSession();
  return await apiCall('triggerBackup', { username: user.username });
}

async function apiRestoreBackup(backupId) {
  const user = getSession();
  return await apiCall('restoreBackup', { username: user.username, backupId });
}

async function apiGetBackupLog() {
  const user = getSession();
  return await apiCall('getBackupLog', { username: user.username });
}

// ── EXPORTAÇÃO ───────────────────────────────────────────────

async function apiExportUserData(format) {
  const user = getSession();
  return await apiCall('exportUserData', { username: user.username, format });
}

// ── SESSÃO ───────────────────────────────────────────────────

function getSession() {
  const raw = localStorage.getItem('cardcontrol_session');
  if (!raw) {
    window.location.href = 'index.html';
    throw new Error('Sessão expirada.');
  }
  return JSON.parse(raw);
}

function saveSession(userData) {
  localStorage.setItem('cardcontrol_session', JSON.stringify(userData));
}

function clearSession() {
  localStorage.removeItem('cardcontrol_session');
}

function isAdmin() {
  const user = getSession();
  return user.role === 'admin';
}

function requireAdmin() {
  if (!isAdmin()) {
    alert('Acesso restrito ao administrador.');
    window.location.href = 'app.html';
    throw new Error('Acesso negado.');
  }
}
