const API_URL = 'https://script.google.com/macros/s/AKfycbzexNQ5hoYMnGeNq1mW7FGagysOpPQzCItNTSFuZPNjwxprZonMH_t7ys1KN9eiynGOgQ/exec';

async function apiCall(action, data = {}) {
  const params = new URLSearchParams();
  params.append('action', action);
  params.append('data', JSON.stringify(data));
  const res  = await fetch(`${API_URL}?${params.toString()}`, { method: 'GET', redirect: 'follow' });
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { return { success: false, error: 'Resposta inválida: ' + text.substring(0, 100) }; }
}

const API = {
  // AUTH
  login: (username, password) =>
    apiCall('login', { username, password }),

  // PESSOAS
  getPeople: (username) =>
    apiCall('getPeople', { username }),
  savePerson: (username, person) =>
    apiCall('savePerson', { username, person }),
  deletePerson: (username, personId) =>
    apiCall('deletePerson', { username, personId }),

  // CARTÕES
  getCards: (username) =>
    apiCall('getCards', { username }),
  saveCard: (username, card) =>
    apiCall('saveCard', { username, card }),
  deleteCard: (username, cardId) =>
    apiCall('deleteCard', { username, cardId }),

  // COMPRAS
  getPurchases: (username) =>
    apiCall('getPurchases', { username }),
  savePurchase: (username, purchase) =>
    apiCall('savePurchase', { username, purchase }),
  deletePurchase: (username, purchaseId) =>
    apiCall('deletePurchase', { username, purchaseId }),

  // PARCELAS
  getParcelas: (username, filters = {}) =>
    apiCall('getParcelas', { username, ...filters }),
  updateParcela: (username, parcela) =>
    apiCall('updateParcela', { username, parcela }),
  deleteParcela: (username, parcelaId) =>
    apiCall('deleteParcela', { username, parcelaId }),
  markPaid: (username, parcelaIds, paidAt) =>
    apiCall('markPaid', { username, parcelaIds, paidAt }),
  unmarkPaid: (username, parcelaId) =>
    apiCall('unmarkPaid', { username, parcelaId }),
  renegotiate: (username, parcelaId, newInstallments) =>
    apiCall('renegotiate', { username, parcelaId, newInstallments }),

  // DASHBOARD
  getDashboard: (username) =>
    apiCall('getDashboard', { username }),

  // FECHAMENTO
  getClosing: (username, month, year) =>
    apiCall('getClosing', { username, month, year }),

  // COBRANÇAS
  saveCharge: (username, charge) =>
    apiCall('saveCharge', { username, charge }),
  getCharges: (username, personId) =>
    apiCall('getCharges', { username, personId }),

  // USUÁRIOS (admin)
  getUsers: (username) =>
    apiCall('getUsers', { username }),
  createUser: (username, newUser) =>
    apiCall('createUser', { username, newUser }),
  deleteUser: (username, targetUsername) =>
    apiCall('deleteUser', { username, targetUsername }),

  // BACKUP (admin)
  triggerBackup: (username) =>
    apiCall('triggerBackup', { username }),
  restoreBackup: (username, backupId) =>
    apiCall('restoreBackup', { username, backupId }),
  getBackupLog: (username) =>
    apiCall('getBackupLog', { username }),

  // EXPORTAÇÃO
  exportUserData: (username, format) =>
    apiCall('exportUserData', { username, format }),
};

// ── SESSÃO ────────────────────────────────────────────────────
function saveSession(userData) {
  // Salva em ambos para compatibilidade
  localStorage.setItem('cardcontrol_session', JSON.stringify(userData));
  sessionStorage.setItem('cc_user', JSON.stringify(userData));
}

function getSession() {
  const raw = sessionStorage.getItem('cc_user') || localStorage.getItem('cardcontrol_session');
  if (!raw) {
    window.location.href = 'index.html';
    throw new Error('Sessão expirada.');
  }
  return JSON.parse(raw);
}

function clearSession() {
  localStorage.removeItem('cardcontrol_session');
  sessionStorage.removeItem('cc_user');
}
