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
const sections = ['dashboard', 'transactions', 'add', 'calc3d', 'ideias'];
const pageTitles = { dashboard: 'Painel Financeiro', transactions: 'Transações', add: 'Nova Transação', calc3d: 'Precificação 3D', ideias: 'Ideias de Conteúdo' };

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
      "Como configurar a cama aquecida para ABS sem empenar",
      "Guia completo de pós-processamento: lixamento e pintura",
      "Como calibrar o eixo Z para a primeira camada perfeita",
      "Introdução à impressão 3D com resina: do zero ao print",
      "Como usar suportes eficientes e economizar material",
      "Passo a passo: modelo 3D do SketchUp para a impressora",
      "Como escolher entre FDM e SLA para cada tipo de peça",
      "Tutorial de fatiamento: configurações avançadas do Cura",
      "Como imprimir peças encaixáveis sem folga",
      "Guia de manutenção preventiva para sua impressora 3D"
    ]
  },
  produto: {
    emoji: '\u{1F4E6}',
    items: [
      "Top 5 filamentos para peças estruturais em 2025",
      "Review: Vale a pena comprar uma impressora de resina?",
      "Comparativo: PLA vs PETG vs ABS — qual usar em cada caso",
      "Os melhores bicos de impressão para alta precisão",
      "Testei 10 marcas de filamento PLA — veja o ranking",
      "Kit de upgrades essenciais para sua Ender 3",
      "Impressora 3D portátil: dá para levar na mochila?",
      "Vale a pena comprar uma impressora 3D de mesa em 2025?",
      "Comparativo de softwares de modelagem 3D gratuitos",
      "Estação de cura e lavagem: vale o investimento?"
    ]
  },
  dica: {
    emoji: '\u{1F4A1}',
    items: [
      "5 erros de iniciante que entopem o bico da sua impressora",
      "Como reduzir o consumo de filamento em 30%",
      "Truque: use fita Kapton para evitar que a peça descole",
      "Como identificar umidade no filamento e secá-lo",
      "A altura de camada ideal para cada tipo de peça",
      "Como evitar warping em peças grandes de ABS",
      "Dica de velocidade: imprima 2x mais rápido sem perder qualidade",
      "Organize seu setup: estojo impermeável para filamentos",
      "O bico certo para cada material — guia rápido",
      "Nivelamento automático vs manual: qual escolher?"
    ]
  },
  projeto: {
    emoji: '\u{1F3A8}',
    items: [
      "Como fazer um suporte para headset personalizado",
      "Projeto: organizador de cabos para sua mesa de trabalho",
      "Crie seu próprio portal de miniatura para Dungeons & Dragons",
      "Imprimindo peças de reposição para eletrodomésticos",
      "Projeto de vaso autoirrigável para impressão 3D",
      "Como fazer uma luminária com filamento translúcido",
      "Suporte para controle de videogame: projeto funcional",
      "Criação de carimbos personalizados com impressão 3D",
      "Projeto de suporte para celular na bicicleta",
      "Peças decorativas: faça seu próprio relevo de parede"
    ]
  },
  negocio: {
    emoji: '\u{1F4BC}',
    items: [
      "Como precificar suas peças impressas corretamente",
      "10 nichos lucrativos para vender impressões 3D",
      "Como montar um e-commerce de peças 3D do zero",
      "Estratégia de Instagram para crescer no nicho 3D",
      "Quanto custa manter uma impressora 3D por mês?",
      "Como atender clientes corporativos com impressão 3D",
      "Dropshipping de modelos 3D: é viável?",
      "Erros financeiros de quem empreende com impressão 3D",
      "Como criar um clube de assinatura de peças 3D",
      "O guia completo para abrir uma loja de impressão 3D"
    ]
  }
};

const ideiasAllItems = [];
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

// ── Viral Scan ─────────────────────────────────────────────
const viralMockData = {
  youtube: [
    { id: 'yt1', title: 'TOP 10 Impressoras 3D para Iniciantes em 2026', creator: '3D Tech Brasil', views: '458K', emoji: '🏆', roteiro: '📌 Introdução: Apresentar as 10 impressoras. 🔍 Comparar preço, qualidade, facilidade de uso. 💡 Destacar a melhor custo-benefício. 🎯 Conclusão: Recomendar conforme o perfil do usuário.',
      replicar: { equipamentos: 'Impressora 3D (qualquer modelo), câmera ou celular com boa gravação, tripé, as 10 impressoras para mostrar (ou fotos/prints), microfone de lapela.', passos: ['Pesquise e liste 10 impressoras 3D de diferentes faixas de preço', 'Separe imagens/vídeos de cada modelo (prints, especificações técnicas)', 'Grave a introdução explicando o critério da sua seleção', 'Para cada impressora, mostre 3 segundos de vídeo + fale sobre preço, qualidade, facilidade', 'Finalize com o ranking do melhor custo-benefício e peça engajamento'], dicas: 'Grave em um ambiente bem iluminado. Use uma mesa limpa como fundo. Edite com cortes rápidos entre cada modelo (máximo 15s por impressora). Coloque texto na tela com o preço de cada uma.', adaptacao: 'Se não tiver acesso a todas as impressoras, use fotos oficiais com autorização ou foque em apenas 5 modelos que você conhece. Outra ideia: faça "TOP 5 Filamentos" ou "TOP 3 Softwares de Modelagem".', formato: 'Vídeo vertical/capa chamativa com thumbnail de número. Duração ideal: 8-12 minutos. Use timestamps na descrição.' } },
    { id: 'yt2', title: 'Impressão 3D com Resina vs FDM: Qual Escolher?', creator: 'PrintMaster 3D', views: '312K', emoji: '⚖️', roteiro: '📌 Introdução: Explicar as duas tecnologias. 🔍 Prós e contras de cada uma. 💡 Casos de uso ideais. 🎯 Conclusão: Qual escolher conforme necessidade.',
      replicar: { equipamentos: '1 impressora FDM e 1 impressora de resina (ou peças prontas de cada), câmera, mesa para mostrar detalhes, lupas ou close das peças.', passos: ['Introdução mostrando uma peça FDM e uma de resina lado a lado', 'Explique como cada tecnologia funciona (animação simples ou desenho)', 'Mostre prós e contras: FDM (mais barato, resistente, menos detalhes) vs Resina (mais caro, frágil, altíssimo detalhe)', 'Mostre exemplos de uso: peça mecânica no FDM, miniatura na resina', 'Conclua com recomendação baseada no perfil do espectador'], dicas: 'Use uma mesa giratória para mostrar as peças. Close nos detalhes faz diferença. Coloque legendas explicativas. Iluminação lateral destaca texturas.', adaptacao: 'Se tiver só uma tecnologia, mostre prints da sua e use imagens de referência da outra. Dá para adaptar falando de marcas diferentes do mesmo tipo.', formato: 'Vídeo com duração de 6-8 minutos. Divisão clara: 2min FDM, 2min Resina, 2min Comparativo, 2min Conclusão.' } },
    { id: 'yt3', title: 'Fiz Suportes que Economizam 50% de Filamento', creator: 'Maker Economico', views: '289K', emoji: '💰', roteiro: '📌 Introdução: Problema dos suportes tradicionais. 🔍 Técnicas de otimização. 💡 Tutorial passo a passo. 🎯 Economia real demonstrada.',
      replicar: { equipamentos: 'Impressora 3D, filamento, fatiador (Cura/PrusaSlicer), peça com suportes complexos para demonstrar, balança de precisão.', passos: ['Mostre uma peça com suportes tradicionais e pese o filamento usado', 'Abra o fatiador e mostre as configurações de suporte padrão', 'Altere para suportes de árvore (tree supports) e mostre a diferença no preview', 'Ajuste ângulo da peça para reduzir área de suporte', 'Imprima e pese o resultado final, comparando o antes e depois'], dicas: 'Use split screen para comparar as configurações lado a lado. Timelapse da impressão ajuda a manter engajamento. Mostre o valor economizado em reais.', adaptacao: 'Se não tiver balança, estime pelo próprio fatiador que já mostra o peso estimado. Funciona para qualquer fatiador (Cura, Simplify3D, PrusaSlicer).', formato: 'Tutorial de 5-7 minutos com foco no passo a passo. Use captura de tela do fatiador + câmera mostrando a impressora.' } },
    { id: 'yt4', title: 'Nunca Compre Filamento Barato - O Teste Final', creator: '3D Lab Brasil', views: '523K', emoji: '🔬', roteiro: '📌 Introdução: Comparativo de marcas. 🔍 Testes de aderência, resistência, acabamento. 💡 Resultados surpreendentes. 🎯 Recomendação final.',
      replicar: { equipamentos: '5+ marcas de filamento da mesma cor (PLA), impressora calibrada, paquímetro, superfície para teste de aderência, peso para teste de resistência.', passos: ['Compre 5 marcas diferentes de filamento branco/cinza (mesma cor evita viés)', 'Imprima o mesmo modelo em cada filamento (mesma configuração)', 'Meça a precisão dimensional com paquímetro (largura, altura das paredes)', 'Teste de aderência: aplique força até descolar', 'Teste de acabamento: fotos macro de cada peça lado a lado', 'Compile resultados em uma planilha e apresente no vídeo'], dicas: 'Use uma planilha na tela para mostrar os resultados. Classificação visual (ouro, prata, bronze). O fator surpresa (marca barata boa) gera engajamento.', adaptacao: 'Com 3 marcas já é suficiente. Se não tiver paquímetro, foque no acabamento visual e teste de resistência manual.', formato: 'Vídeo de 10-15 minutos (formato "investigativo"). Mostre cada teste em tempo real acelerado.' } },
    { id: 'yt5', title: 'Transformei PLA em Peça Industrial com Esse Truque', creator: 'Engenheiro 3D', views: '198K', emoji: '🔧', roteiro: '📌 Introdução: Limitações do PLA. 🔍 Processo de pós-processamento. 💡 Resultado final impressionante. 🎯 Vale a pena o esforço?',
      replicar: { equipamentos: 'Peça impressa em PLA, lixa (120, 220, 400, 600, 1000), primer automotivo, tinta spray, resina epóxi (opcional), pano microfibra, EPIs (luvas, máscara).', passos: ['Mostre a peça recém-impressa com as camadas visíveis (antes)', 'Comece lixamento: 120 (grosso) → 220 → 400 → 600 → 1000 (fino)', 'Aplique primer automotivo em camadas finas (2-3 demãos)', 'Lixe novamente com 600 entre as demãos', 'Pinte com tinta spray ou aerógrafo (cores metálicas dão acabamento premium)', 'Opicional: finalize com resina epóxi para brilho de alto brilho', 'Mostre antes e depois lado a lado'], dicas: 'Grave macro do processo de lixamento. Use música instrumental de fundo. Mostre o toque final na peça acabada.', adaptacao: 'Sem aerógrafo? Tinta spray comum funciona. Sem resina? O primer + tinta já dão um resultado 10x melhor que o PLA puro.', formato: 'Vídeo tutorial de 8-10 minutos. Timelapse do lixamento acelera sem perder a informação.' } },
  ],
  tiktok: [
    { id: 'tt1', title: 'Fazendo lâmpada 3D que parece vidro 🔥', creator: '@print3dbrasil', views: '1.2M', emoji: '💡', roteiro: '🎬 Abertura impactante com a lâmpada acesa. 🔍 Mostrar o processo em timelapse. 💡 Dica do filamento translúcido. 🎯 Resultado final e reação.',
      replicar: { equipamentos: 'Filamento translúcido (Natural ou Clear), impressora 3D, lâmpada LED base, lixa fina para acabamento (opcional).', passos: ['Comece com a lâmpada já acesa (visual impactante)', 'Timelapse da impressão do abajur (acelere 10x-20x)', 'Mostre a peça saindo da impressora', 'Encaixe na base de LED e acenda', 'Reação ao resultado final'], dicas: 'Primeiro segundo é decisivo no TikTok - comece com a lâmpada acesa! Use transição rápida (corte seco) entre cenas. Legenda grande na tela.', adaptacao: 'Sem filamento translúcido? Use PLA branco e lixe fino para passar luz. Qualquer base de LED serve.', formato: 'Vídeo de 15-30 segundos. 3s gancho, 10s timelapse, 5s resultado, 2s CTA.' } },
    { id: 'tt2', title: 'Erro de iniciante que danifica a mesa 🔥', creator: '@3dprint.tips', views: '892K', emoji: '⚠️', roteiro: '🎬 Mostrar o erro acontecendo. 🔍 Explicar por que acontece. 💡 Como evitar passo a passo. 🎯 Impressão perfeita no final.',
      replicar: { equipamentos: 'Impressora 3D, filamento, câmera com timelapse, adesivo de fita Kapton ou cola em bastão.', passos: ['Mostre o erro (primeira camada falhando, warping, peça descolando)', 'Explique a causa com texto na tela', 'Mostre a solução: nivelamento correto, temperatura certa, adesão', 'Mostre o resultado correto: impressão perfeita'], dicas: 'Split screen do erro vs acerto funciona muito bem. Use setas e textos na tela para destacar o problema. Tom educativo mas leve.', adaptacao: 'Se não tiver o erro gravado, recrie a cena. O importante é mostrar a solução prática.', formato: '20-40 segundos. Conteúdo de "dica rápida" que resolve um problema específico.' } },
    { id: 'tt3', title: 'Imprimi minha própria escrivaninha 🪑', creator: '@makerbrasil', views: '756K', emoji: '🪑', roteiro: '🎬 Antes e depois do projeto. 🔍 Desafios da impressão de móveis. 💡 Dicas de design. 🎯 Tour pelo resultado final.',
      replicar: { equipamentos: 'Impressora 3D de grande porte (ou várias peças), filamento (PETG recomendado), parafusos, ferramentas de montagem.', passos: ['Antes: espaço vazio/mesa antiga', 'Mostre as peças sendo impressas (timelapse)', 'Montagem das peças se encaixando', 'Resultado final: mesa montada e em uso'], dicas: 'Transição antes/depois é o gancho principal. Mostre a escala (pessoa usando) para dar noção de tamanho.', adaptacao: 'Não tem impressora grande? Faça um organizador de mesa, suporte de monitor, ou porta-treco.', formato: '25-40 segundos. Projetos maiores funcionam bem como série de vídeos.' } },
    { id: 'tt4', title: 'Isso é impressão 3D ou mágica? 🎩', creator: '@3dworld', views: '2.1M', emoji: '🎩', roteiro: '🎬 Gancho curioso no início. 🔍 Revelar o truque de impressão. 💡 Explicar tecnologia envolvida. 🎯 Chamada para seguidores tentarem.',
      replicar: { equipamentos: 'Impressora 3D, filamento, modelo com mecanismo articulado (junta impresso, corrente, figura articulada).', passos: ['Mostre o objeto acabado em movimento (articulado, quebra-cabeça, corrente)', 'Corte para ele sendo impresso em timelapse', 'Close nos detalhes das articulações', 'Texto na tela: "Tudo impresso em uma só peça, sem montagem"', 'Chamada para os seguidores tentarem'], dicas: 'O elemento surpresa é o segredo aqui. Escolha um modelo que pareça impossível de imprimir inteiro. Finalize com "link na bio".', adaptacao: 'Use modelos grátis do Thingiverse/Printables: corrente impressa, cubo mágico articulado, robozinho flexível.', formato: '15-25 segundos. Rápido, surpreendente, compartilhável.' } },
    { id: 'tt5', title: 'PETG vs PLA - Teste de resistência', creator: '@filamento3d', views: '445K', emoji: '💪', roteiro: '🎬 Mostrar teste destrutivo. 🔍 Comparar resultados. 💡 Qual usar para cada projeto. 🎯 Encerrar com dica final.',
      replicar: { equipamentos: '2 peças idênticas (uma PLA, uma PETG), martelo/peso para teste, alicate, câmera em câmera lenta.', passos: ['Mostre as duas peças lado a lado (idênticas visualmente)', 'Teste 1: peso/martelo na peça de PLA (quebra)', 'Teste 2: mesma força na peça de PETG (flexiona mas não quebra)', 'Conclusão com texto na tela: "PLA = bonito, PETG = resistente"'], dicas: 'Câmera lenta no momento da quebra é essencial. Se possível, grave de vários ângulos. Use som impactante no momento da quebra.', adaptacao: 'Compare PLA vs ABS, ou PLA vs PETG vs ABS em 3 vídeos separados.', formato: '20-35 segundos. Testes destrutivos são os que mais engajam no nicho.' } },
  ],
  instagram: [
    { id: 'ig1', title: 'Suporte para headset que viralizou 🎧', creator: '@3dprintart', views: '87K', emoji: '🎧', roteiro: '📸 Reel mostrando o suporte em uso. 🔍 Design minimalista e funcional. 💡 Arquivo grátis na bio. 🎯 Engajamento pedindo qual cor preferem.',
      replicar: { equipamentos: 'Impressora 3D, filamento (qualquer cor), fita métrica do headset, câmera.', passos: ['Setup bagunçado com headset no chão/mesa', 'Mostre o suporte sendo impresso', 'Instale o suporte na parede/mesa', 'Headset organizado no suporte', 'Close no design minimalista'], dicas: 'Reels com transição rápida. Use música trending. Antes/depois é fórmula que funciona. Texto na tela: "Onde estava isso antes?"', adaptacao: 'Adapte para: suporte de celular, organizador de cabos, porta-controle de videogame.', formato: 'Reel de 10-15 segundos. Carrossel mostrando passo a passo + resultado final.' } },
    { id: 'ig2', title: 'Miniatura de personagem em 8K 🎮', creator: '@miniature3d', views: '134K', emoji: '🎮', roteiro: '📸 Close nos detalhes do print. 🔍 Explicar configurações de resina. 💡 Antes e depois da pintura. 🎯 Link para comprar o modelo.',
      replicar: { equipamentos: 'Impressora de resina, resina padrão, modelo STL, primer, tintas acrílicas, pincéis finos, lupa/luz de aumento.', passos: ['Close extremo nos detalhes da miniatura impressa', 'Mostre a miniatura recém-saída da lavagem/cura (sem pintura)', 'Time-lapse da pintura', 'Resultado final: miniatura pintada em vários ângulos'], dicas: 'Use luz anelar ou luz direcionada para destacar os detalhes. Foco macro do celular já funciona. Mostre a escala (moeda, dedo) para dimensão.', adaptacao: 'Sem impressora de resina? Miniaturas FDM com layer height 0.08mm também impressionam. FOCO no acabamento final.', formato: 'Reel de 15-20 segundos. Carrossel de 5 fotos: antes impresso → primer → pintura → detalhes → final.' } },
    { id: 'ig3', title: 'Organizador de cabos que você precisa', creator: '@printorganizado', views: '62K', emoji: '🔌', roteiro: '📸 Situação bagunçada vs organizada. 🔍 Mostrar impressão do modelo. 💡 STL grátis nos stories. 🎯 Pergunta: qual cor devo lançar?',
      replicar: { equipamentos: 'Impressora 3D, filamento, cabos bagunçados, organizador impresso.', passos: ['Mostre a bagunça de cabos (caos)', 'Corte para os organizadores sendo impressos', 'Instale os organizadores', 'Resultado: cabos organizados e bonitos'], dicas: 'O contraste bagunça/organização é o gancho visual principal. Use "" antes e "" depois.', adaptacao: 'Funciona para qualquer tipo de organizador: gaveta, cozinha, escritório, ferramentas.', formato: 'Reel de 10-12 segundos com transição rápida. Stories para engajar com enquete de cores.' } },
    { id: 'ig4', title: 'Vaso autoirrigável que virou febre 🪴', creator: '@3dgarden', views: '215K', emoji: '🪴', roteiro: '📸 Transição da planta antes/depois. 🔍 Explicar o sistema de irrigação. 💡 Tutorial rápido de montagem. 🎯 Salvar para ver depois.',
      replicar: { equipamentos: 'Impressora 3D, filamento (PETG para contato com água), planta pequena, substrato, água.', passos: ['Planta murcha/pequena no vaso comum', 'Mostre o vaso autoirrigável impresso', 'Monte: reservatório + substrato + planta', 'Timelapse de 7 dias da planta crescendo', 'Resultado: planta viçosa e saudável'], dicas: 'Timelapse de dias comprimido em 5 segundos é mágico. Mostre a diferença com um vaso comum do lado para comparação.', adaptacao: 'Sem PETG? Use PLA com verniz impermeabilizante. Funciona para suculentas, ervas, flores pequenas.', formato: 'Reel de 15-25 segundos. Carrossel educacional sobre como montar o vaso.' } },
    { id: 'ig5', title: 'Personalizei meu setup gamer 🎮', creator: '@geek3dprint', views: '178K', emoji: '🖥️', roteiro: '📸 Antes do setup sem graça. 🔍 Mostrar as peças impressas. 💡 Como personalizar o seu. 🎯 Resultado final impressionante.',
      replicar: { equipamentos: 'Impressora 3D, filamento RGB/colorido, suporte de monitor, porta-controle, organizador de cabos, suporte de headset, luzes LED.', passos: ['Setup antes: sem personalidade, cabos visíveis', 'Mostre cada peça sendo impressa (timelapse rápido)', 'Instale cada item: suporte monitor, porta-controle, organizador', 'Ligue as luzes LED', 'Resultado: setup gamer completo e estiloso'], dicas: 'A transformação total é o que viraliza. Música energetic. Corte rápido entre cada etapa. Finalize com um slow motion do setup completo.', adaptacao: 'Pode ser adaptado para setup de escritório, estúdio criativo, ou cantinho de leitura.', formato: 'Reel de 20-30 segundos. Carrossel de "antes e depois" com cada peça destacada.' } },
  ],
  facebook: [
    { id: 'fb1', title: 'Grupo de Impressão 3D atinge 100K membros', creator: 'Impressão 3D Brasil', views: '45K', emoji: '🎉', roteiro: '📌 Post agradecendo a comunidade. 🔍 Destaque dos melhores trabalhos. 💡 Novidades do grupo. 🎯 Próximos desafios e sorteios.',
      replicar: { equipamentos: 'Imagens dos melhores trabalhos do grupo, print da tela com 100K membros, design gráfico simples (Canva).', passos: ['Crie uma arte comemorativa com o número 100K', 'Selecione 5-10 melhores trabalhos postados no grupo', 'Escreva um texto agradecendo a comunidade', 'Destaque os trabalhos selecionados (um por parágrafo)', 'Anuncie novidades: sorteio, desafio, evento ao vivo'], dicas: 'Posts de marco (100K, 200K) geram muito engajamento. Marque os autores dos trabalhos destacados. Inclua uma enquete para o próximo marco.', adaptacao: 'Não tem grupo grande? Faça um post similar no seu perfil pessoal destacando "melhores momentos do mês" ou "top 5 impressões da semana".', formato: 'Post com carrossel de 5-8 imagens. Texto de 200-300 caracteres. Pode fazer também um vídeo ao vivo agradecendo.' } },
    { id: 'fb2', title: 'Peça rara de reposição que salvei com 3D', creator: 'Oficina Maker', views: '38K', emoji: '🔩', roteiro: '📌 História do problema. 🔍 Processo de modelagem reversa. 💡 Impressão e teste. 🎯 Peça funcionando perfeitamente.',
      replicar: { equipamentos: 'Peça quebrada original, paquímetro, software de modelagem (Fusion 360/TinkerCAD/Blender), impressora 3D, filamento.', passos: ['Mostre a peça original quebrada e explique o problema', 'Meça a peça com paquímetro e mostre as dimensões', 'Modele a peça no software (acelere o processo)', 'Imprima a peça modelo', 'Teste: instale a nova peça e mostre funcionando'], dicas: 'Histórias de "conserto" geram muito engajamento. Mostre que o custo foi menor que comprar peça nova. Inclua o link do modelo 3D.', adaptacao: 'Qualquer peça quebrada serve: engrenagem de máquina de lavar, suporte de geladeira, tampa de eletrodoméstico.', formato: 'Post com 4-6 imagens (problema → medição → modelagem → impressão → solução). Vídeo de 2-3 minutos com o processo completo.' } },
    { id: 'fb3', title: 'Discussão: vale a pena importar filamento?', creator: '3D Commerce BR', views: '52K', emoji: '💬', roteiro: '📌 Tópico polêmico para engajamento. 🔍 Análise de preços nacional vs importado. 💡 Experiências da comunidade. 🎯 Votação sobre o que preferem.',
      replicar: { equipamentos: 'Planilha de preços (nacional vs importado com impostos), print de sites, calculadora.', passos: ['Pesquise preços de 5 filamentos nacionais e 5 importados', 'Crie uma planilha comparativa com impostos inclusos', 'Faça o post com uma pergunta provocativa no título', 'Apresente os dados de forma clara (carrossel de imagens)', 'Finalize com enquete: "Você prefere nacional ou importado?"'], dicas: 'Posts de discussão geram 3x mais comentários. Seja neutro e apresente dados reais. Responda aos comentários para aumentar engajamento.', adaptacao: 'Adapte para: "Vale a pena montar uma impressora ou comprar pronta?" ou "PLA nacional vs importado? ".', formato: 'Carrossel de 5 imagens com dados. Texto de 300-400 caracteres com pergunta no final.' } },
    { id: 'fb4', title: 'Transformei sucata eletrônica em arte 3D', creator: 'Arte Sustentável 3D', views: '29K', emoji: '♻️', roteiro: '📌 Conceito de upcycling com 3D. 🔍 Materiais utilizados. 💡 Passo a passo da criação. 🎯 Mensagem de sustentabilidade.',
      replicar: { equipamentos: 'Sucata eletrônica (placas-mãe, fios, componentes), impressora 3D, filamento, cola quente, parafusos, tinta spray.', passos: ['Separe a sucata eletrônica e limpe os componentes', 'Desenhe/baixe uma base/modelo para integrar a sucata', 'Imprima a base em 3D', 'Monte: fixe os componentes eletrônicos na base', 'Pinte ou finalize com verniz', 'Mostre o resultado final como peça de arte/deco'], dicas: 'O contraste entre "lixo" e "arte" é o grande apelo. Mostre os componentes antes de virar arte. Sustentabilidade é um tema quente.', adaptacao: 'Use sucata de computador, celulares antigos, brinquedos quebrados. Tema muito forte para engajamento orgânico.', formato: 'Post de 5-7 imagens do processo. Vídeo de 2-3 minutos com timelapse da montagem.' } },
    { id: 'fb5', title: 'Review: Nova Impressora XYZ Pro 2026', creator: 'Tech 3D Reviews', views: '67K', emoji: '📦', roteiro: '📌 Unboxing e primeiras impressões. 🔍 Testes de impressão reais. 💡 Comparação com concorrentes. 🎯 Vale o investimento? Veredito final.',
      replicar: { equipamentos: 'Impressora nova (ou emprestada), caixa original para unboxing, filamento incluso, modelos de teste, câmera.', passos: ['Unboxing: mostre a caixa, os acessórios e o manual', 'Montagem: mostre o setup inicial (se necessário)', 'Primeira impressão: arquivo teste que vem na máquina', 'Testes: imprima 3 modelos diferentes (rápido, detalhado, grande)', 'Compare com sua impressora atual (se tiver)', 'Veredito final com nota e recomendação'], dicas: 'Seja honesto nos prós e contras. Mostre defeitos se houver - isso dá credibilidade. Use uma planilha de comparação.', adaptacao: 'Sem impressora nova para review? Ofereça para fazer review de lojas/filamentos. Ou faça "Review de 1 ano usando a [modelo]".', formato: 'Vídeo de 8-15 minutos (YouTube) ou post de 5-8 imagens + texto (Facebook).' } },
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
  const scanBtn = document.getElementById('viralScanBtn');
  const resultsDiv = document.getElementById('viralResults');
  const resultsList = document.getElementById('viralResultsList');
  const statusEl = document.getElementById('viralScanStatus');
  const roteiroSection = document.getElementById('viralRoteiroSection');
  const roteiroContent = document.getElementById('viralRoteiroContent');
  const copyBtn = document.getElementById('viralCopyRoteiro');

  let selectedItem = null;
  let currentPlatform = 'youtube';

  // Platform switching
  document.querySelectorAll('.viral-platform-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.viral-platform-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPlatform = btn.dataset.platform;
    });
  });

  scanBtn.addEventListener('click', () => {
    // Update status
    statusEl.className = 'viral-scan-status loading';
    statusEl.innerHTML = '<span class="viral-scan-status-icon">⏳</span><span>Varredura em andamento... analisando vídeos virais...</span>';
    resultsDiv.style.display = 'none';
    roteiroSection.style.display = 'none';

    // Simulate scanning delay
    setTimeout(() => {
      const platformData = viralMockData[currentPlatform];

      statusEl.className = 'viral-scan-status done';
      statusEl.innerHTML = `<span class="viral-scan-status-icon">✅</span><span>Varredura concluída! ${platformData.length} vídeos virais encontrados no ${currentPlatform.charAt(0).toUpperCase() + currentPlatform.slice(1)}.</span>`;

      resultsList.innerHTML = platformData.map(v => `
        <div class="viral-result-item" data-id="${v.id}" data-platform="${currentPlatform}">
          <div class="viral-result-thumb">${v.emoji}</div>
          <div class="viral-result-info">
            <div class="viral-result-title">${v.title}</div>
            <div class="viral-result-meta">${v.creator} · <span class="viral-result-views">👁️ ${v.views} visualizações</span></div>
            <span class="viral-result-platform ${currentPlatform}">${currentPlatform.charAt(0).toUpperCase() + currentPlatform.slice(1)}</span>
          </div>
        </div>
      `).join('');

      resultsDiv.style.display = 'block';

      // Item click
      resultsList.querySelectorAll('.viral-result-item').forEach(el => {
        el.addEventListener('click', () => {
          resultsList.querySelectorAll('.viral-result-item').forEach(i => i.classList.remove('selected'));
          el.classList.add('selected');

          const id = el.dataset.id;
          const platform = el.dataset.platform;
          const videos = viralMockData[platform];
          selectedItem = videos.find(v => v.id === id);

          if (selectedItem) {
            const roteiro = viralGenerateRoteiro(
              selectedItem.title,
              selectedItem.creator,
              platform,
              selectedItem
            );
            roteiroContent.textContent = roteiro;
            roteiroSection.style.display = 'block';
          }
        });
      });

    }, 1500);
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
