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
    { id: 'yt1', title: 'TOP 10 Impressoras 3D para Iniciantes em 2026', creator: '3D Tech Brasil', views: '458K', emoji: '🏆', roteiro: '📌 Introdução: Apresentar as 10 impressoras. 🔍 Comparar preço, qualidade, facilidade de uso. 💡 Destacar a melhor custo-benefício. 🎯 Conclusão: Recomendar conforme o perfil do usuário.' },
    { id: 'yt2', title: 'Impressão 3D com Resina vs FDM: Qual Escolher?', creator: 'PrintMaster 3D', views: '312K', emoji: '⚖️', roteiro: '📌 Introdução: Explicar as duas tecnologias. 🔍 Prós e contras de cada uma. 💡 Casos de uso ideais. 🎯 Conclusão: Qual escolher conforme necessidade.' },
    { id: 'yt3', title: 'Fiz Suportes que Economizam 50% de Filamento', creator: 'Maker Economico', views: '289K', emoji: '💰', roteiro: '📌 Introdução: Problema dos suportes tradicionais. 🔍 Técnicas de otimização. 💡 Tutorial passo a passo. 🎯 Economia real demonstrada.' },
    { id: 'yt4', title: 'Nunca Compre Filamento Barato - O Teste Final', creator: '3D Lab Brasil', views: '523K', emoji: '🔬', roteiro: '📌 Introdução: Comparativo de marcas. 🔍 Testes de aderência, resistência, acabamento. 💡 Resultados surpreendentes. 🎯 Recomendação final.' },
    { id: 'yt5', title: 'Transformei PLA em Peça Industrial com Esse Truque', creator: 'Engenheiro 3D', views: '198K', emoji: '🔧', roteiro: '📌 Introdução: Limitações do PLA. 🔍 Processo de pós-processamento. 💡 Resultado final impressionante. 🎯 Vale a pena o esforço?' },
  ],
  tiktok: [
    { id: 'tt1', title: 'Fazendo lâmpada 3D que parece vidro 🔥', creator: '@print3dbrasil', views: '1.2M', emoji: '💡', roteiro: '🎬 Abertura impactante com a lâmpada acesa. 🔍 Mostrar o processo em timelapse. 💡 Dica do filamento translúcido. 🎯 Resultado final e reação.' },
    { id: 'tt2', title: 'Erro de iniciante que danifica a mesa 🔥', creator: '@3dprint.tips', views: '892K', emoji: '⚠️', roteiro: '🎬 Mostrar o erro acontecendo. 🔍 Explicar por que acontece. 💡 Como evitar passo a passo. 🎯 Impressão perfeita no final.' },
    { id: 'tt3', title: 'Imprimi minha própria escrivaninha 🪑', creator: '@makerbrasil', views: '756K', emoji: '🪑', roteiro: '🎬 Antes e depois do projeto. 🔍 Desafios da impressão de móveis. 💡 Dicas de design. 🎯 Tour pelo resultado final.' },
    { id: 'tt4', title: 'Isso é impressão 3D ou mágica? 🎩', creator: '@3dworld', views: '2.1M', emoji: '🎩', roteiro: '🎬 Gancho curioso no início. 🔍 Revelar o truque de impressão. 💡 Explicar tecnologia envolvida. 🎯 Chamada para seguidores tentarem.' },
    { id: 'tt5', title: 'PETG vs PLA - Teste de resistência', creator: '@filamento3d', views: '445K', emoji: '💪', roteiro: '🎬 Mostrar teste destrutivo. 🔍 Comparar resultados. 💡 Qual usar para cada projeto. 🎯 Encerrar com dica final.' },
  ],
  instagram: [
    { id: 'ig1', title: 'Suporte para headset que viralizou 🎧', creator: '@3dprintart', views: '87K', emoji: '🎧', roteiro: '📸 Reel mostrando o suporte em uso. 🔍 Design minimalista e funcional. 💡 Arquivo grátis na bio. 🎯 Engajamento pedindo qual cor preferem.' },
    { id: 'ig2', title: 'Miniatura de personagem em 8K 🎮', creator: '@miniature3d', views: '134K', emoji: '🎮', roteiro: '📸 Close nos detalhes do print. 🔍 Explicar configurações de resina. 💡 Antes e depois da pintura. 🎯 Link para comprar o modelo.' },
    { id: 'ig3', title: 'Organizador de cabos que você precisa', creator: '@printorganizado', views: '62K', emoji: '🔌', roteiro: '📸 Situação bagunçada vs organizada. 🔍 Mostrar impressão do modelo. 💡 STL grátis nos stories. 🎯 Pergunta: qual cor devo lançar?' },
    { id: 'ig4', title: 'Vaso autoirrigável que virou febre 🪴', creator: '@3dgarden', views: '215K', emoji: '🪴', roteiro: '📸 Transição da planta antes/depois. 🔍 Explicar o sistema de irrigação. 💡 Tutorial rápido de montagem. 🎯 Salvar para ver depois.' },
    { id: 'ig5', title: 'Personalizei meu setup gamer 🎮', creator: '@geek3dprint', views: '178K', emoji: '🖥️', roteiro: '📸 Antes do setup sem graça. 🔍 Mostrar as peças impressas. 💡 Como personalizar o seu. 🎯 Resultado final impressionante.' },
  ],
  facebook: [
    { id: 'fb1', title: 'Grupo de Impressão 3D atinge 100K membros', creator: 'Impressão 3D Brasil', views: '45K', emoji: '🎉', roteiro: '📌 Post agradecendo a comunidade. 🔍 Destaque dos melhores trabalhos. 💡 Novidades do grupo. 🎯 Próximos desafios e sorteios.' },
    { id: 'fb2', title: 'Peça rara de reposição que salvei com 3D', creator: 'Oficina Maker', views: '38K', emoji: '🔩', roteiro: '📌 História do problema. 🔍 Processo de modelagem reversa. 💡 Impressão e teste. 🎯 Peça funcionando perfeitamente.' },
    { id: 'fb3', title: 'Discussão: vale a pena importar filamento?', creator: '3D Commerce BR', views: '52K', emoji: '💬', roteiro: '📌 Tópico polêmico para engajamento. 🔍 Análise de preços nacional vs importado. 💡 Experiências da comunidade. 🎯 Votação sobre o que preferem.' },
    { id: 'fb4', title: 'Transformei sucata eletrônica em arte 3D', creator: 'Arte Sustentável 3D', views: '29K', emoji: '♻️', roteiro: '📌 Conceito de upcycling com 3D. 🔍 Materiais utilizados. 💡 Passo a passo da criação. 🎯 Mensagem de sustentabilidade.' },
    { id: 'fb5', title: 'Review: Nova Impressora XYZ Pro 2026', creator: 'Tech 3D Reviews', views: '67K', emoji: '📦', roteiro: '📌 Unboxing e primeiras impressões. 🔍 Testes de impressão reais. 💡 Comparação com concorrentes. 🎯 Vale o investimento? Veredito final.' },
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

  const introTip = template.intro[Math.floor(Math.random() * template.intro.length)];
  const bodyTip = template.body[Math.floor(Math.random() * template.body.length)];
  const ctaTip = template.cta[Math.floor(Math.random() * template.cta.length)];

  return [
    `📋 ROTEIRO COMPLETO - ${platformName}`,
    `📌 Título: ${title}`,
    `👤 Criador: ${creator}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🎬 INTRODUÇÃO`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `Dica: ${introTip}`,
    ``,
    `📝 Sugestão de abertura:`,
    `"Fala pessoal! Hoje vou mostrar algo que está bombando no ${platformName} sobre Impressão 3D: ${title}. Se você é apaixonado por 3D, esse conteúdo é para você!"`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📖 DESENVOLVIMENTO`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `Dica: ${bodyTip}`,
    ``,
    `📝 Pontos principais para abordar:`,
    `${platformData.roteiro.split('. ').map((p, i) => `  ${i + 1}. ${p.trim()}`).join('\n')}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🎯 FINALIZAÇÃO`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `Dica: ${ctaTip}`,
    ``,
    `📝 Sugestão de encerramento:`,
    `"E aí, curtiu? Já salva esse vídeo para não perder a dica! Me conta nos comentários: o que você mais gostou? Não esquece de seguir para mais conteúdo sobre Impressão 3D!"`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🏷️ HASHTAGS SUGERIDAS`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `#Impressao3D #3DPrint #Maker #Criatividade #Tecnologia #Inovacao #DIY #Impressora3D #Print3D #ConteudoDigital`,
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
