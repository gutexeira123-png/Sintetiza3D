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
        <div class="tx-desc">${tx.description}</div>
        <div class="tx-meta">${tx.category || 'Sem categoria'} · ${formatDate(tx.date)}</div>
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
        <div style="font-weight:600">${tx.description}</div>
        ${tx.note ? `<div style="font-size:12px;color:var(--color-text-muted)">${tx.note}</div>` : ''}
      </td>
      <td>
        <span style="display:inline-flex;align-items:center;gap:4px">
          ${categoryIcon(tx.category)}&nbsp;${tx.category || '—'}
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
  toast.innerHTML = `<div class="toast-dot"></div><span>${message}</span>`;
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
const sections = ['dashboard', 'transactions', 'add', 'calc3d'];
const pageTitles = { dashboard: 'Painel Financeiro', transactions: 'Transações', add: 'Nova Transação', calc3d: 'Precificação 3D' };

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
  setupSidebar();
  setupNav();
  setupMainForm();
  setupModal();
  setupFilters();
  setupDateLabels();
  setupResize();
  setup3DCalculator();

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
