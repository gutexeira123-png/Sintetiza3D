import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.43.0/+esm';

const SUPABASE_URL = window.SUPABASE_CONFIG?.url || '';
const SUPABASE_ANON_KEY = window.SUPABASE_CONFIG?.anonKey || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Mouse Reactive Background
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
}

// Redirecionar se já estiver logado
document.addEventListener('DOMContentLoaded', async () => {
  setupMouseGlow();

  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    window.location.href = 'index.html';
  }
});

// ── Tabs ─────────────────────────────────────────────────
const tabLogin    = document.getElementById('tabLogin');
const tabRegister = document.getElementById('tabRegister');
const loginForm   = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const forgotForm  = document.getElementById('forgotForm');

tabLogin.addEventListener('click', () => {
  tabLogin.classList.add('active');
  tabRegister.classList.remove('active');
  loginForm.style.display = '';
  registerForm.style.display = 'none';
  forgotForm.style.display = 'none';
  clearMessage();
});

tabRegister.addEventListener('click', () => {
  tabRegister.classList.add('active');
  tabLogin.classList.remove('active');
  registerForm.style.display = '';
  loginForm.style.display = 'none';
  forgotForm.style.display = 'none';
  clearMessage();
});

document.getElementById('forgotBtn').addEventListener('click', () => {
  loginForm.style.display = 'none';
  forgotForm.style.display = '';
  tabLogin.classList.remove('active');
  tabRegister.classList.remove('active');
  clearMessage();
});

document.getElementById('backToLoginBtn').addEventListener('click', () => {
  forgotForm.style.display = 'none';
  loginForm.style.display = '';
  tabLogin.classList.add('active');
  clearMessage();
});

// ── Password toggle ───────────────────────────────────────
function setupPasswordToggle(btnId, inputId) {
  document.getElementById(btnId).addEventListener('click', () => {
    const input = document.getElementById(inputId);
    input.type = input.type === 'password' ? 'text' : 'password';
  });
}
setupPasswordToggle('toggleLoginPwd', 'loginPassword');
setupPasswordToggle('toggleRegisterPwd', 'registerPassword');

// ── Message helper ────────────────────────────────────────
function showMessage(text, type = 'error') {
  const el = document.getElementById('authMessage');
  el.textContent = text;
  el.className = `auth-message ${type} show`;
}

function clearMessage() {
  const el = document.getElementById('authMessage');
  el.className = 'auth-message';
  el.textContent = '';
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.textContent = loading ? 'Aguarde...' : btn.dataset.label;
}

// ── Login ─────────────────────────────────────────────────
const loginBtn = document.getElementById('loginBtn');
loginBtn.dataset.label = 'Entrar na conta';

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessage();

  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    showMessage('Preencha e-mail e senha.');
    return;
  }

  setLoading(loginBtn, true);

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const msgs = {
      'Invalid login credentials': 'E-mail ou senha incorretos.',
      'Email not confirmed': 'Confirme seu e-mail antes de entrar.',
    };
    showMessage(msgs[error.message] || error.message);
    setLoading(loginBtn, false);
    return;
  }

  window.location.href = 'index.html';
});

// ── Register ──────────────────────────────────────────────
const registerBtn = document.getElementById('registerBtn');
registerBtn.dataset.label = 'Criar conta';

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessage();

  const email    = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirm  = document.getElementById('registerConfirm').value;

  if (!email || !password || !confirm) {
    showMessage('Preencha todos os campos.');
    return;
  }

  if (password.length < 6) {
    showMessage('A senha deve ter pelo menos 6 caracteres.');
    return;
  }

  if (password !== confirm) {
    showMessage('As senhas não coincidem.');
    return;
  }

  setLoading(registerBtn, true);

  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    showMessage(error.message);
    setLoading(registerBtn, false);
    return;
  }

  showMessage('Conta criada! Verifique seu e-mail para confirmar o cadastro.', 'success');
  setLoading(registerBtn, false);
});

// ── Forgot password ───────────────────────────────────────
forgotForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessage();

  const email = document.getElementById('forgotEmail').value.trim();

  if (!email) {
    showMessage('Informe seu e-mail.');
    return;
  }

  const submitBtn = forgotForm.querySelector('button[type="submit"]');
  const label = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Aguarde...';

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/login.html',
  });

  submitBtn.disabled = false;
  submitBtn.textContent = label;

  showMessage('Link enviado! Verifique sua caixa de entrada.', 'success');
});
