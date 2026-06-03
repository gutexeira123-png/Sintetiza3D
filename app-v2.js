/* ============================================================
   FinançasPRO – App Logic with Supabase Integration
   ============================================================ */

// Importar cliente Supabase
import {
  getTransactions,
  createTransaction as supabaseCreateTransaction,
  deleteTransaction as supabaseDeleteTransaction,
  isSupabaseConfigured,
  getSupabaseStatus,
  clearCache,
  getSession,
  signOut,
  getSupabaseClient
} from './supabase-client.js';

// ── Mock Data (Fallback) ──────────────────────────────────
// Mantém dados mock para demonstração se Supabase não estiver disponível
const MOCK_TRANSACTIONS = [
  { id: 1, type: 'income',  description: 'Venda de produtos – Lote Mai',  category: 'Vendas',      amount: 8500.00, date: '2026-05-20', note: 'Pedido #1042' },
  { id: 2, type: 'expense', description: 'Aluguel do escritório',          category: 'Aluguel',     amount: 2200.00, date: '2026-05-20', note: 'Referente a maio/2026' },
  { id: 3, type: 'income',  description: 'Serviço de consultoria',         category: 'Serviços',    amount: 3200.00, date: '2026-05-18', note: 'Cliente: TechCorp' },
  { id: 4, type: 'expense', description: 'Conta de energia elétrica',      category: 'Utilidades',  amount: 480.50,  date: '2026-05-17', note: '' },
  { id: 5, type: 'expense', description: 'Fornecedor – Insumos Gráficos',  category: 'Fornecedores',amount: 1340.00, date: '2026-05-15', note: 'NF-e 987' },
  { id: 6, type: 'income',  description: 'Comissão de parceria',           category: 'Comissões',   amount: 950.00,  date: '2026-05-14', note: '' },
  { id: 7, type: 'expense', description: 'Imposto simples nacional',       category: 'Impostos',    amount: 1100.00, date: '2026-05-10', note: 'Competência abr/2026' },
  { id: 8, type: 'income',  description: 'Venda online – E-commerce',      category: 'Vendas',      amount: 4750.00, date: '2026-05-08', note: 'Marketplace' },
  { id: 9, type: 'expense', description: 'Salários – Equipe',              category: 'Salários',    amount: 6800.00, date: '2026-05-05', note: 'Folha de pagamento' },
  { id:10, type: 'expense', description: 'Campanha de marketing digital',  category: 'Marketing',   amount: 700.00,  date: '2026-05-03', note: 'Google Ads' },
  { id:11, type: 'income',  description: 'Prestação de serviços – web',    category: 'Serviços',    amount: 2100.00, date: '2026-05-02', note: 'Desenvolvimento de site' },
  { id:12, type: 'expense', description: 'Manutenção de equipamentos',     category: 'Manutenção',  amount: 380.00,  date: '2026-05-01', note: '' },
];

// ── State ─────────────────────────────────────────────────
let state = {
  transactions: [],
  nextId: 100,
  filterType: 'all',
  filterSearch: '',
  loading: false,
  supabseReady: false
};

// ── Helpers ───────────────────────────────────────────────
function formatCurrency(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function categoryIcon(category) {
  const icons = {
    'Vendas': '🛍️', 'Serviços': '🔧', 'Comissões': '🤝', 'Investimentos': '📈',
    'Aluguel': '🏢', 'Salários': '👥', 'Fornecedores': '📦', 'Marketing': '📣',
    'Utilidades': '💡', 'Impostos': '🏛️', 'Manutenção': '🔨',
  };
  return icons[category] || '💼';
}

function generateId() {
  return ++state.nextId;
}

// ── Summary Calculations ──────────────────────────────────
function calcSummary() {
  let totalIncome = 0, totalExpense = 0;
  let incomeCount = 0, expenseCount = 0;
  state.transactions.forEach(tx => {
    if (tx.type === 'income')  { totalIncome  += tx.amount; incomeCount++; }
    if (tx.type === 'expense') { totalExpense += tx.amount; expenseCount++; }
  });
  return { totalIncome, totalExpense, balance: totalIncome - totalExpense, incomeCount, expenseCount };
}

// ── Render Cards ──────────────────────────────────────────
function renderCards() {
  const { totalIncome, totalExpense, balance, incomeCount, expenseCount } = calcSummary();

  document.getElementById('balanceValue').textContent  = formatCurrency(balance);
  document.getElementById('incomeValue').textContent   = formatCurrency(totalIncome);
  document.getElementById('expenseValue').textContent  = formatCurrency(totalExpense);
  document.getElementById('incomeCount').textContent   = `${incomeCount} lançamento${incomeCount !== 1 ? 's' : ''}`;
  document.getElementById('expenseCount').textContent  = `${expenseCount} lançamento${expenseCount !== 1 ? 's' : ''}`;

  const trendEl = document.getElementById('balanceTrend');
  if (balance >= 0) {
    trendEl.textContent = '▲ Positivo';
    trendEl.className = 'card-trend positive';
  } else {
    trendEl.textContent = '▼ Negativo';
    trendEl.className = 'card-trend negative';
  }
}

// ── Render Recent Transactions List ───────────────────────
function renderRecentList() {
  const container = document.getElementById('recentTransactionsList');
  const recent = [...state.transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);

  if (recent.length === 0) {
    container.innerHTML = '<div class="tx-empty">Nenhuma transação encontrada.</div>';
    return;
  }

  container.innerHTML = recent.map(tx => `
    <div class="tx-item" data-id="${tx.id}">
      <div class="tx-icon ${tx.type}">${categoryIcon(tx.category)}</div>
      <div class="tx-info">
        <div class="tx-desc">${escapeHtml(tx.description)}</div>
        <div class="tx-meta">${escapeHtml(tx.category || 'Sem categoria')} · ${formatDate(tx.date)}</div>
      </div>
      <div class="tx-amount ${tx.type}">
        ${tx.type === 'income' ? '+' : '-'}${formatCurrency(tx.amount)}
      </div>
    </div>
  `).join('');
}

// ── Render Full Transactions Table ────────────────────────
function renderTable() {
  const tbody = document.getElementById('transactionsTableBody');

  let filtered = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date));

  if (state.filterType !== 'all') {
    filtered = filtered.filter(tx => tx.type === state.filterType);
  }
  if (state.filterSearch.trim()) {
    const q = state.filterSearch.trim().toLowerCase();
    filtered = filtered.filter(tx =>
      tx.description.toLowerCase().includes(q) ||
      (tx.category || '').toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;padding:32px;color:var(--color-text-muted)">
          Nenhuma transação encontrada.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(tx => `
    <tr data-id="${tx.id}">
      <td>${formatDate(tx.date)}</td>
      <td>
        <div style="font-weight:600">${escapeHtml(tx.description)}</div>
        ${tx.note ? `<div style="font-size:12px;color:var(--color-text-muted)">${escapeHtml(tx.note)}</div>` : ''}
      </td>
      <td>
        <span style="display:inline-flex;align-items:center;gap:4px">
          ${categoryIcon(tx.category)}&nbsp;${escapeHtml(tx.category || '—')}
        </span>
      </td>
      <td>
        <span class="type-badge ${tx.type}">
          ${tx.type === 'income' ? '↑ Receita' : '↓ Despesa'}
        </span>
      </td>
      <td class="text-right amount-cell ${tx.type}">
        ${tx.type === 'income' ? '+' : '-'}${formatCurrency(tx.amount)}
      </td>
      <td class="text-right">
        <button class="btn-delete" data-id="${tx.id}" title="Remover transação" aria-label="Remover transação">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M3 3l9 9M12 3l-9 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </button>
      </td>
    </tr>
  `).join('');

  // Delete buttons
  tbody.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      deleteTransaction(id);
    });
  });
}

// ── Render Chart ──────────────────────────────────────────
function renderChart() {
  const canvas = document.getElementById('summaryChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 400;
  const H = 180;
  canvas.width = W;
  canvas.height = H;

  // Group by day (last 7 days of transactions)
  const days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }

  const incomeByDay  = days.map(d => state.transactions.filter(tx => tx.date === d && tx.type === 'income' ).reduce((s, tx) => s + tx.amount, 0));
  const expenseByDay = days.map(d => state.transactions.filter(tx => tx.date === d && tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0));

  const maxVal = Math.max(...incomeByDay, ...expenseByDay, 1);
  const padL = 12, padR = 12, padT = 16, padB = 28;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const step = chartW / (days.length - 1);

  ctx.clearRect(0, 0, W, H);

  // Grid lines
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const labelColor = isDark ? '#64748b' : '#94a3b8';

  for (let i = 0; i <= 4; i++) {
    const y = padT + (chartH / 4) * i;
    ctx.beginPath();
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.moveTo(padL, y);
    ctx.lineTo(W - padR, y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Draw filled areas
  function drawArea(values, color, alpha) {
    const points = values.map((v, i) => ({
      x: padL + i * step,
      y: padT + chartH - (v / maxVal) * chartH,
    }));

    // Fill
    ctx.beginPath();
    ctx.moveTo(points[0].x, padT + chartH);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, padT + chartH);
    ctx.closePath();
    ctx.fillStyle = color.replace('1)', `${alpha})`);
    ctx.fill();

    // Line
    ctx.beginPath();
    points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Dots
    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = isDark ? '#16162a' : '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }

  drawArea(expenseByDay, 'rgba(244,63,94,1)', 0.12);
  drawArea(incomeByDay,  'rgba(16,185,129,1)', 0.15);

  // Day labels
  ctx.fillStyle = labelColor;
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'center';
  const dayNames = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  days.forEach((d, i) => {
    const date = new Date(d + 'T00:00:00');
    ctx.fillText(dayNames[date.getDay()], padL + i * step, H - 6);
  });
}

// ── Load Transactions from Supabase ───────────────────────
async function loadTransactions() {
  state.loading = true;
  try {
    const transactions = await getTransactions({ forceRefresh: true });
    state.transactions = transactions;
    state.supabaseReady = true;
    console.log('✅ Transações carregadas:', transactions.length);
    renderAll();
  } catch (error) {
    console.error('Erro ao carregar transações:', error);
    // Usar mock data como fallback
    state.transactions = [...MOCK_TRANSACTIONS];
    showToast('⚠️ Usando dados locais (Supabase indisponível)', 'info');
    renderAll();
  } finally {
    state.loading = false;
  }
}

// ── Add Transaction ───────────────────────────────────────
async function addTransaction(txData) {
  if (state.loading) {
    showToast('Aguarde... carregando dados', 'info');
    return;
  }

  try {
    const result = await supabaseCreateTransaction({
      type: txData.type,
      description: txData.description.trim(),
      category: txData.category || 'Outros',
      amount: parseFloat(txData.amount),
      date: txData.date,
      note: txData.note?.trim() || ''
    });

    if (result.error) {
      showToast(`❌ Erro: ${result.error}`, 'error');
      return;
    }

    // Recarregar transações do Supabase
    await loadTransactions();
    showToast(`✅ Transação "${txData.description}" adicionada com sucesso!`, 'success');
  } catch (error) {
    console.error('Erro ao adicionar transação:', error);
    showToast('❌ Erro ao adicionar transação', 'error');
  }
}

// ── Delete Transaction ────────────────────────────────────
async function deleteTransaction(id) {
  if (state.loading) {
    showToast('Aguarde... carregando dados', 'info');
    return;
  }

  const tx = state.transactions.find(t => t.id === id);
  if (!tx) return;

  try {
    const result = await supabaseDeleteTransaction(id);

    if (result.error) {
      showToast(`❌ Erro: ${result.error}`, 'error');
      return;
    }

    // Recarregar transações do Supabase
    await loadTransactions();
    showToast(`✅ "${tx.description}" removida.`, 'success');
  } catch (error) {
    console.error('Erro ao deletar transação:', error);
    showToast('❌ Erro ao deletar transação', 'error');
  }
}

// ── Render All ────────────────────────────────────────────
function renderAll() {
  renderCards();
  renderRecentList();
  renderTable();
  renderChart();
}

// ── Toast ─────────────────────────────────────────────────
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.innerHTML = '<div class="toast-dot"></div><span>' + escapeHtml(message) + '</span>';
  toast.className = `toast ${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
  toast.style.animation = 'none';
  toast.offsetHeight;
  toast.style.animation = '';
}

// ── Form Validation ───────────────────────────────────────
function validateForm(fields) {
  let valid = true;
  fields.forEach(({ el, rule }) => {
    el.classList.remove('error');
    if (!rule(el.value)) {
      el.classList.add('error');
      valid = false;
    }
  });
  return valid;
}

// ── Navigation ────────────────────────────────────────────
const sections = ['dashboard', 'transactions', 'add', 'calc3d', 'ideias', 'quotes'];
const pageTitles = { dashboard: 'Painel Financeiro', transactions: 'Transações', add: 'Nova Transação', calc3d: 'Precificação 3D', ideias: 'Ideias de Conteúdo', quotes: 'Gerador de Orçamentos' };

function navigateTo(page) {
  sections.forEach(s => {
    document.getElementById(`section-${s}`).classList.toggle('active', s === page);
    document.getElementById(`nav-${s}`)?.classList.toggle('active', s === page);
  });
  document.getElementById('pageTitle').textContent = pageTitles[page] || '';

  // On mobile, close sidebar
  if (window.innerWidth < 768) {
    document.getElementById('sidebar').classList.remove('mobile-open');
  }
}

function setupNav() {
  sections.forEach(s => {
    const navEl = document.getElementById(`nav-${s}`);
    if (navEl) {
      navEl.addEventListener('click', e => {
        e.preventDefault();
        navigateTo(s);
      });
    }
  });

  // "Ver todas" link
  document.getElementById('viewAllLink')?.addEventListener('click', e => {
    e.preventDefault();
    navigateTo('transactions');
  });
}

// ── Sidebar Toggle ────────────────────────────────────────
function setupSidebar() {
  const sidebar = document.getElementById('sidebar');
  const main    = document.getElementById('main');
  const menuBtn = document.getElementById('menuBtn');
  const sidebarToggle = document.getElementById('sidebarToggle');

  menuBtn.addEventListener('click', () => {
    if (window.innerWidth < 768) {
      sidebar.classList.toggle('mobile-open');
    } else {
      sidebar.classList.toggle('collapsed');
      main.classList.toggle('expanded');
    }
  });

  sidebarToggle.addEventListener('click', () => {
    if (window.innerWidth < 768) {
      sidebar.classList.remove('mobile-open');
    } else {
      sidebar.classList.add('collapsed');
      main.classList.add('expanded');
    }
  });
}

// ── Theme Toggle ──────────────────────────────────────────
function setupTheme() {
  const btn  = document.getElementById('themeToggle');
  const icon = document.getElementById('themeIcon');

  const saved = localStorage.getItem('financas-theme') || 'dark';
  applyTheme(saved);

  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('financas-theme', next);
    setTimeout(renderChart, 50);
  });

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    // Update icon
    if (theme === 'light') {
      icon.innerHTML = `
        <path d="M10 3a7 7 0 1 0 7 7 5 5 0 1 1-7-7z" fill="currentColor" opacity=".8"/>`;
    } else {
      icon.innerHTML = `
        <path d="M10 2v2M10 16v2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M2 10h2M16 10h2M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <circle cx="10" cy="10" r="3" stroke="currentColor" stroke-width="1.8"/>`;
    }
  }
}

// ── Type Toggle Helper ────────────────────────────────────
function setupTypeToggle(incomeBtnId, expenseBtnId, hiddenInputId) {
  const incomeBtn  = document.getElementById(incomeBtnId);
  const expenseBtn = document.getElementById(expenseBtnId);
  const hiddenInput = document.getElementById(hiddenInputId);

  function setType(type) {
    hiddenInput.value = type;
    incomeBtn.classList.toggle('active',  type === 'income');
    expenseBtn.classList.toggle('active', type === 'expense');
  }

  incomeBtn.addEventListener('click',  () => setType('income'));
  expenseBtn.addEventListener('click', () => setType('expense'));
}

// ── Main Form ─────────────────────────────────────────────
function setupMainForm() {
  const form = document.getElementById('transactionForm');
  const clearBtn = document.getElementById('clearFormBtn');

  setupTypeToggle('typeIncome', 'typeExpense', 'txType');

  document.getElementById('txDate').value = todayISO();

  form.addEventListener('submit', e => {
    e.preventDefault();

    const desc   = document.getElementById('txDescription');
    const amount = document.getElementById('txAmount');
    const date   = document.getElementById('txDate');

    const valid = validateForm([
      { el: desc,   rule: v => v.trim().length > 0 },
      { el: amount, rule: v => parseFloat(v) > 0 },
      { el: date,   rule: v => v.length > 0 },
    ]);

    if (!valid) {
      showToast('Preencha todos os campos obrigatórios.', 'error');
      return;
    }

    addTransaction({
      type:        document.getElementById('txType').value,
      description: desc.value,
      amount:      amount.value,
      category:    document.getElementById('txCategory').value,
      date:        date.value,
      note:        document.getElementById('txNote').value,
    });

    form.reset();
    document.getElementById('txDate').value = todayISO();
    document.getElementById('typeIncome').classList.add('active');
    document.getElementById('typeExpense').classList.remove('active');
    document.getElementById('txType').value = 'income';
  });

  clearBtn.addEventListener('click', () => {
    form.reset();
    document.getElementById('txDate').value = todayISO();
    document.getElementById('typeIncome').classList.add('active');
    document.getElementById('typeExpense').classList.remove('active');
    document.getElementById('txType').value = 'income';
    document.querySelectorAll('.form-input.error').forEach(el => el.classList.remove('error'));
  });
}

// ── Modal ─────────────────────────────────────────────────
function setupModal() {
  const overlay    = document.getElementById('modalOverlay');
  const openBtn    = document.getElementById('openModalBtn');
  const form       = document.getElementById('modalForm');

  setupTypeToggle('modalTypeIncome', 'modalTypeExpense', 'modalTxType');

  function openModal() {
    overlay.classList.add('active');
    document.getElementById('modalDate').value = todayISO();
    setTimeout(() => document.getElementById('modalDescription').focus(), 100);
  }

  function closeModal() {
    overlay.classList.remove('active');
    form.reset();
    form.querySelectorAll('.form-input').forEach(el => el.classList.remove('error'));
    document.getElementById('modalTypeIncome').classList.add('active');
    document.getElementById('modalTypeExpense').classList.remove('active');
    document.getElementById('modalTxType').value = 'income';
  }

  openBtn.addEventListener('click', openModal);

  form.addEventListener('submit', e => {
    e.preventDefault();
    const desc   = document.getElementById('modalDescription');
    const amount = document.getElementById('modalAmount');
    const date   = document.getElementById('modalDate');

    const valid = validateForm([
      { el: desc,   rule: v => v.trim().length > 0 },
      { el: amount, rule: v => parseFloat(v) > 0 },
      { el: date,   rule: v => v.length > 0 },
    ]);

    if (!valid) { showToast('Preencha todos os campos obrigatórios.', 'error'); return; }

    addTransaction({
      type:        document.getElementById('modalTxType').value,
      description: desc.value,
      amount:      amount.value,
      category:    document.getElementById('modalCategory').value,
      date:        date.value,
      note:        '',
    });

    closeModal();
    navigateTo('dashboard');
  });
}

// ── Filters ───────────────────────────────────────────────
function setupFilters() {
  document.getElementById('filterType').addEventListener('change', e => {
    state.filterType = e.target.value;
    renderTable();
  });

  document.getElementById('filterSearch').addEventListener('input', e => {
    state.filterSearch = e.target.value;
    renderTable();
  });
}

// ── Date & Month labels ───────────────────────────────────
function setupDateLabels() {
  const now = new Date();
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const weekdays = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];

  document.getElementById('currentDate').textContent =
    `${weekdays[now.getDay()]}, ${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}`;

  document.getElementById('currentMonth').textContent =
    `${months[now.getMonth()]} ${now.getFullYear()}`;
}

// ── Resize handler ────────────────────────────────────────
function setupResize() {
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderChart, 150);
  });
}

// ── 3D Pricing Calculator ─────────────────────────────────
function setup3DCalculator() {
  const form = document.getElementById('calc3dForm');
  const resetBtn = document.getElementById('c3dResetBtn');
  if (!form) return;

  // Default values for reset
  const defaults = {
    c3dFilamentType: 'PLA',
    c3dFilamentPrice: 120,
    c3dFilamentWeight: 50,
    c3dFilamentWaste: 5,
    c3dEnergyPrice: 0.85,
    c3dPrinterWatts: 350,
    c3dPrintHours: 4,
    c3dPrintMinutes: 30,
    c3dPrinterCost: 2500,
    c3dPrinterLifespan: 3000,
    c3dNozzleCost: 25,
    c3dNozzleLife: 500,
    c3dBedCost: 80,
    c3dBedLife: 1500,
    c3dOtherMaintenance: 0.50,
    c3dLaborRate: 30,
    c3dLaborTime: 30,
    c3dFailRate: 8,
    c3dProfitMargin: 50,
    c3dQuantity: 1,
  };

  function getVal(id) {
    return parseFloat(document.getElementById(id).value) || 0;
  }

  function calculate() {
    // ── Material ──
    const filamentPricePerKg = getVal('c3dFilamentPrice');
    const filamentWeightG    = getVal('c3dFilamentWeight');
    const wastePercent       = getVal('c3dFilamentWaste');
    const effectiveWeight    = filamentWeightG * (1 + wastePercent / 100);
    const costMaterial       = (effectiveWeight / 1000) * filamentPricePerKg;

    // ── Energy ──
    const energyPrice  = getVal('c3dEnergyPrice');
    const printerWatts = getVal('c3dPrinterWatts');
    const printHours   = getVal('c3dPrintHours') + (getVal('c3dPrintMinutes') / 60);
    const costEnergy   = (printerWatts / 1000) * printHours * energyPrice;

    // ── Depreciation ──
    const printerCost     = getVal('c3dPrinterCost');
    const printerLifespan = getVal('c3dPrinterLifespan') || 1;
    const costDepreciation = (printerCost / printerLifespan) * printHours;

    // ── Wear & Maintenance ──
    const nozzleCost = getVal('c3dNozzleCost');
    const nozzleLife = getVal('c3dNozzleLife') || 1;
    const bedCost    = getVal('c3dBedCost');
    const bedLife    = getVal('c3dBedLife') || 1;
    const otherMaint = getVal('c3dOtherMaintenance');
    const costWear   = ((nozzleCost / nozzleLife) + (bedCost / bedLife) + otherMaint) * printHours;

    // ── Labor ──
    const laborRate = getVal('c3dLaborRate');
    const laborMin  = getVal('c3dLaborTime');
    const costLabor = laborRate * (laborMin / 60);

    // ── Subtotal ──
    const subtotal = costMaterial + costEnergy + costDepreciation + costWear + costLabor;

    // ── Failure adjustment ──
    const failRate  = getVal('c3dFailRate');
    const costFail  = subtotal * (failRate / 100);
    const totalCost = subtotal + costFail;

    // ── Profit ──
    const profitMargin = getVal('c3dProfitMargin');
    const profitValue  = totalCost * (profitMargin / 100);
    const finalPrice   = totalCost + profitValue;

    // ── Quantity ──
    const quantity = Math.max(1, Math.floor(getVal('c3dQuantity')));

    // ── Render results ──
    document.getElementById('c3dCostMaterial').textContent     = formatCurrency(costMaterial);
    document.getElementById('c3dCostEnergy').textContent       = formatCurrency(costEnergy);
    document.getElementById('c3dCostDepreciation').textContent = formatCurrency(costDepreciation);
    document.getElementById('c3dCostWear').textContent         = formatCurrency(costWear);
    document.getElementById('c3dCostLabor').textContent        = formatCurrency(costLabor);
    document.getElementById('c3dSubtotal').textContent         = formatCurrency(subtotal);
    document.getElementById('c3dFailRateLabel').textContent    = failRate;
    document.getElementById('c3dCostFail').textContent         = '+ ' + formatCurrency(costFail);
    document.getElementById('c3dTotalCost').textContent        = formatCurrency(totalCost);
    document.getElementById('c3dProfitLabel').textContent      = profitMargin;
    document.getElementById('c3dProfitValue').textContent      = '+ ' + formatCurrency(profitValue);
    document.getElementById('c3dFinalPrice').textContent       = formatCurrency(finalPrice);
    document.getElementById('c3dPricePerUnit').textContent     = quantity > 1 ? `por unidade (${quantity} un.)` : 'por unidade';

    // Batch card
    const batchCard = document.getElementById('c3dBatchCard');
    if (quantity > 1) {
      batchCard.style.display = '';
      document.getElementById('c3dBatchQty').textContent       = `${quantity} un.`;
      document.getElementById('c3dBatchTotal').textContent     = formatCurrency(totalCost * quantity);
      document.getElementById('c3dBatchSaleTotal').textContent = formatCurrency(finalPrice * quantity);
      document.getElementById('c3dBatchProfit').textContent    = formatCurrency(profitValue * quantity);
    } else {
      batchCard.style.display = 'none';
    }

    showToast('Cálculo atualizado com sucesso!', 'success');
  }

  // Submit
  form.addEventListener('submit', e => {
    e.preventDefault();
    calculate();
  });

  // Auto-calculate on any input change
  form.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('input', () => {
      // Debounced auto-calc
      clearTimeout(form._autoCalcTimer);
      form._autoCalcTimer = setTimeout(calculate, 400);
    });
  });

  // Reset
  resetBtn.addEventListener('click', () => {
    Object.entries(defaults).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    });
    calculate();
  });

  // Initial calculation
  calculate();
}

// ── Content Ideas Generator ────────────────────────────────
const ideiasData = {
  tutorial: {
    emoji: '\u{1F4D6}',
    items: [
      "Grave um tutorial mostrando como você calibra o eixo Z para primeira camada perfeita",
      "Crie um passo a passo completo de pós-processamento: lixamento e pintura",
      "Produza um vídeo ensinando como configurar a cama aquecida para ABS sem empenar",
      "Faça uma série de introdução à impressão 3D com resina: do zero ao print",
      "Mostre no Reels como usar suportes eficientes e economizar material",
      "Grave um tutorial de modelagem 3D do SketchUp para a impressora",
      "Crie um comparativo: FDM vs SLA — qual escolher para cada tipo de peça",
      "Produza um vídeo ensinando configurações avançadas de fatiamento no Cura",
      "Faça um tutorial rápido de como imprimir peças encaixáveis sem folga",
      "Grave um guia de manutenção preventiva que você segue na sua impressora",
      "Mostre nos stories o passo a passo de como você prepara o slicer para um print",
      "Crie um vídeo do tipo 'Configurações que uso no Cura e por quê'",
      "Produza um conteúdo ensinando a fazer o primeiro print do zero absoluto",
      "Grave um tutorial mostrando como você resolve entupimento de bico",
      "Faça uma série de 3 vídeos: calibração, fatiamento e impressão"
    ]
  },
  produto: {
    emoji: '\u{1F4E6}',
    items: [
      "Faça um Reels mostrando sua coleção de filamentos e sua opinião sincera sobre cada um",
      "Crie um post no Instagram comparando duas impressoras que você já usou",
      "Produza um vídeo de unboxing honesto do seu último equipamento adquirido",
      "Grave um review após 6 meses de uso da sua impressora principal",
      "Faça um carrossel com os 5 acessórios que mudaram seu setup",
      "Testei 10 marcas de filamento PLA — grave o ranking para seus seguidores",
      "Mostre os upgrades essenciais que você fez na sua impressora",
      "Crie um conteúdo respondendo: vale a pena comprar uma impressora de resina?",
      "Grave um comparativo de softwares de modelagem 3D gratuitos que você testou",
      "Produza um review sincero: estação de cura e lavagem vale o investimento?",
      "Mostre nos stories seu setup completo explicando cada item e por que escolheu",
      "Crie um post mostrando um antes/depois de uma peça com filamento barato vs premium",
      "Grave um vídeo 'O que eu compraria se estivesse começando hoje'",
      "Faça um conteúdo mostrando seu próximo equipamento na wishlist e por quê",
      "Produza um carrossel com os prós e contras de cada tipo de filamento que você usa"
    ]
  },
  dica: {
    emoji: '\u{1F4A1}',
    items: [
      "Crie um post '5 dicas que eu gostaria de ter ouvido quando comecei'",
      "Grave um vídeo rápido mostrando seu truque favorito para evitar que a peça descole",
      "Produza um conteúdo mostrando como você organiza e armazena seus filamentos",
      "Faça um Reels de 'como identificar problemas na impressão só pelo barulho'",
      "Mostre nos stories seu setup completo e explique a função de cada item",
      "Grave um tutorial de como reduzir o consumo de filamento em 30%",
      "Crie um post explicando como identificar umidade no filamento e secá-lo",
      "Produza um vídeo sobre a altura de camada ideal para cada tipo de peça",
      "Faça um conteúdo mostrando como evitar warping em peças grandes de ABS",
      "Grave uma dica de velocidade: imprima 2x mais rápido sem perder qualidade",
      "Crie um post 'meu maior erro como impressor 3D e o que aprendi com ele'",
      "Produza um Reels mostrando seu truque de nivelamento favorito",
      "Grave um vídeo ensinando a escolher o bico certo para cada material",
      "Faça um comparativo rápido: nivelamento automático vs manual",
      "Mostre como você diagnostica problemas olhando apenas para a primeira camada"
    ]
  },
  projeto: {
    emoji: '\u{1F3A8}',
    items: [
      "Registre em timelapse a criação completa de um projeto do início ao fim",
      "Crie um post mostrando o passo a passo de um projeto personalizado para um cliente",
      "Grave um vídeo 'faça você mesmo' de um organizador funcional para o dia a dia",
      "Produza um conteúdo mostrando projetos que resolveu problemas reais da sua casa",
      "Faça um antes e depois de um projeto que você refez para melhorar",
      "Imprima e mostre o processo de criar um suporte para headset personalizado",
      "Grave a criação de um vaso autoirrigável mostrando o sistema de irrigação",
      "Produza um vídeo de como fez uma luminária com filamento translúcido",
      "Crie um conteúdo mostrando a restauração de uma peça antiga com impressão 3D",
      "Mostre o processo de modelar e imprimir peças de reposição para eletrodomésticos",
      "Desafie-se: imprima um projeto complexo e documente todo o processo",
      "Faça um vídeo 'imprimi meu próprio presente de Natal' mostrando a reação",
      "Crie um post colaborativo: peça sugestões de projetos e escolha um para fazer",
      "Grave o processo de criar um presente personalizado para alguém especial",
      "Produza um conteúdo mostrando projetos que geraram mais engajamento no seu perfil"
    ]
  },
  negocio: {
    emoji: '\u{1F4BC}',
    items: [
      "Crie um post mostrando os bastidores de como você calcula o preço das peças",
      "Grave um vídeo sobre sua maior lição financeira empreendendo com 3D",
      "Produza um conteúdo compartilhando seu maior erro como empreendedor 3D",
      "Faça um carrossel 'quanto custa realmente manter sua impressora 3D por mês'",
      "Crie uma série de stories mostrando um dia na vida de quem empreende com 3D",
      "Mostre como você precifica suas peças: o cálculo que todo cliente deveria ver",
      "Grave um conteúdo sobre 10 nichos lucrativos para vender impressões 3D",
      "Produza um post contando como você montou seu negócio de impressão 3D do zero",
      "Crie um conteúdo discutindo: dropshipping de modelos 3D é viável?",
      "Grave um vídeo respondendo quanto custa manter sua operação de impressão 3D por mês",
      "Mostre nos stories como você atende clientes corporativos com impressão 3D",
      "Crie um post 'o que eu faria diferente se começasse meu negócio 3D hoje'",
      "Produza um conteúdo sobre como criar um clube de assinatura de peças 3D",
      "Grave um vídeo com estratégias de Instagram que funcionaram para seu perfil 3D",
      "Faça um carrossel com os erros financeiros que você vê empreendedores 3D cometendo"
    ]
  }
};

const ideiasAllItems = [];
window.__debug = { ideiasData, ideiasAllItems };
for (const cat in ideiasData) {
  ideiasData[cat].items.forEach(item => {
    ideiasAllItems.push({ category: cat, text: item, emoji: ideiasData[cat].emoji });
  });
}

const ideiasCategoryNames = {
  tutorial: 'Tutorial',
  produto: 'Produto',
  dica: 'Dica',
  projeto: 'Projeto',
  negocio: 'Negócio'
};

let ideiasCurrentFilter = 'todas';

function ideiasGetRandom(filter) {
  const pool = filter === 'todas' ? ideiasAllItems : ideiasData[filter].items.map(t => ({
    category: filter, text: t, emoji: ideiasData[filter].emoji
  }));
  return pool[Math.floor(Math.random() * pool.length)];
}

function ideiasDisplay(filter) {
  const idea = ideiasGetRandom(filter);
  document.getElementById('ideiasEmoji').textContent = idea.emoji;
  document.getElementById('ideiasCategoryLabel').textContent = ideiasCategoryNames[idea.category] || idea.category;
  document.getElementById('ideiasText').textContent = idea.text;
  const card = document.getElementById('ideiasCard');
  card.style.opacity = '0';
  card.style.transform = 'translateY(8px)';
  setTimeout(() => {
    card.style.opacity = '1';
    card.style.transform = 'translateY(0)';
  }, 50);
}

function setupIdeias() {
  console.log('[IDEIAS] ideiasData loaded:', Object.keys(ideiasData).length, 'categorias');
  console.log('[IDEIAS] Total items:', ideiasAllItems.length);
  console.log('[IDEIAS] Amostra:', ideiasAllItems.slice(0, 3).map(i => i.text));

  const generateBtn = document.getElementById('ideiasGenerateBtn');
  if (!generateBtn) return;

  generateBtn.addEventListener('click', () => ideiasDisplay(ideiasCurrentFilter));

  document.querySelectorAll('.ideias-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ideias-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ideiasCurrentFilter = btn.dataset.filter;
      ideiasDisplay(ideiasCurrentFilter);
    });
  });

  ideiasDisplay('todas');

  // Sub-tabs
  document.querySelectorAll('.ideias-subtab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ideias-subtab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.ideias-subtab-content').forEach(c => c.classList.remove('active'));
      document.getElementById('ideiasSubtab' + btn.dataset.subtab.charAt(0).toUpperCase() + btn.dataset.subtab.slice(1)).classList.add('active');
    });
  });

  // Viral Scan
  setupViralScan();
}

// ── Orçamentos (Quotes) ─────────────────────────────────────
function setupQuotes() {
  const form = document.getElementById('quotesForm');
  const preview = document.getElementById('quotesPreview');
  if (!form) return;

  // Default values for form fields
  const defaults = {
    // Informações do orçamento
    quoteNumber: '',
    quoteDate: todayISO(),
    validUntil: '',

    // Dados do cliente
    clientName: '',
    clientAddress: '',
    clientCity: '',
    clientState: '',
    clientZip: '',
    clientCnpjCpf: '',
    clientIe: '',
    clientEmail: '',
    clientPhone: '',

    // Dados da empresa (poderia vir de configuração)
    companyName: 'Minha Empresa',
    companyAddress: '',
    companyCity: '',
    companyState: '',
    companyZip: '',
    companyCnpj: '',
    companyIe: '',
    companyEmail: '',
    companyPhone: '',

    // Itens do orçamento (array de objetos)
    quoteItems: [
      { description: '', quantity: 1, unitPrice: 0, discount: 0 }
    ],

    // Configurações de cálculo
    taxRate: 0, // percentual
    additionalDiscount: 0, // percentual ou valor fixo
    additionalDiscountType: 'percent', // percent ou fixed

    // Observações
    notes: '',
    terms: ''
  };

  // Helper function to format date as YYYY-MM-DD
  function todayISO() {
    return new Date().toISOString().split('T')[0];
  }

  // Helper function to format currency
  function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  // Funções auxiliares para manipulação dinâmica de itens
  function addQuoteItem() {
    const itemsContainer = document.getElementById('quoteItemsContainer');
    if (!itemsContainer) return;

    const itemIndex = document.querySelectorAll('.quote-item-row').length;
    const itemHtml = `
      <div class="quote-item-row" data-index="${itemIndex}">
        <div class="form-group">
          <label>Descrição</label>
          <input type="text" class="form-input quote-item-description" placeholder="Descreva o item/serviço">
        </div>
        <div class="form-group">
          <label>Quantidade</label>
          <input type="number" class="form-input quote-item-quantity" min="0" step="0.01" value="1">
        </div>
        <div class="form-group">
          <label>Preço Unitário</label>
          <input type="number" class="form-input quote-item-unit-price" min="0" step="0.01" value="0">
        </div>
        <div class="form-group">
          <label>Desconto (%)</label>
          <input type="number" class="form-input quote-item-discount" min="0" max="100" step="0.01" value="0">
        </div>
        <div class="form-group">
          <label>Subtotal</label>
          <div class="quote-item-subtotal">R$ 0,00</div>
        </div>
        <button type="button" class="btn-remove-item" title="Remover item">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M1 5h16M7 1l5 5M7 7l5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    `;
    itemsContainer.insertAdjacentHTML('beforeend', itemHtml);

    // Add event listeners to new inputs
    const newItem = itemsContainer.lastElementChild;
    newItem.querySelectorAll('.quote-item-description, .quote-item-quantity, .quote-item-unit-price, .quote-item-discount').forEach(input => {
      input.addEventListener('input', updateItemsDisplay);
    });
    newItem.querySelector('.btn-remove-item').addEventListener('click', function() {
      removeQuoteItem(this.closest('.quote-item-row').dataset.index);
    });
  }

  function removeQuoteItem(index) {
    const itemsContainer = document.getElementById('quoteItemsContainer');
    if (!itemsContainer) return;

    const itemToRemove = itemsContainer.querySelector(`.quote-item-row[data-index="${index}"]`);
    if (itemToRemove) {
      itemToRemove.remove();

      // Re-index remaining items
      itemsContainer.querySelectorAll('.quote-item-row').forEach((item, newIndex) => {
        item.dataset.index = newIndex;
      });
    }

    updateItemsDisplay();
  }

  function updateItemsDisplay() {
    const itemsContainer = document.getElementById('quoteItemsContainer');
    if (!itemsContainer) return;

    const items = [];
    itemsContainer.querySelectorAll('.quote-item-row').forEach((item, index) => {
      const description = item.querySelector('.quote-item-description').value;
      const quantity = parseFloat(item.querySelector('.quote-item-quantity').value) || 0;
      const unitPrice = parseFloat(item.querySelector('.quote-item-unit-price').value) || 0;
      const discount = parseFloat(item.querySelector('.quote-item-discount').value) || 0;

      items.push({
        description,
        quantity,
        unitPrice,
        discount
      });
    });

    // Update preview
    generatePreview(items);
  }

  function calculateTotals(items) {
    let subtotal = 0;

    items.forEach(item => {
      const itemTotal = item.quantity * item.unitPrice * (1 - item.discount / 100);
      subtotal += itemTotal;
    });

    const additionalDiscountValue = parseFloat(document.getElementById('additionalDiscount').value) || 0;
    const additionalDiscountType = document.getElementById('additionalDiscountType').value;

    let additionalDiscountAmount = 0;
    if (additionalDiscountType === 'percent') {
      additionalDiscountAmount = subtotal * (additionalDiscountValue / 100);
    } else {
      additionalDiscountAmount = additionalDiscountValue;
    }

    const subtotalAfterDiscount = subtotal - additionalDiscountAmount;
    const taxRate = parseFloat(document.getElementById('taxRate').value) || 0;
    const taxAmount = subtotalAfterDiscount * (taxRate / 100);
    const total = subtotalAfterDiscount + taxAmount;

    return {
      subtotal,
      additionalDiscountAmount,
      subtotalAfterDiscount,
      taxAmount,
      total
    };
  }

  function generatePreview(items) {
    const template = document.getElementById('quotesTemplate');
    if (!template) return;

    const quoteNumber = document.getElementById('quoteNumber').value || 'ORC-0001';
    const quoteDate = document.getElementById('quoteDate').value || todayISO();
    const validUntil = document.getElementById('validUntil').value || '';

    const clientName = document.getElementById('clientName').value || '';
    const clientAddress = document.getElementById('clientAddress').value || '';
    const clientCity = document.getElementById('clientCity').value || '';
    const clientState = document.getElementById('clientState').value || '';
    const clientZip = document.getElementById('clientZip').value || '';
    const clientCnpjCpf = document.getElementById('clientCnpjCpf').value || '';
    const clientIe = document.getElementById('clientIe').value || '';
    const clientEmail = document.getElementById('clientEmail').value || '';
    const clientPhone = document.getElementById('clientPhone').value || '';

    const companyName = document.getElementById('companyName').value || defaults.companyName;
    const companyAddress = document.getElementById('companyAddress').value || '';
    const companyAddress2 = document.getElementById('companyAddress2').value || '';
    const companyCity = document.getElementById('companyCity').value || '';
    const companyState = document.getElementById('companyState').value || '';
    const companyZip = document.getElementById('companyZip').value || '';
    const companyCnpj = document.getElementById('companyCnpj').value || '';
    const companyIe = document.getElementById('companyIe').value || '';
    const companyEmail = document.getElementById('companyEmail').value || '';
    const companyPhone = document.getElementById('companyPhone').value || '';

    const taxRate = parseFloat(document.getElementById('taxRate').value) || 0;
    const additionalDiscountValue = parseFloat(document.getElementById('additionalDiscount').value) || 0;
    const additionalDiscountType = document.getElementById('additionalDiscountType').value;
    const notes = document.getElementById('quoteNotes').value || '';
    const terms = document.getElementById('quoteTerms').value || '';

    const totals = calculateTotals(items);

    function h(str) { return escapeHtml(str); }

    template.innerHTML = `
      <div class="quote-template">
        <div class="quote-header">
          <div class="quote-info">
            <h1>ORÇAMENTO</h1>
            <p><strong>Nº:</strong> ${h(quoteNumber)}</p>
            <p><strong>Data:</strong> ${h(quoteDate)}</p>
            <p><strong>Validade:</strong> ${h(validUntil)}</p>
          </div>

          <div class="company-info">
            <h2>${h(companyName)}</h2>
            ${companyAddress ? `<p>${h(companyAddress)}</p>` : ''}
            ${companyAddress2 ? `<p>${h(companyAddress2)}</p>` : ''}
            ${companyCity && companyState ? `<p>${h(companyCity)}, ${h(companyState)} ${h(companyZip)}</p>` : ''}
            ${companyCnpj ? `<p>CNPJ: ${h(companyCnpj)}</p>` : ''}
            ${companyIe ? `<p>IE: ${h(companyIe)}</p>` : ''}
            ${companyEmail ? `<p>E-mail: ${h(companyEmail)}</p>` : ''}
            ${companyPhone ? `<p>Telefone: ${h(companyPhone)}</p>` : ''}
          </div>
        </div>

        <div class="client-info">
          <h2>Dados do Cliente</h2>
          <p><strong>Nome:</strong> ${h(clientName)}</p>
          ${clientAddress ? `<p><strong>Endereço:</strong> ${h(clientAddress)}</p>` : ''}
          ${clientCity && clientState ? `<p><strong>Cidade/Estado:</strong> ${h(clientCity)}, ${h(clientState)} ${h(clientZip)}</p>` : ''}
          ${clientCnpjCpf ? `<p><strong>CNPJ/CPF:</strong> ${h(clientCnpjCpf)}</p>` : ''}
          ${clientIe ? `<p><strong>IE:</strong> ${h(clientIe)}</p>` : ''}
          <p><strong>E-mail:</strong> ${h(clientEmail)}</p>
          <p><strong>Telefone:</strong> ${h(clientPhone)}</p>
        </div>

        <div class="quote-items-table">
          <table>
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Qtd.</th>
                <th>Unitário</th>
                <th>Desc. (%)</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, index) => `
                <tr>
                  <td>${h(item.description)}</td>
                  <td>${h(String(item.quantity))}</td>
                  <td>${formatCurrency(item.unitPrice)}</td>
                  <td>${h(String(item.discount))}%</td>
                  <td>${formatCurrency(item.quantity * item.unitPrice * (1 - item.discount / 100))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="quote-totals">
          <div class="totals-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(totals.subtotal)}</span>
          </div>
          <div class="totals-row">
            <span>Desconto Adicional:</span>
            <span>- ${formatCurrency(totals.additionalDiscountAmount)}</span>
          </div>
          <div class="totals-row">
            <span>Base de Cálculo:</span>
            <span>${formatCurrency(totals.subtotalAfterDiscount)}</span>
          </div>
          <div class="totals-row">
            <span>Impostos (${h(String(taxRate))}%):</span>
            <span>${formatCurrency(totals.taxAmount)}</span>
          </div>
          <div class="totals-row total-row">
            <span>TOTAL:</span>
            <span>${formatCurrency(totals.total)}</span>
          </div>
        </div>

        ${notes ? `<div class="quote-notes"><h3>Observações:</h3><p>${h(notes)}</p></div>` : ''}
        ${terms ? `<div class="quote-terms"><h3>Termos e Condições:</h3><p>${h(terms)}</p></div>` : ''}
      </div>
    `;
  }

  function generatePdf() {
    const element = document.getElementById('quotesTemplate');
    if (!element) return;

    const quoteNumber = document.getElementById('quoteNumber').value || 'orcamento';
    const filename = `orcamento_${quoteNumber}_${new Date().toISOString().split('T')[0]}.pdf`;

    const opt = {
      margin: [10, 10, 10, 10],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Garantir que os estilos sejam aplicados antes de gerar
    html2pdf().set(opt).from(element).save();
  }

  // Event listeners
  form.addEventListener('submit', e => {
    e.preventDefault();

    // Coleta dados do formulário e atualiza preview
    const itemsContainer = document.getElementById('quoteItemsContainer');
    if (!itemsContainer) return;

    const items = [];
    itemsContainer.querySelectorAll('.quote-item-row').forEach(item => {
      const description = item.querySelector('.quote-item-description').value;
      const quantity = parseFloat(item.querySelector('.quote-item-quantity').value) || 0;
      const unitPrice = parseFloat(item.querySelector('.quote-item-unit-price').value) || 0;
      const discount = parseFloat(item.querySelector('.quote-item-discount').value) || 0;

      items.push({
        description,
        quantity,
        unitPrice,
        discount
      });
    });

    updateItemsDisplay();
    generatePreview(items);
  });

  // Add item button
  const addItemBtn = document.getElementById('addItemBtn');
  if (addItemBtn) {
    addItemBtn.addEventListener('click', addQuoteItem);
  }

  // Reset button
  const resetBtn = document.getElementById('quotesResetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      form.reset();
      // Reset items container to have one empty item
      const itemsContainer = document.getElementById('quoteItemsContainer');
      if (itemsContainer) {
        itemsContainer.innerHTML = '';
        addQuoteItem(); // Add one empty item
      }
      generatePreview([]);
    });
  }

  // PDF button
  const pdfBtn = document.getElementById('quotesGeneratePdfBtn');
  if (pdfBtn) {
    pdfBtn.addEventListener('click', generatePdf);
  }

  // Real-time updates for calculation fields
  const calcFields = form.querySelectorAll('#taxRate, #additionalDiscount, #additionalDiscountType');
  calcFields.forEach(field => {
    field.addEventListener('input', () => {
      const itemsContainer = document.getElementById('quoteItemsContainer');
      if (itemsContainer) {
        const items = [];
        itemsContainer.querySelectorAll('.quote-item-row').forEach(item => {
          const description = item.querySelector('.quote-item-description').value;
          const quantity = parseFloat(item.querySelector('.quote-item-quantity').value) || 0;
          const unitPrice = parseFloat(item.querySelector('.quote-item-unit-price').value) || 0;
          const discount = parseFloat(item.querySelector('.quote-item-discount').value) || 0;

          items.push({
            description,
            quantity,
            unitPrice,
            discount
          });
        });
        generatePreview(items);
      }
    });
  });

  // Inicialização
  Object.entries(defaults).forEach(([key, value]) => {
    const el = document.getElementById(`quote${key.charAt(0).toUpperCase() + key.slice(1)}`);
    if (el) {
      if (el.type === 'date' && !value) el.value = todayISO();
      else if (el.type !== 'hidden') el.value = value;
    }
  });

  // Primeira atualização
  addQuoteItem(); // Adiciona um item vazio inicialmente
  updateItemsDisplay();
  generatePreview([]);
}

// ── Viral Scan ─────────────────────────────────────────────
const viralMockData = {
  youtube: [
    { id: 'yt1', title: 'TOP 10 Impressoras 3D para Iniciantes em 2026', creator: '3D Tech Brasil', views: '458K', emoji: '🏆', trending: true, isNew: false,
      roteiro: '📌 Introdução: Apresentar as 10 impressoras. 🔍 Comparar preço, qualidade, facilidade de uso. 💡 Destacar a melhor custo-benefício. 🎯 Conclusão: Recomendar conforme o perfil do usuário.',
      replicar: { equipamentos: 'Impressora 3D (qualquer modelo), câmera ou celular com boa gravação, tripé, as 10 impressoras para mostrar (ou fotos/prints), microfone de lapela.', passos: ['Pesquise e liste 10 impressoras 3D de diferentes faixas de preço', 'Separe imagens/vídeos de cada modelo (prints, especificações técnicas)', 'Grave a introdução explicando o critério da sua seleção', 'Para cada impressora, mostre 3 segundos de vídeo + fale sobre preço, qualidade, facilidade', 'Finalize com o ranking do melhor custo-benefício e peça engajamento'], dicas: 'Grave em um ambiente bem iluminado. Use uma mesa limpa como fundo. Edite com cortes rápidos entre cada modelo (máximo 15s por impressora). Coloque texto na tela com o preço de cada uma.', adaptacao: 'Se não tiver acesso a todas as impressoras, use fotos oficiais com autorização ou foque em apenas 5 modelos que você conhece. Outra ideia: faça "TOP 5 Filamentos" ou "TOP 3 Softwares de Modelagem".', formato: 'Vídeo vertical/capa chamativa com thumbnail de número. Duração ideal: 8-12 minutos. Use timestamps na descrição.' } },
    { id: 'yt2', title: 'Impressão 3D com Resina vs FDM: Qual Escolher?', creator: 'PrintMaster 3D', views: '312K', emoji: '⚖️', trending: false, isNew: false,
      replicar: { equipamentos: '1 impressora FDM e 1 impressora de resina (ou peças prontas de cada), câmera, mesa para mostrar detalhes, lupas ou close das peças.', passos: ['Introdução mostrando uma peça FDM e uma de resina lado a lado', 'Explique como cada tecnologia funciona (animação simples ou desenho)', 'Mostre prós e contras: FDM (mais barato, resistente, menos detalhes) vs Resina (mais caro, frágil, altíssimo detalhe)', 'Mostre exemplos de uso: peça mecânica no FDM, miniatura na resina', 'Conclua com recomendação baseada no perfil do espectador'], dicas: 'Use uma mesa giratória para mostrar as peças. Close nos detalhes faz diferença. Coloque legendas explicativas. Iluminação lateral destaca texturas.', adaptacao: 'Se tiver só uma tecnologia, mostre prints da sua e use imagens de referência da outra. Dá para adaptar falando de marcas diferentes do mesmo tipo.', formato: 'Vídeo com duração de 6-8 minutos. Divisão clara: 2min FDM, 2min Resina, 2min Comparativo, 2min Conclusão.' } },
    { id: 'yt3', title: 'Fiz Suportes que Economizam 50% de Filamento', creator: 'Maker Economico', views: '289K', emoji: '💰', trending: true, isNew: false,
      replicar: { equipamentos: 'Impressora 3D, filamento, fatiador (Cura/PrusaSlicer), peça com suportes complexos para demonstrar, balança de precisão.', passos: ['Mostre uma peça com suportes tradicionais e pese o filamento usado', 'Abra o fatiador e mostre as configurações de suporte padrão', 'Altere para suportes de árvore (tree supports) e mostre a diferença no preview', 'Ajuste ângulo da peça para reduzir área de suporte', 'Imprima e pese o resultado final, comparando o antes e depois'], dicas: 'Use split screen para comparar as configurações lado a lado. Timelapse da impressão ajuda a manter engajamento. Mostre o valor economizado em reais.', adaptacao: 'Se não tiver balança, estime pelo próprio fatiador que já mostra o peso estimado. Funciona para qualquer fatiador (Cura, Simplify3D, PrusaSlicer).', formato: 'Tutorial de 5-7 minutos com foco no passo a passo. Use captura de tela do fatiador + câmera mostrando a impressora.' } },
    { id: 'yt4', title: 'Nunca Compre Filamento Barato - O Teste Final', creator: '3D Lab Brasil', views: '523K', emoji: '🔬', trending: true, isNew: false,
      replicar: { equipamentos: '5+ marcas de filamento da mesma cor (PLA), impressora calibrada, paquímetro, superfície para teste de aderência, peso para teste de resistência.', passos: ['Compre 5 marcas diferentes de filamento branco/cinza (mesma cor evita viés)', 'Imprima o mesmo modelo em cada filamento (mesma configuração)', 'Meça a precisão dimensional com paquímetro (largura, altura das paredes)', 'Teste de aderência: aplique força até descolar', 'Teste de acabamento: fotos macro de cada peça lado a lado', 'Compile resultados em uma planilha e apresente no vídeo'], dicas: 'Use uma planilha na tela para mostrar os resultados. Classificação visual (ouro, prata, bronze). O fator surpresa (marca barata boa) gera engajamento.', adaptacao: 'Com 3 marcas já é suficiente. Se não tiver paquímetro, foque no acabamento visual e teste de resistência manual.', formato: 'Vídeo de 10-15 minutos (formato "investigativo"). Mostre cada teste em tempo real acelerado.' } },
    { id: 'yt5', title: 'Transformei PLA em Peça Industrial com Esse Truque', creator: 'Engenheiro 3D', views: '198K', emoji: '🔧', trending: false, isNew: false,
      replicar: { equipamentos: 'Peça impressa em PLA, lixa (120, 220, 400, 600, 1000), primer automotivo, tinta spray, resina epóxi (opcional), pano microfibra, EPIs (luvas, máscara).', passos: ['Mostre a peça recém-impressa com as camadas visíveis (antes)', 'Comece lixamento: 120 (grosso) → 220 → 400 → 600 → 1000 (fino)', 'Aplique primer automotivo em camadas finas (2-3 demãos)', 'Lixe novamente com 600 entre as demãos', 'Pinte com tinta spray ou aerógrafo (cores metálicas dão acabamento premium)', 'Opicional: finalize com resina epóxi para brilho de alto brilho', 'Mostre antes e depois lado a lado'], dicas: 'Grave macro do processo de lixamento. Use música instrumental de fundo. Mostre o toque final na peça acabada.', adaptacao: 'Sem aerógrafo? Tinta spray comum funciona. Sem resina? O primer + tinta já dão um resultado 10x melhor que o PLA puro.', formato: 'Vídeo tutorial de 8-10 minutos. Timelapse do lixamento acelera sem perder a informação.' } },
    { id: 'yt6', title: 'Montei um Negócio de Impressão 3D com R$500', creator: 'Empreenda 3D', views: '372K', emoji: '🚀', trending: true, isNew: false,
      replicar: { equipamentos: 'Impressora 3D de entrada (ex: Ender 3), 1 rolo de filamento PLA, câmera ou celular, planilha de custos.', passos: ['Mostre sua impressora e diga quanto pagou nela', 'Liste tudo que comprou com orçamento de R$500', 'Mostre as primeiras peças que vendeu e o lucro', 'Abra uma planilha mostrando receita vs despesas do mês', 'Dê dicas para quem quer começar com pouco'], dicas: 'Histórias de superação financeira geram muito engajamento. Seja transparente com os números. Mostre que é possível sem grandes investimentos.', adaptacao: 'Adapte para o valor que você realmente gastou. O importante é mostrar que é acessível começar.', formato: 'Vídeo de 10-12 minutos com divisão clara: quanto gastei, quanto ganhei, lições aprendidas.' } },
    { id: 'yt7', title: 'Os 5 Modelos 3D Grátis que Mais Vendi em 2025', creator: '3D Negócios', views: '256K', emoji: '🎯', trending: false, isNew: false,
      replicar: { equipamentos: 'Impressora 3D, filamento variado, acesso ao Thingiverse/Printables/Cults3D, embalagem para envio.', passos: ['Mostre os 5 modelos físicos já impressos', 'Explique onde baixar cada um (links na descrição)', 'Mostre como você customiza (cor, tamanho, acabamento)', 'Revele quanto você vende cada peça e a margem de lucro', 'Dê uma dica extra: qual deles dá mais retorno por hora de impressão'], dicas: 'Números de vendas reais geram credibilidade. Mostre o modelo + o lucro na tela. Desafie o espectador a tentar também.', adaptacao: 'Se você vende modelos diferentes, substitua pelos seus 5 mais vendidos. O formato funciona para qualquer nicho.', formato: 'Vídeo de 8-10 minutos. Mostre cada modelo com tempo igual (1.5-2 min cada).' } },
    { id: 'yt8', title: 'Impressão 3D na Medicina: O Futuro Chegou', creator: 'Saúde 3D', views: '687K', emoji: '🏥', trending: true, isNew: true,
      replicar: { equipamentos: 'Impressora 3D, resina biocompatível (ou filamento), modelos STL de anatomia, câmera.', passos: ['Introdução: mostre o impacto da impressão 3D na medicina', 'Mostre exemplos: próteses, modelos cirúrgicos, guias', 'Explique os materiais biocompatíveis usados', 'Mostre um case real de cirurgia que usou peça 3D', 'Conclua com o potencial futuro da área'], dicas: 'Conteúdo com apelo emocional e científico. Use fontes confiáveis e dados de estudos. Tom sério mas acessível.', adaptacao: 'Se não tiver acesso a modelos médicos, foque em próteses funcionais ou modelos educacionais de anatomia.', formato: 'Vídeo de 10-15 minutos com linguagem acessível. Gráficos e animações ajudam a explicar.' } },
    { id: 'yt9', title: 'Como Faturar R$5K/mês com Impressão 3D', creator: '3D Negócios', views: '892K', emoji: '📈', trending: true, isNew: true,
      replicar: { equipamentos: 'Impressora 3D (2-3 unidades), filamento em rolo, embalagens, planilha de custos.', passos: ['Mostre sua estrutura atual (impressoras, estoque)', 'Abra a planilha de faturamento dos últimos 3 meses', 'Detalhe os 3 produtos que mais vendem', 'Explique como consegue clientes (online e offline)', 'Dê dicas de precificação e margem de lucro'], dicas: 'Números reais geram credibilidade. Mostre extratos ou prints de vendas. Transparência total.', adaptacao: 'Adapte para seu próprio faturamento. Se fatura menos, mostre a projeção de crescimento realista.', formato: 'Vídeo de 12-18 minutos. Divisão: quanto ganha, como ganha, dicas para começar.' } },
    { id: 'yt10', title: 'Guia Completo: Do Zero à Primeira Impressão', creator: '3D para Todos', views: '156K', emoji: '📖', trending: false, isNew: false,
      replicar: { equipamentos: 'Impressora 3D de entrada, filamento PLA, ferramentas básicas (espátula, alicate), cartão SD/USB.', passos: ['Desembale e monte a impressora (timelapse)', 'Faça o nivelamento da mesa passo a passo', 'Carregue o filamento corretamente', 'Faça a primeira impressão (modelo de teste incluso)', 'Mostre o resultado e dê dicas de melhoria'], dicas: 'Conteúdo para iniciantes absolutos. Linguagem simples, sem jargões. Mostre cada detalhe.', adaptacao: 'Use a impressora que você tem. O importante é mostrar o processo completo para um iniciante.', formato: 'Vídeo de 15-20 minutos (tutorial completo). Timestamps obrigatórios na descrição.' } },
    { id: 'yt11', title: 'Fiz Minha Própria Filament Machine por R$200', creator: 'DIY 3D Brasil', views: '423K', emoji: '⚙️', trending: true, isNew: true,
      replicar: { equipamentos: 'Extrusora de filamento caseira (ou componentes: motor, bico, controlador), pellets de PLA, balança.', passos: ['Mostre a máquina de filamento caseira funcionando', 'Explique os componentes e o custo de cada um', 'Produza o filamento a partir dos pellets', 'Teste: imprima uma peça com o filamento caseiro', 'Compare qualidade com filamento comercial'], dicas: 'Conteúdo muito nichado mas com alto engajamento de makers. Mostre o processo completo.', adaptacao: 'Sem máquina? Mostre o projeto conceitual ou adapte para reciclagem de filamento usado.', formato: 'Vídeo de 10-15 minutos com foco educativo no processo de extrusão.' } },
    { id: 'yt12', title: 'Os Erros que Estragam Suas Impressões 3D', creator: 'PrintPerfeito', views: '345K', emoji: '❌', trending: false, isNew: false,
      replicar: { equipamentos: 'Impressora 3D, várias peças com defeitos diferentes (stringing, warping, layer shift), câmera.', passos: ['Mostre uma peça perfeita primeiro (referência)', 'Liste os 5 defeitos mais comuns com exemplos visuais', 'Para cada defeito: explique a causa raiz', 'Mostre a correção passo a passo de cada um', 'Resultado: peça perfeita comparada com as defeituosas'], dicas: 'Formato "antes e depois" funciona muito bem. Close macro nos defeitos. Use setas e textos na tela.', adaptacao: 'Se não tiver peças com defeitos, crie propositalmente para mostrar.', formato: 'Vídeo de 8-12 minutos. Cada defeito: 1-2 minutos com solução clara.' } },
    { id: 'yt13', title: 'Impressão 3D com Metal: É Possível em Casa?', creator: 'Engenharia 3D', views: '534K', emoji: '🔩', trending: true, isNew: true,
      replicar: { equipamentos: 'Impureza de metal (ou filamento metálico), forno de sinterização (ou alternativas), impressora 3D.', passos: ['Introdução: o que é impressão 3D em metal', 'Mostre o filamento com partículas de metal', 'Imprima uma peça de teste', 'Processo de sinterização (ou alternativa caseira)', 'Resultado: peça metálica vs peça comum'], dicas: 'Conteúdo avançado que atrai entusiastas. Mostre as limitações também para ser honesto.', adaptacao: 'Sem acesso a metal? Use filamento com efeito metálico e foque no acabamento que imita metal.', formato: 'Vídeo de 8-12 minutos com demonstrações práticas.' } },
    { id: 'yt14', title: 'Review: Vale a Pena Comprar a Nova Bambu Lab?', creator: 'Tech 3D Reviews', views: '721K', emoji: '🖨️', trending: true, isNew: true,
      replicar: { equipamentos: 'Impressora Bambu Lab (ou similar), filamento, modelos de teste, câmera.', passos: ['Unboxing completo da impressora', 'Mostre os diferenciais: velocidade, qualidade, software', 'Imprima 3 modelos: rápido, detalhado, grande', 'Compare com impressoras populares (Ender, Prusa)', 'Veredito final: para quem é indicada?'], dicas: 'Review honesto: mostrar defeitos dá credibilidade. Comparação com concorrentes ajuda a decisão.', adaptacao: 'Adapte para a impressora que você tem acesso. Review comparativo funciona com qualquer modelo.', formato: 'Vídeo de 10-15 minutos com divisão: unboxing, testes, comparação, veredito.' } },
    { id: 'yt15', title: 'Criei um Negócio de Canecas Personalizadas 3D', creator: 'Empreenda Criativo', views: '267K', emoji: '☕', trending: false, isNew: false,
      replicar: { equipamentos: 'Impressora 3D, filamento (variado), canecas-base, tinta para personalização, embalagens.', passos: ['Mostre o processo: modelagem da personalização', 'Impressão do adorno/texto para a caneca', 'Colagem e acabamento', 'Produto final pronto para vender', 'Mostre os preços praticados e margem de lucro'], dicas: 'Nicho de presentes personalizados tem alta demanda. Mostre como encontrar clientes.', adaptacao: 'Adapte para: chaveiros personalizados, placas decorativas, organizadores, presentes corporativos.', formato: 'Vídeo de 8-10 minutos com foco no processo criativo e comercial.' } },
  ],
  tiktok: [
    { id: 'tt1', title: 'Fazendo lâmpada 3D que parece vidro 🔥', creator: '@print3dbrasil', views: '1.2M', emoji: '💡', trending: true, isNew: false,
      replicar: { equipamentos: 'Filamento translúcido (Natural ou Clear), impressora 3D, lâmpada LED base, lixa fina para acabamento (opcional).', passos: ['Comece com a lâmpada já acesa (visual impactante)', 'Timelapse da impressão do abajur (acelere 10x-20x)', 'Mostre a peça saindo da impressora', 'Encaixe na base de LED e acenda', 'Reação ao resultado final'], dicas: 'Primeiro segundo é decisivo no TikTok - comece com a lâmpada acesa! Use transição rápida (corte seco) entre cenas. Legenda grande na tela.', adaptacao: 'Sem filamento translúcido? Use PLA branco e lixe fino para passar luz. Qualquer base de LED serve.', formato: 'Vídeo de 15-30 segundos. 3s gancho, 10s timelapse, 5s resultado, 2s CTA.' } },
    { id: 'tt2', title: 'Erro de iniciante que danifica a mesa 🔥', creator: '@3dprint.tips', views: '892K', emoji: '⚠️', trending: true, isNew: false,
      replicar: { equipamentos: 'Impressora 3D, filamento, câmera com timelapse, adesivo de fita Kapton ou cola em bastão.', passos: ['Mostre o erro (primeira camada falhando, warping, peça descolando)', 'Explique a causa com texto na tela', 'Mostre a solução: nivelamento correto, temperatura certa, adesão', 'Mostre o resultado correto: impressão perfeita'], dicas: 'Split screen do erro vs acerto funciona muito bem. Use setas e textos na tela para destacar o problema. Tom educativo mas leve.', adaptacao: 'Se não tiver o erro gravado, recrie a cena. O importante é mostrar a solução prática.', formato: '20-40 segundos. Conteúdo de "dica rápida" que resolve um problema específico.' } },
    { id: 'tt3', title: 'Imprimi minha própria escrivaninha 🪑', creator: '@makerbrasil', views: '756K', emoji: '🪑', trending: false, isNew: false,
      replicar: { equipamentos: 'Impressora 3D de grande porte (ou várias peças), filamento (PETG recomendado), parafusos, ferramentas de montagem.', passos: ['Antes: espaço vazio/mesa antiga', 'Mostre as peças sendo impressas (timelapse)', 'Montagem das peças se encaixando', 'Resultado final: mesa montada e em uso'], dicas: 'Transição antes/depois é o gancho principal. Mostre a escala (pessoa usando) para dar noção de tamanho.', adaptacao: 'Não tem impressora grande? Faça um organizador de mesa, suporte de monitor, ou porta-treco.', formato: '25-40 segundos. Projetos maiores funcionam bem como série de vídeos.' } },
    { id: 'tt4', title: 'Isso é impressão 3D ou mágica? 🎩', creator: '@3dworld', views: '2.1M', emoji: '🎩', trending: true, isNew: false,
      replicar: { equipamentos: 'Impressora 3D, filamento, modelo com mecanismo articulado (junta impresso, corrente, figura articulada).', passos: ['Mostre o objeto acabado em movimento (articulado, quebra-cabeça, corrente)', 'Corte para ele sendo impresso em timelapse', 'Close nos detalhes das articulações', 'Texto na tela: "Tudo impresso em uma só peça, sem montagem"', 'Chamada para os seguidores tentarem'], dicas: 'O elemento surpresa é o segredo aqui. Escolha um modelo que pareça impossível de imprimir inteiro. Finalize com "link na bio".', adaptacao: 'Use modelos grátis do Thingiverse/Printables: corrente impressa, cubo mágico articulado, robozinho flexível.', formato: '15-25 segundos. Rápido, surpreendente, compartilhável.' } },
    { id: 'tt5', title: 'PETG vs PLA - Teste de resistência', creator: '@filamento3d', views: '445K', emoji: '💪', trending: false, isNew: false,
      replicar: { equipamentos: '2 peças idênticas (uma PLA, uma PETG), martelo/peso para teste, alicate, câmera em câmera lenta.', passos: ['Mostre as duas peças lado a lado (idênticas visualmente)', 'Teste 1: peso/martelo na peça de PLA (quebra)', 'Teste 2: mesma força na peça de PETG (flexiona mas não quebra)', 'Conclusão com texto na tela: "PLA = bonito, PETG = resistente"'], dicas: 'Câmera lenta no momento da quebra é essencial. Se possível, grave de vários ângulos. Use som impactante no momento da quebra.', adaptacao: 'Compare PLA vs ABS, ou PLA vs PETG vs ABS em 3 vídeos separados.', formato: '20-35 segundos. Testes destrutivos são os que mais engajam no nicho.' } },
    { id: 'tt6', title: 'A melhor cor de filamento para vender 🔥', creator: '@vendas3d', views: '678K', emoji: '🎨', trending: true, isNew: false,
      replicar: { equipamentos: 'Peças impressas em várias cores (branco, preto, cinza, vermelho, azul), mesa limpa, boa iluminação.', passos: ['Mostre 5 peças idênticas em cores diferentes', 'Revele qual cor vendeu mais no seu mês (dado real)', 'Explique por que algumas cores vendem mais', 'Mostre a diferença de acabamento entre cores escuras e claras', 'Pergunte: qual cor você prefere?'], dicas: 'Dados reais de venda geram curiosidade. Mostre os números na tela. Sessão de comentários vai bombar com opiniões divergentes.', adaptacao: 'Se você tem poucas cores, foque nas 3 que você usa. Funciona até com 2 cores contrastantes.', formato: '15-25 segundos. Gancho forte no início. Texto na tela com os números.' } },
    { id: 'tt7', title: 'Nunca jogue fora peça com erro 🔄', creator: '@printsalvador', views: '523K', emoji: '🔄', trending: false, isNew: false,
      replicar: { equipamentos: 'Peça com defeito (warping, falha, camada deslocada), lixa, cola para PLA, primer, tinta, massa plástica.', passos: ['Mostre a peça com defeito (close no problema)', 'Corte para o processo de recuperação: lixe a área afetada', 'Aplique massa plástica se necessário', 'Lixe novamente e aplique primer', 'Pinte por cima', 'Antes e depois lado a lado'], dicas: 'O fator "transformação" é o gancho principal. Mostre o contraste entre peça condenada e peça recuperada. Sustentabilidade gera engajamento.', adaptacao: 'Funciona para qualquer tipo de defeito: warping, stringing, falha de camada, descolamento.', formato: '20-30 segundos. Timelapse dos processos longos. Antes/depois no final.' } },
    { id: 'tt8', title: 'Transformei Garrafa PET em Filamento 3D ♻️', creator: '@eco3dprint', views: '1.8M', emoji: '♻️', trending: true, isNew: true,
      replicar: { equipamentos: 'Garrafa PET, cortador de tiras, extrusora de filamento (ou Filabot), impressora 3D.', passos: ['Mostre a garrafa PET sendo cortada em tiras', 'Alimente a extrusora e veja o filamento saindo', 'Enrole o filamento no carretel', 'Imprima uma peça com o filamento reciclado', 'Compare com filamento virgem'], dicas: 'Sustentabilidade gera muito engajamento. Processo de transformação é hipnotizante.', adaptacao: 'Sem extrusora? Mostre apenas o conceito ou use filamento reciclado comprado.', formato: '25-40 segundos. Processo completo acelerado com música inspiradora.' } },
    { id: 'tt9', title: 'Imprimi um Robô que Anda de Verdade 🤖', creator: '@robot3d', views: '3.4M', emoji: '🤖', trending: true, isNew: true,
      replicar: { equipamentos: 'Impressora 3D, filamento, servomotores (SG90), Arduino, pilhas, parafusos.', passos: ['Mostre o robô completo andando (gancho visual)', 'Explique as peças impressas separadamente', 'Mostre a montagem: encaixe das peças', 'Adicione a eletrônica (motor, Arduino)', 'Robô finalizado andando de novo'], dicas: 'Mostrar o robô funcionando primeiro prende atenção. Conteúdo educativo + impressionante.', adaptacao: 'Sem Arduino? Use peças mecânicas que não precisam de eletrônica: mão articulada, engrenagens.', formato: '30-60 segundos. Timelapse da montagem com resultado final impressionante.' } },
    { id: 'tt10', title: 'Impressão 3D vs Impressora de Papel (Surreal) 😱', creator: '@comparativomaker', views: '956K', emoji: '😱', trending: true, isNew: true,
      replicar: { equipamentos: 'Impressora 3D, impressora de papel comum, filamento, folha sulfite.', passos: ['Mostre a impressora de papel imprimindo um desenho 2D', 'Corte para impressora 3D imprimindo o mesmo objeto 3D', 'Compare os resultados: papel 2D vs objeto 3D', 'Texto na tela: "Uma faz desenhos, a outra faz REALIDADE"', 'Finalize com um close no objeto 3D'], dicas: 'Comparação inusitada gera curiosidade. Elemento surpresa no final.', adaptacao: 'Compare qualquer tecnologia com impressão 3D. Quanto mais inusitado, melhor.', formato: '15-25 segundos. Cortes rápidos com reação.' } },
    { id: 'tt11', title: 'Faça esse organizador de maquiagem em 3D 💄', creator: '@makeup3d', views: '678K', emoji: '💄', trending: false, isNew: false,
      replicar: { equipamentos: 'Impressora 3D, filamento rosa/branco, organizador/base STL, espelho pequeno.', passos: ['Mostre a bagunça de maquiagem (antes)', 'Organizador sendo impresso em timelapse', 'Organize todos os itens nos lugares', 'Resultado final organizado e bonito', 'Close nos detalhes do design'], dicas: 'Público feminino é sub-explorado no nicho 3D. Use cores pastel e design elegante.', adaptacao: 'Adapte para: organizador de pincéis, porta-batom, bandeja de perfumes.', formato: '20-30 segundos. Transição rápida antes/depois com música suave.' } },
    { id: 'tt12', title: 'O segredo para impressões perfeitas 🤫', creator: '@printperfect', views: '1.5M', emoji: '🤫', trending: true, isNew: true,
      replicar: { equipamentos: 'Impressora 3D, filamento de qualidade, lixa, primer, tintas.', passos: ['Mostre uma impressão imperfeita (problema)', 'Texto: "O segredo está nos detalhes"', 'Mostre os cuidados: nivelamento, temperatura, velocidade', 'Mostre o pós-processamento: lixa + primer', 'Resultado final: peça perfeita vs imperfeita lado a lado'], dicas: 'Conteúdo que promete segredo gera cliques. Entregue valor real no final.', adaptacao: 'Adapte para o segredo que você domina: adesão, suportes, calibração, etc.', formato: '30-45 segundos com revelação no final.' } },
    { id: 'tt13', title: 'Nível HARD: Imprimi uma corrente que se mexe ⛓️', creator: '@makerchallenge', views: '2.8M', emoji: '⛓️', trending: true, isNew: false,
      replicar: { equipamentos: 'Impressora 3D bem calibrada, filamento PLS/mat, corrente STL.', passos: ['Mostre a corrente se movendo livremente', 'Corte para ela sendo impressa (uma peça única)', 'Close nos elos - todos soltos sem montagem', 'Texto: "Impresso em uma única peça"', 'Chamada para tentar em casa'], dicas: 'Modelos mecânicos/articulados são os mais compartilhados no TikTok. Desafie o espectador.', adaptacao: 'Outros modelos: cubo mágico, articulações, bonecos flexíveis, engrenagens.', formato: '15-25 segundos. Música energética, cortes rápidos.' } },
    { id: 'tt14', title: 'Quanto custa uma impressão 3D? 💰 (Real)', creator: '@custoreal3d', views: '890K', emoji: '💰', trending: false, isNew: false,
      replicar: { equipamentos: 'Impressora 3D, filamento, medidor de energia, calculadora, peças impressas.', passos: ['Pegue uma peça impressa qualquer', 'Mostre: custo do filamento usado', 'Adicione: energia elétrica (mostre o medidor)', 'Adicione: depreciação da impressora', 'Total final surpreendente (barato)'], dicas: 'Desmistificar que impressão 3D é cara. Mostre contas reais e honestas.', adaptacao: 'Use sua própria conta de luz para calcular o custo real de energia.', formato: '20-35 segundos com texto na tela mostrando os números.' } },
    { id: 'tt15', title: 'Imprimi Móveis para Minha Casa (Miniatura) 🏠', creator: '@miniaturehouse', views: '1.1M', emoji: '🏠', trending: true, isNew: true,
      replicar: { equipamentos: 'Impressora 3D, filamento, base de madeira para cenário, cola.', passos: ['Comece com a casa montada (impactante)', 'Mostre cada móvel sendo impresso', 'Monte o cenário completo: sala, quarto, cozinha', 'Compare com móveis reais (escala)', 'Finalize com tour pela mini-casa'], dicas: 'Projetos em miniatura têm apelo visual forte. Mostre a escala com moedas ou objetos.', adaptacao: 'Faça qualquer ambiente: escritório, loja, consultório. Quanto mais detalhado, melhor.', formato: '30-45 segundos. Tour completo com transições suaves.' } },
  ],
  instagram: [
    { id: 'ig1', title: 'Suporte para headset que viralizou 🎧', creator: '@3dprintart', views: '87K', emoji: '🎧', trending: true, isNew: false,
      replicar: { equipamentos: 'Impressora 3D, filamento (qualquer cor), fita métrica do headset, câmera.', passos: ['Setup bagunçado com headset no chão/mesa', 'Mostre o suporte sendo impresso', 'Instale o suporte na parede/mesa', 'Headset organizado no suporte', 'Close no design minimalista'], dicas: 'Reels com transição rápida. Use música trending. Antes/depois é fórmula que funciona. Texto na tela: "Onde estava isso antes?"', adaptacao: 'Adapte para: suporte de celular, organizador de cabos, porta-controle de videogame.', formato: 'Reel de 10-15 segundos. Carrossel mostrando passo a passo + resultado final.' } },
    { id: 'ig2', title: 'Miniatura de personagem em 8K 🎮', creator: '@miniature3d', views: '134K', emoji: '🎮', trending: false, isNew: false,
      replicar: { equipamentos: 'Impressora de resina, resina padrão, modelo STL, primer, tintas acrílicas, pincéis finos, lupa/luz de aumento.', passos: ['Close extremo nos detalhes da miniatura impressa', 'Mostre a miniatura recém-saída da lavagem/cura (sem pintura)', 'Time-lapse da pintura', 'Resultado final: miniatura pintada em vários ângulos'], dicas: 'Use luz anelar ou luz direcionada para destacar os detalhes. Foco macro do celular já funciona. Mostre a escala (moeda, dedo) para dimensão.', adaptacao: 'Sem impressora de resina? Miniaturas FDM com layer height 0.08mm também impressionam. FOCO no acabamento final.', formato: 'Reel de 15-20 segundos. Carrossel de 5 fotos: antes impresso → primer → pintura → detalhes → final.' } },
    { id: 'ig3', title: 'Organizador de cabos que você precisa', creator: '@printorganizado', views: '62K', emoji: '🔌', trending: false, isNew: false,
      replicar: { equipamentos: 'Impressora 3D, filamento, cabos bagunçados, organizador impresso.', passos: ['Mostre a bagunça de cabos (caos)', 'Corte para os organizadores sendo impressos', 'Instale os organizadores', 'Resultado: cabos organizados e bonitos'], dicas: 'O contraste bagunça/organização é o gancho visual principal. Use "" antes e "" depois.', adaptacao: 'Funciona para qualquer tipo de organizador: gaveta, cozinha, escritório, ferramentas.', formato: 'Reel de 10-12 segundos com transição rápida. Stories para engajar com enquete de cores.' } },
    { id: 'ig4', title: 'Vaso autoirrigável que virou febre 🪴', creator: '@3dgarden', views: '215K', emoji: '🪴', trending: true, isNew: false,
      replicar: { equipamentos: 'Impressora 3D, filamento (PETG para contato com água), planta pequena, substrato, água.', passos: ['Planta murcha/pequena no vaso comum', 'Mostre o vaso autoirrigável impresso', 'Monte: reservatório + substrato + planta', 'Timelapse de 7 dias da planta crescendo', 'Resultado: planta viçosa e saudável'], dicas: 'Timelapse de dias comprimido em 5 segundos é mágico. Mostre a diferença com um vaso comum do lado para comparação.', adaptacao: 'Sem PETG? Use PLA com verniz impermeabilizante. Funciona para suculentas, ervas, flores pequenas.', formato: 'Reel de 15-25 segundos. Carrossel educacional sobre como montar o vaso.' } },
    { id: 'ig5', title: 'Personalizei meu setup gamer 🎮', creator: '@geek3dprint', views: '178K', emoji: '🖥️', trending: true, isNew: false,
      replicar: { equipamentos: 'Impressora 3D, filamento RGB/colorido, suporte de monitor, porta-controle, organizador de cabos, suporte de headset, luzes LED.', passos: ['Setup antes: sem personalidade, cabos visíveis', 'Mostre cada peça sendo impressa (timelapse rápido)', 'Instale cada item: suporte monitor, porta-controle, organizador', 'Ligue as luzes LED', 'Resultado: setup gamer completo e estiloso'], dicas: 'A transformação total é o que viraliza. Música energetic. Corte rápido entre cada etapa. Finalize com um slow motion do setup completo.', adaptacao: 'Pode ser adaptado para setup de escritório, estúdio criativo, ou cantinho de leitura.', formato: 'Reel de 20-30 segundos. Carrossel de "antes e depois" com cada peça destacada.' } },
    { id: 'ig6', title: 'Fiz meu próprio kit de ferramentas organizado 🧰', creator: '@organizacao3d', views: '94K', emoji: '🧰', trending: false, isNew: false,
      replicar: { equipamentos: 'Impressora 3D, filamento, caixa/estojo vazio, ferramentas (alicates, chaves, espátulas), divisórias impressas.', passos: ['Mostre a caixa de ferramentas bagunçada (antes)', 'Coloque as divisórias impressas no lugar', 'Organize cada ferramenta em seu lugar', 'Feche a caixa e mostre o resultado final organizado', 'Compare antes e depois em tela dividida'], dicas: 'O "antes" precisa ser caótico para o "depois" impressionar. Use transição rápida de antes para depois.', adaptacao: 'Adapte para: organizador de gaveta, estojo de canetas, caixa de pescaria, maleta de maquiagem.', formato: 'Reel de 12-18 segundos. Carrossel de 4 imagens com antes/depois + detalhes.' } },
    { id: 'ig7', title: 'Imprimi uma réplica exata do meu cachorro 🐕', creator: '@pet3dprint', views: '312K', emoji: '🐕', trending: true, isNew: false,
      replicar: { equipamentos: 'Fotos do animal de vários ângulos, software de modelagem (Blender), impressora 3D, filamento, tintas acrílicas, pincéis.', passos: ['Mostre a foto do animal real', 'Timelapse da modelagem 3D a partir das fotos', 'Impressão da peça', 'Pintura detalhada (olhos, pelo, nariz)', 'Resultado: animal real vs impresso lado a lado'], dicas: 'Conteúdo emocional gera alto engajamento. Mostre a reação de quem recebe o presente. Animais são um dos nichos mais fortes.', adaptacao: 'Adapte para: réplica de pessoa, objeto de valor sentimental, carro favorito, casa. Use ferramentas gratuitas como o app Qlone para escanear.', formato: 'Reel de 20-30 segundos. Carrossel mostrando cada etapa. Final com o comparativo emocionante.' } },
    { id: 'ig8', title: 'Luminária 3D que Mudou Meu Quarto 🛋️', creator: '@decor3dprint', views: '245K', emoji: '🛋️', trending: true, isNew: true,
      replicar: { equipamentos: 'Impressora 3D, filamento translúcido, fita LED endereçável, fonte 12V, controlador.', passos: ['Mostre o quarto sem a luminária (antes)', 'Impressão da estrutura em timelapse', 'Instalação da fita LED dentro da peça', 'Luminária instalada e funcionando', 'Antes e depois do ambiente'], dicas: 'Transformação de ambiente gera alto engajamento no Instagram. Mostre o antes/ depois.', adaptacao: 'Sem fita LED? Use luz noturna comum atrás da peça. O design da peça já faz diferença.', formato: 'Reel de 15-25 segundos. Carrossel de 4-5 imagens do processo.' } },
    { id: 'ig9', title: 'Faça Você Mesmo: Suporte para Tablet ✨', creator: '@uteis3d', views: '78K', emoji: '✨', trending: false, isNew: false,
      replicar: { equipamentos: 'Impressora 3D, filamento, tablet para testar ajuste, almofada antiderrapante.', passos: ['Mostre o tablet apoiado em livros (antes)', 'Suporte sendo impresso', 'Encaixe o tablet no suporte', 'Teste: estabilidade, ângulos, portabilidade', 'Resultado: suporte funcional e bonito'], dicas: 'Conteúdo útil tem alto salvamento. Mostre que é fácil e barato de fazer.', adaptacao: 'Adapte para: suporte de celular, suporte de livro, base para notebook.', formato: 'Reel de 12-18 segundos. Carrossel mostrando funcionalidades.' } },
    { id: 'ig10', title: 'Transformei Sucata em Obra de Arte 3D 🎨', creator: '@artreciclada3d', views: '167K', emoji: '🎨', trending: true, isNew: true,
      replicar: { equipamentos: 'Sucata eletrônica (placas, fios), impressora 3D, filamento, cola quente, tinta spray.', passos: ['Mostre a sucata separada (bagunçada)', 'Imprima a base/modelo', 'Monte os componentes na base', 'Pinte o conjunto', 'Resultado: arte sustentável pronta'], dicas: 'Arte com propósito sustentável gera muito engajamento. Mostre o "antes" chocante.', adaptacao: 'Use sucata de computador, celular, brinquedos. O contraste lixo/arte é o que viraliza.', formato: 'Reel de 20-30 segundos. Carrossel de 5-6 imagens do processo.' } },
    { id: 'ig11', title: 'Impressão 3D na Cozinha: Utensílios Úteis 🍳', creator: '@cozinha3d', views: '93K', emoji: '🍳', trending: false, isNew: false,
      replicar: { equipamentos: 'Impressora 3D, filamento (PETG ou PLA+ para alimentos), modelos STL de utensílios.', passos: ['Mostre a cozinha bagunçada', 'Imprima: porta-ovo, suporte de tempero, organizador de talheres', 'Coloque cada utensílio em uso', 'Mostre a praticidade: economizou espaço', 'Dica: use materiais seguros para alimentos'], dicas: 'Nicho utilidades domésticas é pouco explorado. Mostre soluções para problemas reais.', adaptacao: 'Foque nos utensílios que você mais usa na cozinha. Funciona como série.', formato: 'Reel de 15-20 segundos. Carrossel mostrando cada utensílio.' } },
    { id: 'ig12', title: 'Brinquedo Educativo 3D para Crianças 🧸', creator: '@educa3dprint', views: '156K', emoji: '🧸', trending: false, isNew: true,
      replicar: { equipamentos: 'Impressora 3D, filamento (PLA seguro), modelos educativos (quebra-cabeça, blocos), tintas naturais.', passos: ['Mostre a criança brincando com o brinquedo', 'Mostre as peças sendo impressas', 'Explique o benefício educativo', 'Mostre a criança interagindo e aprendendo', 'Chamada: faça o brinquedo do seu filho'], dicas: 'Conteúdo infantil tem alto engajamento de pais. Segurança é prioridade.', adaptacao: 'Adapte para quebra-cabeças, blocos de montar, jogos educativos, fantoches.', formato: 'Reel de 15-25 segundos. Foco na criança brincando e aprendendo.' } },
    { id: 'ig13', title: 'Faça seus Próprios Presentes 3D 🎁', creator: '@presentes3d', views: '203K', emoji: '🎁', trending: true, isNew: true,
      replicar: { equipamentos: 'Impressora 3D, filamento colorido, caixas de presente, laços, embalagem.', passos: ['Mostre uma caixa de presente comum', 'Abra e mostre o presente 3D personalizado', 'Mostre 3 ideias de presentes 3D rápidos', 'Impressão em timelapse de um deles', 'Resultado: presente único e emocionante'], dicas: 'Presentes personalizados têm alto valor emocional. Mostre a reação de quem recebe.', adaptacao: 'Ideias: chaveiro personalizado, porta-retrato 3D, caneca com nome, mini-escultura.', formato: 'Reel de 20-30 segundos. Carrossel com ideias de presentes.' } },
    { id: 'ig14', title: 'Hack Inteligente para sua Impressora 3D 🧠', creator: '@hack3dprint', views: '112K', emoji: '🧠', trending: false, isNew: false,
      replicar: { equipamentos: 'Impressora 3D, componentes do hack (sensor, suporte, adaptador), ferramentas.', passos: ['Mostre o problema: falha comum na impressora', 'Apresente a solução: o hack', 'Instale o hack passo a passo', 'Mostre funcionando: antes vs depois', 'Resultado: impressão perfeita sem falhas'], dicas: 'Hacks e gambiarras inteligentes geram muito engajamento. Mostre que é fácil de fazer.', adaptacao: 'Adapte para seu próprio hack: sensor de filamento, nivelamento automático, suporte de rolo.', formato: 'Reel de 15-25 segundos. Carrossel com passo a passo da instalação.' } },
    { id: 'ig15', title: 'Meu Setup de Impressão 3D Completo 🖨️', creator: '@setup3dprint', views: '289K', emoji: '🖨️', trending: true, isNew: false,
      replicar: { equipamentos: 'Impressora(s) 3D, estação de trabalho, organização de filamentos, ferramentas, câmera.', passos: ['Visão geral do setup completo', 'Mostre cada impressora e para que usa', 'Organização dos filamentos (cores, tipos)', 'Estação de pós-processamento (lixas, tintas)', 'Dicas de organização do espaço'], dicas: 'Tour de setup é um dos formatos mais vistos. Mostre soluções criativas de organização.', adaptacao: 'Qualquer setup é válido. O importante é mostrar como você organiza seu espaço.', formato: 'Reel de 20-35 segundos. Carrossel de 5-8 fotos detalhando cada área.' } },
  ],
  facebook: [
    { id: 'fb1', title: 'Grupo de Impressão 3D atinge 100K membros', creator: 'Impressão 3D Brasil', views: '45K', emoji: '🎉', trending: false, isNew: false,
      replicar: { equipamentos: 'Imagens dos melhores trabalhos do grupo, print da tela com 100K membros, design gráfico simples (Canva).', passos: ['Crie uma arte comemorativa com o número 100K', 'Selecione 5-10 melhores trabalhos postados no grupo', 'Escreva um texto agradecendo a comunidade', 'Destaque os trabalhos selecionados (um por parágrafo)', 'Anuncie novidades: sorteio, desafio, evento ao vivo'], dicas: 'Posts de marco (100K, 200K) geram muito engajamento. Marque os autores dos trabalhos destacados. Inclua uma enquete para o próximo marco.', adaptacao: 'Não tem grupo grande? Faça um post similar no seu perfil pessoal destacando "melhores momentos do mês" ou "top 5 impressões da semana".', formato: 'Post com carrossel de 5-8 imagens. Texto de 200-300 caracteres. Pode fazer também um vídeo ao vivo agradecendo.' } },
    { id: 'fb2', title: 'Peça rara de reposição que salvei com 3D', creator: 'Oficina Maker', views: '38K', emoji: '🔩', trending: true, isNew: false,
      replicar: { equipamentos: 'Peça quebrada original, paquímetro, software de modelagem (Fusion 360/TinkerCAD/Blender), impressora 3D, filamento.', passos: ['Mostre a peça original quebrada e explique o problema', 'Meça a peça com paquímetro e mostre as dimensões', 'Modele a peça no software (acelere o processo)', 'Imprima a peça modelo', 'Teste: instale a nova peça e mostre funcionando'], dicas: 'Histórias de "conserto" geram muito engajamento. Mostre que o custo foi menor que comprar peça nova. Inclua o link do modelo 3D.', adaptacao: 'Qualquer peça quebrada serve: engrenagem de máquina de lavar, suporte de geladeira, tampa de eletrodoméstico.', formato: 'Post com 4-6 imagens (problema → medição → modelagem → impressão → solução). Vídeo de 2-3 minutos com o processo completo.' } },
    { id: 'fb3', title: 'Discussão: vale a pena importar filamento?', creator: '3D Commerce BR', views: '52K', emoji: '💬', trending: false, isNew: false,
      replicar: { equipamentos: 'Planilha de preços (nacional vs importado com impostos), print de sites, calculadora.', passos: ['Pesquise preços de 5 filamentos nacionais e 5 importados', 'Crie uma planilha comparativa com impostos inclusos', 'Faça o post com uma pergunta provocativa no título', 'Apresente os dados de forma clara (carrossel de imagens)', 'Finalize com enquete: "Você prefere nacional ou importado?"'], dicas: 'Posts de discussão geram 3x mais comentários. Seja neutro e apresente dados reais. Responda aos comentários para aumentar engajamento.', adaptacao: 'Adapte para: "Vale a pena montar uma impressora ou comprar pronta?" ou "PLA nacional vs importado? ".', formato: 'Carrossel de 5 imagens com dados. Texto de 300-400 caracteres com pergunta no final.' } },
    { id: 'fb4', title: 'Transformei sucata eletrônica em arte 3D', creator: 'Arte Sustentável 3D', views: '29K', emoji: '♻️', trending: false, isNew: false,
      replicar: { equipamentos: 'Sucata eletrônica (placas-mãe, fios, componentes), impressora 3D, filamento, cola quente, parafusos, tinta spray.', passos: ['Separe a sucata eletrônica e limpe os componentes', 'Desenhe/baixe uma base/modelo para integrar a sucata', 'Imprima a base em 3D', 'Monte: fixe os componentes eletrônicos na base', 'Pinte ou finalize com verniz', 'Mostre o resultado final como peça de arte/deco'], dicas: 'O contraste entre "lixo" e "arte" é o grande apelo. Mostre os componentes antes de virar arte. Sustentabilidade é um tema quente.', adaptacao: 'Use sucata de computador, celulares antigos, brinquedos quebrados. Tema muito forte para engajamento orgânico.', formato: 'Post de 5-7 imagens do processo. Vídeo de 2-3 minutos com timelapse da montagem.' } },
    { id: 'fb5', title: 'Review: Nova Impressora XYZ Pro 2026', creator: 'Tech 3D Reviews', views: '67K', emoji: '📦', trending: true, isNew: false,
      replicar: { equipamentos: 'Impressora nova (ou emprestada), caixa original para unboxing, filamento incluso, modelos de teste, câmera.', passos: ['Unboxing: mostre a caixa, os acessórios e o manual', 'Montagem: mostre o setup inicial (se necessário)', 'Primeira impressão: arquivo teste que vem na máquina', 'Testes: imprima 3 modelos diferentes (rápido, detalhado, grande)', 'Compare com sua impressora atual (se tiver)', 'Veredito final com nota e recomendação'], dicas: 'Seja honesto nos prós e contras. Mostre defeitos se houver - isso dá credibilidade. Use uma planilha de comparação.', adaptacao: 'Sem impressora nova para review? Ofereça para fazer review de lojas/filamentos. Ou faça "Review de 1 ano usando a [modelo]".', formato: 'Vídeo de 8-15 minutos (YouTube) ou post de 5-8 imagens + texto (Facebook).' } },
    { id: 'fb6', title: 'A verdade sobre filamento reciclado 🆘', creator: 'Sustentabilidade 3D', views: '43K', emoji: '🌱', trending: false, isNew: false,
      replicar: { equipamentos: 'Filamento reciclado (comprado ou feito), filamento virgem para comparação, impressora 3D, balança de precisão.', passos: ['Contextualize: o quanto de plástico a impressão 3D gera', 'Mostre o filamento reciclado vs virgem (diferença visual)', 'Imprima o mesmo modelo nos dois filamentos', 'Compare: acabamento, resistência, odor durante impressão', 'Conclua: quando usar reciclado e quando evitar'], dicas: 'Sustentabilidade é um tema quente em 2026. Seja honesto: reciclado não é perfeito. Compare dados objetivos.', adaptacao: 'Se não tem acesso a filamento reciclado, fale sobre como reutilizar peças falhadas ou aparas de suporte.', formato: 'Post de 5-7 imagens (comparativo visual). Vídeo complementar de 4-6 minutos mostrando os testes.' } },
    { id: 'fb7', title: 'Como achei meu primeiro cliente sem gastar nada', creator: '3D na Prática', views: '81K', emoji: '🤝', trending: true, isNew: false,
      replicar: { equipamentos: 'Impressora 3D, redes sociais (Instagram, Facebook, OLX, Mercado Livre), fotos dos trabalhos, depoimentos.', passos: ['Conte como você começou sem orçamento de marketing', 'Mostre as plataformas onde divulgou de graça (grupos Facebook, Instagram, OLX)', 'Compartilhe o tipo de post que gerou o primeiro contato', 'Mostre a primeira encomenda e como entregou', 'Dê o resultado final: quantos clientes conquistou e o faturamento'], dicas: 'Histórias reais de superação engajam muito. Seja específico: datas, números, prints. O primeiro cliente sempre tem uma história boa.', adaptacao: 'Adapte para sua própria jornada: substitua os números e plataformas pelos seus reais.', formato: 'Post de 5-6 imagens com texto narrativo. Pode virar um vídeo de 5-8 minutos contando a história completa.' } },
    { id: 'fb8', title: 'Maior Feira de Impressão 3D do Brasil 2026 🎪', creator: 'Eventos 3D Brasil', views: '34K', emoji: '🎪', trending: false, isNew: true,
      replicar: { equipamentos: 'Fotos e vídeos da feira, ingressos, credenciais, celular para gravação.', passos: ['Mostre a entrada do evento', 'Faça um tour pelos estandes principais', 'Mostre as novidades e lançamentos', 'Entreviste expositores (rápido)', 'Conclusão: o que mais impactou'], dicas: 'Cobertura de eventos gera engajamento de quem não pôde ir. Seja rápido e objetivo.', adaptacao: 'Sem evento grande? Cubra meetups locais, encontros de makers, ou visite uma loja de 3D.', formato: 'Post de 6-10 imagens do evento. Vídeo de 2-4 minutos com resumo.' } },
    { id: 'fb9', title: 'Dica Rápida: Nivelamento Perfeito em 1 Minuto', creator: 'Dicas 3D Rápidas', views: '73K', emoji: '⚡', trending: true, isNew: true,
      replicar: { equipamentos: 'Impressora 3D, folha sulfite, chave de nivelamento, câmera.', passos: ['Mostre a mesa desnivelada (problema)', 'Técnica rápida: papel deslizando', 'Ajuste dos parafusos: 30 segundos', 'Teste: impressão de primeira camada', 'Resultado: adesão perfeita'], dicas: 'Dicas rápidas são campeãs de compartilhamento. Vá direto ao ponto, sem enrolação.', adaptacao: 'Adapte para sua impressora. O método do papel funciona em qualquer uma.', formato: 'Post com 3-4 imagens ou vídeo de 30-60 segundos.' } },
    { id: 'fb10', title: 'Mercado de Impressão 3D em 2026: Dados 📊', creator: 'Market 3D Analysis', views: '28K', emoji: '📊', trending: false, isNew: false,
      replicar: { equipamentos: 'Gráficos e dados de mercado, planilhas, prints de relatórios.', passos: ['Apresente o crescimento do mercado 3D', 'Mostre os segmentos que mais crescem', 'Dados de emprego e renda na área', 'Previsões para os próximos anos', 'Oportunidades para quem está começando'], dicas: 'Conteúdo analítico gera autoridade. Use fontes confiáveis e cite as referências.', adaptacao: 'Sem dados globais? Use dados locais do Brasil ou da sua própria experiência.', formato: 'Carrossel de 6-8 imagens com gráficos. Texto explicativo em cada imagem.' } },
    { id: 'fb11', title: 'Curso Grátis: Modelagem 3D para Iniciantes', creator: 'Educação 3D Brasil', views: '56K', emoji: '📚', trending: true, isNew: true,
      replicar: { equipamentos: 'Computador, software gratuito (Blender/TinkerCAD), mouse 3D (opcional).', passos: ['Apresente o software gratuito', 'Mostre a interface básica', 'Crie um objeto simples passo a passo', 'Dica: atalhos essenciais', 'Resultado: primeiro modelo 3D criado'], dicas: 'Conteúdo educativo gratuito gera muitos compartilhamentos. Seja didático e paciente.', adaptacao: 'Use o software que você domina. TinkerCAD é mais fácil para iniciantes absolutos.', formato: 'Vídeo de 5-10 minutos com divisão clara. Post complementar com links dos recursos.' } },
    { id: 'fb12', title: 'Impressão 3D Resolveu Problema em Casa 🏠', creator: 'Soluções 3D', views: '42K', emoji: '🏠', trending: false, isNew: false,
      replicar: { equipamentos: 'Impressora 3D, filamento, objeto quebrado em casa, paquímetro.', passos: ['Mostre o objeto quebrado (ex: suporte de cortina)', 'Mostre a modelagem da peça de reposição', 'Impressão da peça', 'Instalação e teste', 'Resultado: resolvido por centavos'], dicas: 'Histórias de "resolvi em casa" geram identificação. Mostre quanto custaria comprar novo.', adaptacao: 'Qualquer objeto quebrado serve: fechadura, brinquedo, eletrodoméstico, móvel.', formato: 'Post de 4-6 imagens. Vídeo de 1-2 minutos mostrando o problema e solução.' } },
    { id: 'fb13', title: 'Enquete: Qual Impressora Você Recomenda? 🗳️', creator: 'Opinião 3D', views: '67K', emoji: '🗳️', trending: false, isNew: false,
      replicar: { equipamentos: 'Imagens de impressoras populares (Ender, Prusa, Bambu, Creality), enquete do Facebook.', passos: ['Liste 4-5 impressoras populares', 'Mostre uma foto de cada', 'Faça uma pergunta provocativa', 'Inclua uma enquete', 'Participe dos comentários'], dicas: 'Enquetes geram o maior engajamento no Facebook. Responda todos os comentários.', adaptacao: 'Pergunte sobre filamentos, softwares, ou acessórios. Qualquer tópico com opiniões divergentes.', formato: 'Post com carrossel de fotos. Enquete nativa do Facebook.' } },
    { id: 'fb14', title: 'Case: Cliente Pagou R$300 por Peça de R$5', creator: 'Negócios 3D', views: '95K', emoji: '💼', trending: true, isNew: true,
      replicar: { equipamentos: 'Impressora 3D, a peça vendida, embalagem, nota fiscal.', passos: ['Mostre a peça que vendeu (simples e barata de fazer)', 'Revele o custo de produção (R$5)', 'Mostre o valor cobrado (R$300)', 'Explique: design, personalização, valor agregado', 'Conclusão: margem de lucro + dicas'], dicas: 'Histórias de lucro geram alto engajamento. Seja transparente com os números.', adaptacao: 'Adapte com sua própria história de venda. Quanto maior a margem, mais engajamento.', formato: 'Post de 4-5 imagens com texto narrativo. Vídeo de 3-5 minutos contando a história.' } },
    { id: 'fb15', title: 'Guia: Como Começar na Impressão 3D em 2026', creator: 'Guia 3D Completo', views: '112K', emoji: '🗺️', trending: true, isNew: true,
      replicar: { equipamentos: 'Impressora 3D recomendada, filamento inicial, ferramentas básicas, links úteis.', passos: ['Passo 1: Escolha sua primeira impressora (orçamento)', 'Passo 2: Primeiro filamento (PLA recomendado)', 'Passo 3: Softwares gratuitos essenciais', 'Passo 4: Primeira impressão passo a passo', 'Passo 5: Onde encontrar modelos grátis', 'Passo 6: Primeira venda (se quiser ganhar dinheiro)'], dicas: 'Guias completos são salvos e compartilhados. Seja o mais completo possível.', adaptacao: 'Adapte para seu nível: iniciante, intermediário, avançado. Pode fazer uma série de 3 posts.', formato: 'Carrossel de 8-10 imagens. Post salvo como referência permanente.' } },
  ]
};

const viralScriptTemplates = {
  youtube: {
    intro: ['Comece com um gancho forte nos primeiros 5 segundos.', 'Use uma pergunta ou afirmação impactante.', 'Mostre o resultado final primeiro.'],
    body: ['Divida o conteúdo em tópicos claros com timestamps.', 'Use legendas e gráficos na tela.', 'Mostre exemplos práticos e comparações.'],
    cta: ['Peça inscrição e like.', 'Pergunte o que acham nos comentários.', 'Sugira o próximo vídeo.'],
  },
  tiktok: {
    intro: ['Prenda a atenção no primeiro segundo.', 'Comece com um visual impactante.', 'Use texto grande na tela.'],
    body: ['Mantenha ritmo acelerado.', 'Transições rápidas entre cenas.', 'Informação direta e objetiva.'],
    cta: ['Peça para seguir.', 'Pergunta para engajar comentários.', 'Desafie o espectador a tentar.'],
  },
  instagram: {
    intro: ['Hook visual nos primeiros 3 segundos.', 'Texto de capa chamativo.', 'Mostrar o "antes" primeiro.'],
    body: ['Reels: ritmo rápido com cortes.', 'Carrossel: informações em tópicos.', 'Use música trending.'],
    cta: ['Salvar para ver depois.', 'Compartilhar com quem precisa ver.', 'Comentar o que achou.'],
  },
  facebook: {
    intro: ['Título que gera curiosidade.', 'Imagem principal de alta qualidade.', 'Primeira frase do post com gancho.'],
    body: ['Conteúdo informativo e denso.', 'Quebre em parágrafos curtos.', 'Inclua perguntas para engajar.'],
    cta: ['Compartilhe sua experiência.', 'Marque alguém que precisa ver.', 'Participe da enquete.'],
  }
};

function viralGenerateRoteiro(title, creator, platform, platformData) {
  const template = viralScriptTemplates[platform];
  const platformName = { youtube: 'YouTube', tiktok: 'TikTok', instagram: 'Instagram', facebook: 'Facebook' }[platform];
  const r = platformData.replicar;

  const introTip = template.intro[Math.floor(Math.random() * template.intro.length)];
  const bodyTip = template.body[Math.floor(Math.random() * template.body.length)];
  const ctaTip = template.cta[Math.floor(Math.random() * template.cta.length)];

  return [
    `📋 ROTEIRO COMPLETO - ${platformName}`,
    `📌 Título: ${title}`,
    `👤 Criador de referência: ${creator}`,
    `👁️ Visualizações: ${platformData.views}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `  🎬 INTRODUÇÃO`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `💡 Dica: ${introTip}`,
    ``,
    `📝 Sugestão de abertura:`,
    `"Fala pessoal! Hoje vou mostrar algo que está bombando no ${platformName} sobre Impressão 3D: ${title}. Se você é apaixonado por 3D, esse conteúdo é para você!"`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `  📖 DESENVOLVIMENTO`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `💡 Dica: ${bodyTip}`,
    ``,
    `📝 Pontos principais para abordar:`,
    `${platformData.roteiro.split('. ').map((p, i) => `  ${i + 1}. ${p.trim()}`).join('\n')}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `  🎯 FINALIZAÇÃO`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `💡 Dica: ${ctaTip}`,
    ``,
    `📝 Sugestão de encerramento:`,
    `"E aí, curtiu? Já salva esse vídeo para não perder a dica! Me conta nos comentários: o que você mais gostou? Não esquece de seguir para mais conteúdo sobre Impressão 3D!"`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `  🏷️ HASHTAGS SUGERIDAS`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `#Impressao3D #3DPrint #Maker #Criatividade #Tecnologia #Inovacao #DIY #Impressora3D #Print3D #ConteudoDigital`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `  📋 COMO REPLICAR ESTE VÍDEO`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `🛠️ MATERIAIS / EQUIPAMENTOS NECESSÁRIOS:`,
    `  ${r.equipamentos}`,
    ``,
    `📝 PASSO A PASSO PARA CRIAR O SEU:`,
    r.passos.map((p, i) => `  ${i + 1}. ${p}`).join('\n'),
    ``,
    `🎥 DICAS DE GRAVAÇÃO E EDIÇÃO:`,
    `  ${r.dicas}`,
    ``,
    `💡 COMO ADAPTAR PARA SUA REALIDADE:`,
    `  ${r.adaptacao}`,
    ``,
    `📊 FORMATO IDEAL:`,
    `  ${r.formato}`,
    ``,
    `═══════════════════════════════════════════`,
    `  📱 COMPARTILHE ESTE ROTEIRO`,
    `═══════════════════════════════════════════`,
    `  Use este roteiro como base e adapte para seu estilo!`,
    `  Boa sorte com seu conteúdo! 🚀`,
  ].join('\n');
}

function setupViralScan() {
  const resultsList = document.getElementById('viralResultsList');
  const statusEl = document.getElementById('viralScanStatus');
  const searchInput = document.getElementById('viralSearchInput');
  const searchCount = document.getElementById('viralSearchCount');
  const refreshBtn = document.getElementById('viralRefreshBtn');
  const noResults = document.getElementById('viralNoResults');
  const noResultsTerm = document.getElementById('viralNoResultsTerm');
  const roteiroSection = document.getElementById('viralRoteiroSection');
  const roteiroContent = document.getElementById('viralRoteiroContent');
  const copyBtn = document.getElementById('viralCopyRoteiro');

  let selectedItem = null;
  let currentPlatform = 'youtube';
  let searchTerm = '';
  let allData = [];
  let filteredData = [];
  let discoverInterval = null;

  function platformName(p) {
    return { youtube: 'YouTube', tiktok: 'TikTok', instagram: 'Instagram', facebook: 'Facebook' }[p];
  }

  function renderItems(data) {
    filteredData = data;

    if (data.length === 0) {
      resultsList.innerHTML = '';
      noResults.style.display = 'block';
      noResultsTerm.textContent = searchTerm;
      searchCount.textContent = '0 resultados';
      return;
    }

    noResults.style.display = 'none';
    searchCount.textContent = `${data.length} resultado${data.length !== 1 ? 's' : ''}`;

    resultsList.innerHTML = data.map(v => {
      const badges = [];
      if (v.trending) badges.push('<span class="viral-trend-badge trend">📈 Tendência</span>');
      if (v.isNew) badges.push('<span class="viral-trend-badge new">🔥 Novo</span>');

      return `
        <div class="viral-result-item" data-id="${v.id}" data-platform="${currentPlatform}">
          <div class="viral-result-thumb">${v.emoji}</div>
          <div class="viral-result-info">
            <div class="viral-result-title">${v.title}</div>
            <div class="viral-result-meta">${v.creator} · <span class="viral-result-views">👁️ ${v.views} visualizações</span></div>
            <div class="viral-result-badges">
              <span class="viral-result-platform ${currentPlatform}">${platformName(currentPlatform)}</span>
              ${badges.join('')}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Re-attach click events
    resultsList.querySelectorAll('.viral-result-item').forEach(el => {
      el.addEventListener('click', () => {
        resultsList.querySelectorAll('.viral-result-item').forEach(i => i.classList.remove('selected'));
        el.classList.add('selected');

        const id = el.dataset.id;
        const videos = viralMockData[currentPlatform];
        selectedItem = videos.find(v => v.id === id);

        if (selectedItem) {
          const roteiro = viralGenerateRoteiro(
            selectedItem.title,
            selectedItem.creator,
            currentPlatform,
            selectedItem
          );
          roteiroContent.textContent = roteiro;
          roteiroSection.style.display = 'block';
        }
      });
    });
  }

  function filterData(data) {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return data.filter(v => {
      const title = v.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const creator = v.creator.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return title.includes(term) || creator.includes(term);
    });
  }

  function loadPlatform(platform, animate) {
    currentPlatform = platform;
    roteiroSection.style.display = 'none';
    selectedItem = null;

    statusEl.className = 'viral-scan-status loading';
    if (animate) {
      statusEl.innerHTML = '<span class="viral-scan-status-icon">⏳</span><span>Varredura em andamento... analisando vídeos virais...</span>';
    }

    setTimeout(() => {
      allData = viralMockData[platform];
      const filtered = filterData(allData);

      const trendingCount = allData.filter(v => v.trending).length;
      const newCount = allData.filter(v => v.isNew).length;

      statusEl.className = 'viral-scan-status done';
      const platformCap = platformName(platform);
      let badges = '';
      if (trendingCount > 0) badges += ` 📈 ${trendingCount} em tendência`;
      if (newCount > 0) badges += ` 🔥 ${newCount} novos`;
      statusEl.innerHTML = `<span class="viral-scan-status-icon">📡</span><span>${allData.length} vídeos encontrados no ${platformCap}${badges}</span>`;

      renderItems(filtered);
    }, animate ? 600 : 0);
  }

  function handleSearch() {
    searchTerm = searchInput.value;
    const filtered = filterData(allData);
    renderItems(filtered);
  }

  function startPeriodicDiscovery() {
    if (discoverInterval) clearInterval(discoverInterval);
    discoverInterval = setInterval(() => {
      const data = viralMockData[currentPlatform];
      const newItem = data[Math.floor(Math.random() * data.length)];
      if (newItem) {
        showToast(`📡 Novo vídeo detectado: ${newItem.title}`, 'success');
        const filtered = filterData(allData);
        renderItems(filtered);
      }
    }, 45000);
  }

  // Platform switching with auto-scan
  document.querySelectorAll('.viral-platform-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.viral-platform-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (btn.dataset.platform !== currentPlatform) {
        loadPlatform(btn.dataset.platform, true);
      }
    });
  });

  // Real-time search
  searchInput.addEventListener('input', handleSearch);

  // Refresh button
  refreshBtn.addEventListener('click', () => {
    refreshBtn.classList.add('spinning');
    loadPlatform(currentPlatform, true);
    setTimeout(() => refreshBtn.classList.remove('spinning'), 700);
  });

  // Copy button
  copyBtn.addEventListener('click', () => {
    const text = roteiroContent.textContent;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      showToast('✅ Roteiro copiado para a área de transferência!', 'success');
    }).catch(() => {
      showToast('❌ Erro ao copiar', 'error');
    });
  });

  // Auto-load on init
  loadPlatform('youtube', true);
  startPeriodicDiscovery();
}

// ── Mouse Reactive Background ────────────────────────────
function setupMouseGlow() {
  const glow = document.getElementById('bgGlow');
  if (!glow) return;

  let rafId = null;
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let currentX = mouseX;
  let currentY = mouseY;

  function updateGlow() {
    currentX += (mouseX - currentX) * 0.08;
    currentY += (mouseY - currentY) * 0.08;
    document.documentElement.style.setProperty('--mouse-x', currentX + 'px');
    document.documentElement.style.setProperty('--mouse-y', currentY + 'px');
    rafId = null;
  }

  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!rafId) {
      rafId = requestAnimationFrame(updateGlow);
    }
  });

  document.addEventListener('mouseleave', () => {
    mouseX = window.innerWidth / 2;
    mouseY = window.innerHeight / 2;
  });

  // Adjust glow opacity based on scroll
  let scrollRAF = null;
  window.addEventListener('scroll', () => {
    if (!scrollRAF) {
      scrollRAF = requestAnimationFrame(() => {
        const scrollPercent = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
        const opacity = 0.25 + (scrollPercent * 0.2);
        document.documentElement.style.setProperty('--glow-opacity', Math.min(opacity, 0.6));
        scrollRAF = null;
      });
    }
  });
}

// ── Init ──────────────────────────────────────────────────
async function init() {
  // Verificar autenticação
  const session = await getSession();
  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  // Preencher nome do usuário na sidebar
  const user = session.user;
  const email = user.email || '';
  const initials = email.slice(0, 2).toUpperCase();
  const avatarEl = document.querySelector('.user-avatar');
  const nameEl   = document.querySelector('.user-name');
  if (avatarEl) avatarEl.textContent = initials;
  if (nameEl)   nameEl.textContent   = email;

  // Observar mudanças de sessão (logout em outra aba)
  const client = getSupabaseClient();
  if (client) {
    client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        window.location.href = 'login.html';
      }
    });
  }

  // Botão de logout
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await signOut();
    window.location.href = 'login.html';
  });

  setupTheme();
  setupMouseGlow();
  setupSidebar();
  setupNav();
  setupMainForm();
  setupModal();
  setupFilters();
  setupDateLabels();
  setupResize();
  setup3DCalculator();
  setupIdeias();
  setupQuotes();

  // Carregar transações do Supabase
  await loadTransactions();

  navigateTo('dashboard');
}

document.addEventListener('DOMContentLoaded', () => {
  const overlay   = document.getElementById('modalOverlay');
  const closeBtn  = document.getElementById('closeModalBtn');
  const cancelBtn = document.getElementById('cancelModalBtn');
  const form      = document.getElementById('modalForm');

  function eagerCloseModal() {
    if (!overlay) return;
    overlay.classList.remove('active');
    if (form) {
      form.reset();
      form.querySelectorAll('.form-input').forEach(el => el.classList.remove('error'));
    }
    const incomeBtn  = document.getElementById('modalTypeIncome');
    const expenseBtn = document.getElementById('modalTypeExpense');
    const hiddenType = document.getElementById('modalTxType');
    if (incomeBtn)  incomeBtn.classList.add('active');
    if (expenseBtn) expenseBtn.classList.remove('active');
    if (hiddenType) hiddenType.value = 'income';
  }

  closeBtn?.addEventListener('click', eagerCloseModal);
  cancelBtn?.addEventListener('click', eagerCloseModal);
  overlay?.addEventListener('click', e => { if (e.target === overlay) eagerCloseModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay?.classList.contains('active')) eagerCloseModal();
  });
});

document.addEventListener('DOMContentLoaded', init);
