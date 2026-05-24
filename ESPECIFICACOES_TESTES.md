# FinançasPRO – Especificações para Testes de Front-end

## Visão Geral

**Aplicação:** FinançasPRO  
**Tipo:** Vanilla JavaScript + Supabase (sem framework)  
**Páginas:** `login.html`, `index.html`  
**Backend:** Supabase (PostgreSQL + Auth)  
**URL de produção:** Netlify (deploy manual via arrastar pasta)

---

## Estrutura de Arquivos

```
financeiro-app/
├── login.html          # Página de autenticação
├── index.html          # Painel principal (protegido)
├── app.js              # Lógica do painel
├── auth.js             # Lógica de autenticação
├── supabase-client.js  # Camada de acesso ao Supabase
├── supabase-config.js  # Credenciais do Supabase
├── style.css           # Estilos globais
└── netlify.toml        # Configuração de deploy
```

---

## 1. Página de Login (`login.html`)

### 1.1 Estrutura Visual

| Elemento | ID / Classe | Descrição |
|---|---|---|
| Logo + nome | `.auth-logo` | SVG + "FinançasPRO" |
| Aba Entrar | `#tabLogin` | Ativa por padrão |
| Aba Criar conta | `#tabRegister` | Alterna para formulário de cadastro |
| Formulário login | `#loginForm` | Visível por padrão |
| Formulário cadastro | `#registerForm` | Oculto por padrão (`display:none`) |
| Formulário recuperação | `#forgotForm` | Oculto por padrão (`display:none`) |
| Mensagem de feedback | `#authMessage` | Exibe erros e sucessos |

### 1.2 Formulário de Login

| Campo | ID | Tipo | Obrigatório |
|---|---|---|---|
| E-mail | `#loginEmail` | `email` | Sim |
| Senha | `#loginPassword` | `password` | Sim |
| Botão entrar | `#loginBtn` | `submit` | — |
| Toggle senha | `#toggleLoginPwd` | `button` | — |
| Link esqueci senha | `#forgotBtn` | `button` | — |

**Casos de teste – Login:**

| # | Cenário | Entrada | Resultado Esperado |
|---|---|---|---|
| L01 | Login com credenciais válidas | E-mail e senha corretos | Redireciona para `index.html` |
| L02 | Login com senha errada | Senha incorreta | Mensagem: "E-mail ou senha incorretos." |
| L03 | Login com e-mail inexistente | E-mail não cadastrado | Mensagem: "E-mail ou senha incorretos." |
| L04 | Campos vazios | Formulário vazio | Mensagem: "Preencha e-mail e senha." |
| L05 | Toggle de senha | Clicar em `#toggleLoginPwd` | Campo alterna entre `password` e `text` |
| L06 | Usuário já logado | Acesso a `login.html` com sessão ativa | Redireciona para `index.html` |
| L07 | Estado de carregamento | Clicar em "Entrar" | Botão exibe "Aguarde..." e fica desabilitado |

### 1.3 Formulário de Cadastro

| Campo | ID | Tipo | Obrigatório |
|---|---|---|---|
| E-mail | `#registerEmail` | `email` | Sim |
| Senha | `#registerPassword` | `password` | Sim (mín. 6 caracteres) |
| Confirmar senha | `#registerConfirm` | `password` | Sim |
| Botão cadastrar | `#registerBtn` | `submit` | — |
| Toggle senha | `#toggleRegisterPwd` | `button` | — |

**Casos de teste – Cadastro:**

| # | Cenário | Entrada | Resultado Esperado |
|---|---|---|---|
| C01 | Cadastro válido | Dados corretos | Mensagem de sucesso pedindo confirmação de e-mail |
| C02 | Senhas não coincidem | Senhas diferentes | Mensagem: "As senhas não coincidem." |
| C03 | Senha curta | Menos de 6 caracteres | Mensagem: "A senha deve ter pelo menos 6 caracteres." |
| C04 | Campos vazios | Formulário vazio | Mensagem: "Preencha todos os campos." |
| C05 | Alternância de abas | Clicar em "Criar conta" | `#registerForm` visível, `#loginForm` oculto |

### 1.4 Recuperação de Senha

**Casos de teste:**

| # | Cenário | Entrada | Resultado Esperado |
|---|---|---|---|
| R01 | Acesso ao formulário | Clicar em "Esqueci minha senha" | `#forgotForm` visível, abas sem destaque |
| R02 | E-mail válido | E-mail cadastrado | Mensagem: "Link enviado! Verifique sua caixa de entrada." |
| R03 | Campo vazio | Formulário vazio | Mensagem: "Informe seu e-mail." |
| R04 | Voltar ao login | Clicar em "Voltar ao login" | `#loginForm` visível, aba "Entrar" ativa |

---

## 2. Painel Principal (`index.html`)

### 2.1 Proteção de Rota

| # | Cenário | Resultado Esperado |
|---|---|---|
| P01 | Acesso sem sessão | Redireciona para `login.html` |
| P02 | Acesso com sessão válida | Carrega o painel normalmente |
| P03 | Logout em outra aba | Redireciona para `login.html` automaticamente |

### 2.2 Sidebar

| Elemento | ID / Classe | Descrição |
|---|---|---|
| Sidebar | `#sidebar` | Painel lateral fixo |
| Botão fechar sidebar | `#sidebarToggle` | Colapsa a sidebar |
| Botão abrir menu | `#menuBtn` | Abre a sidebar (mobile e desktop) |
| Nav – Painel | `#nav-dashboard` | Navega para seção dashboard |
| Nav – Transações | `#nav-transactions` | Navega para seção de transações |
| Nav – Nova Transação | `#nav-add` | Navega para seção de formulário |
| Nav – Precificação 3D | `#nav-calc3d` | Navega para calculadora |
| Avatar do usuário | `.user-avatar` | Exibe as 2 primeiras letras do e-mail |
| Nome do usuário | `.user-name` | Exibe o e-mail completo do usuário logado |
| Botão logout | `#logoutBtn` | Encerra sessão e redireciona para `login.html` |

**Casos de teste – Sidebar:**

| # | Cenário | Resultado Esperado |
|---|---|---|
| S01 | Clicar em "Painel" | `#section-dashboard` ativo, `#nav-dashboard` com classe `active` |
| S02 | Clicar em "Transações" | `#section-transactions` ativo |
| S03 | Clicar em "Nova Transação" | `#section-add` ativo |
| S04 | Clicar em "Precificação 3D" | `#section-calc3d` ativo |
| S05 | Clicar em logout | Sessão encerrada, redireciona para `login.html` |
| S06 | Usuário logado | `.user-avatar` exibe iniciais do e-mail, `.user-name` exibe o e-mail |
| S07 | Colapsar sidebar (desktop) | Sidebar recebe classe `collapsed`, `#main` recebe `expanded` |
| S08 | Abrir sidebar (mobile) | Sidebar recebe classe `mobile-open` |

### 2.3 Topbar

| Elemento | ID / Classe | Descrição |
|---|---|---|
| Título da página | `#pageTitle` | Atualizado conforme seção ativa |
| Data atual | `#currentDate` | Exibe dia da semana e data completa em pt-BR |
| Botão tema | `#themeToggle` | Alterna entre tema claro e escuro |
| Botão nova transação | `#openModalBtn` | Abre o modal de transação |

**Casos de teste – Topbar:**

| # | Cenário | Resultado Esperado |
|---|---|---|
| T01 | Alternância de tema | `data-theme` do `<html>` alterna entre `dark` e `light` |
| T02 | Tema persistido | Ao recarregar, o tema salvo no `localStorage` é restaurado |
| T03 | Título da página | Ao navegar, `#pageTitle` exibe o título correto da seção |

### 2.4 Dashboard (`#section-dashboard`)

| Elemento | ID | Descrição |
|---|---|---|
| Saldo atual | `#balanceValue` | Receitas – Despesas em R$ |
| Indicador de tendência | `#balanceTrend` | "▲ Positivo" (verde) ou "▼ Negativo" (vermelho) |
| Total receitas | `#incomeValue` | Soma de todas as receitas |
| Contagem receitas | `#incomeCount` | Número de lançamentos de receita |
| Total despesas | `#expenseValue` | Soma de todas as despesas |
| Contagem despesas | `#expenseCount` | Número de lançamentos de despesa |
| Mês atual | `#currentMonth` | Ex: "Maio 2026" |
| Gráfico | `#summaryChart` | Canvas com receitas e despesas dos últimos 7 dias |
| Últimas transações | `#recentTransactionsList` | Lista com as 6 transações mais recentes |
| Link ver todas | `#viewAllLink` | Navega para `#section-transactions` |

**Casos de teste – Dashboard:**

| # | Cenário | Resultado Esperado |
|---|---|---|
| D01 | Sem transações | Valores exibem "R$ 0,00", lista exibe "Nenhuma transação encontrada." |
| D02 | Com transações | Cards exibem os totais calculados corretamente |
| D03 | Saldo positivo | `#balanceTrend` exibe "▲ Positivo" com classe `positive` |
| D04 | Saldo negativo | `#balanceTrend` exibe "▼ Negativo" com classe `negative` |
| D05 | Lista recente | Exibe no máximo 6 itens ordenados por data decrescente |
| D06 | Link "Ver todas" | Navega para seção de transações |
| D07 | Gráfico renderizado | Canvas `#summaryChart` tem `width` e `height` maiores que 0 |

### 2.5 Seção de Transações (`#section-transactions`)

| Elemento | ID | Descrição |
|---|---|---|
| Filtro por tipo | `#filterType` | Select: Todos / Receitas / Despesas |
| Filtro por busca | `#filterSearch` | Input de texto livre |
| Tabela | `#transactionsTableBody` | Tbody populado por JS |

**Casos de teste – Transações:**

| # | Cenário | Resultado Esperado |
|---|---|---|
| TX01 | Filtro "Receitas" | Exibe apenas linhas com badge "↑ Receita" |
| TX02 | Filtro "Despesas" | Exibe apenas linhas com badge "↓ Despesa" |
| TX03 | Busca por descrição | Exibe apenas transações com o termo na descrição |
| TX04 | Busca por categoria | Exibe apenas transações com o termo na categoria |
| TX05 | Sem resultados | Exibe mensagem "Nenhuma transação encontrada." |
| TX06 | Deletar transação | Clicar em `.btn-delete` remove o item e atualiza a tabela |
| TX07 | Ordenação | Transações ordenadas por data decrescente |

### 2.6 Nova Transação – Formulário (`#section-add`)

| Campo | ID | Tipo | Obrigatório |
|---|---|---|---|
| Tipo – Receita | `#typeIncome` | `button` | — |
| Tipo – Despesa | `#typeExpense` | `button` | — |
| Tipo (hidden) | `#txType` | `hidden` | — |
| Descrição | `#txDescription` | `text` (máx. 80) | Sim |
| Valor | `#txAmount` | `number` (mín. 0.01) | Sim |
| Categoria | `#txCategory` | `select` | Não |
| Data | `#txDate` | `date` | Sim |
| Observação | `#txNote` | `textarea` (máx. 200) | Não |
| Botão limpar | `#clearFormBtn` | `button` | — |
| Botão salvar | `#submitBtn` | `submit` | — |

**Casos de teste – Formulário:**

| # | Cenário | Resultado Esperado |
|---|---|---|
| F01 | Campos obrigatórios vazios | Campos recebem classe `error`, toast com erro |
| F02 | Valor zero ou negativo | Campo `#txAmount` recebe classe `error` |
| F03 | Seleção de tipo | Botão ativo recebe cor correspondente (verde/vermelho) |
| F04 | Data preenchida | `#txDate` é preenchido com a data de hoje ao carregar |
| F05 | Envio válido | Transação salva no Supabase, toast de sucesso, formulário limpo |
| F06 | Botão limpar | Formulário resetado, `#txDate` volta para hoje |

### 2.7 Modal de Nova Transação

| Elemento | ID | Descrição |
|---|---|---|
| Overlay | `#modalOverlay` | Fundo escurecido |
| Botão abrir | `#openModalBtn` | Na topbar |
| Botão fechar (X) | `#closeModalBtn` | No cabeçalho do modal |
| Botão cancelar | `#cancelModalBtn` | No rodapé do modal |
| Formulário | `#modalForm` | Versão simplificada do formulário |

**Casos de teste – Modal:**

| # | Cenário | Resultado Esperado |
|---|---|---|
| M01 | Abrir modal | `#modalOverlay` recebe classe `active` |
| M02 | Fechar com botão X | `#modalOverlay` perde classe `active`, formulário resetado |
| M03 | Fechar clicando fora | Clicar no overlay fecha o modal |
| M04 | Fechar com Escape | Tecla Escape fecha o modal |
| M05 | Envio válido | Transação salva, modal fechado, navega para dashboard |
| M06 | Campos obrigatórios | Toast de erro se descrição, valor ou data estiver vazio |

### 2.8 Calculadora de Precificação 3D (`#section-calc3d`)

**Campos de entrada (todos `<input type="number">`):**

| Campo | ID | Valor Padrão |
|---|---|---|
| Tipo de filamento | `#c3dFilamentType` | PLA |
| Preço do filamento (R$/kg) | `#c3dFilamentPrice` | 120 |
| Peso usado (g) | `#c3dFilamentWeight` | 50 |
| Desperdício (%) | `#c3dFilamentWaste` | 5 |
| Preço do kWh (R$) | `#c3dEnergyPrice` | 0.85 |
| Potência (W) | `#c3dPrinterWatts` | 350 |
| Horas de impressão | `#c3dPrintHours` | 4 |
| Minutos adicionais | `#c3dPrintMinutes` | 30 |
| Custo da impressora (R$) | `#c3dPrinterCost` | 2500 |
| Vida útil impressora (h) | `#c3dPrinterLifespan` | 3000 |
| Custo do bico (R$) | `#c3dNozzleCost` | 25 |
| Vida útil bico (h) | `#c3dNozzleLife` | 500 |
| Custo da mesa (R$) | `#c3dBedCost` | 80 |
| Vida útil mesa (h) | `#c3dBedLife` | 1500 |
| Manutenção outros (R$/h) | `#c3dOtherMaintenance` | 0.50 |
| Valor hora trabalho (R$/h) | `#c3dLaborRate` | 30 |
| Tempo trabalho manual (min) | `#c3dLaborTime` | 30 |
| Taxa de falha (%) | `#c3dFailRate` | 8 |
| Margem de lucro (%) | `#c3dProfitMargin` | 50 |
| Quantidade de peças | `#c3dQuantity` | 1 |

**Resultados exibidos:**

| Elemento | ID |
|---|---|
| Preço final sugerido | `#c3dFinalPrice` |
| Custo material | `#c3dCostMaterial` |
| Custo energia | `#c3dCostEnergy` |
| Depreciação | `#c3dCostDepreciation` |
| Desgaste/Manutenção | `#c3dCostWear` |
| Mão de obra | `#c3dCostLabor` |
| Custo base (subtotal) | `#c3dSubtotal` |
| Ajuste de falhas | `#c3dCostFail` |
| Custo total | `#c3dTotalCost` |
| Lucro | `#c3dProfitValue` |
| Card de lote | `#c3dBatchCard` |

**Casos de teste – Calculadora:**

| # | Cenário | Resultado Esperado |
|---|---|---|
| CA01 | Cálculo com valores padrão | `#c3dFinalPrice` exibe valor maior que R$ 0,00 |
| CA02 | Alterar qualquer campo | Recalculo automático após 400ms (debounce) |
| CA03 | Quantidade > 1 | `#c3dBatchCard` fica visível com dados do lote |
| CA04 | Quantidade = 1 | `#c3dBatchCard` fica oculto (`display:none`) |
| CA05 | Botão resetar | Todos os campos voltam aos valores padrão e recalcula |
| CA06 | Botão "Calcular Preço" | Força recálculo e exibe toast de sucesso |

### 2.9 Toast de Notificação

| Elemento | ID | Tipos |
|---|---|---|
| Toast | `#toast` | `success`, `error`, `info` |

**Casos de teste – Toast:**

| # | Cenário | Resultado Esperado |
|---|---|---|
| TO01 | Operação bem-sucedida | Toast com classe `success` aparece com borda verde |
| TO02 | Erro | Toast com classe `error` aparece com borda vermelha |
| TO03 | Auto-fechar | Toast desaparece após ~3.2 segundos |

---

## 3. Fluxo de Autenticação

```
Usuário acessa index.html
        ↓
  Sessão existe?
    NÃO → redireciona para login.html
    SIM → carrega painel, preenche avatar/nome
              ↓
        Clica em logout
              ↓
        signOut() no Supabase
              ↓
        Redireciona para login.html
```

---

## 4. Banco de Dados (Supabase)

**Tabela:** `transactions`

| Coluna | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | BIGSERIAL | Sim (PK) | Chave primária auto-incremental |
| `user_id` | UUID | Não | ID do usuário (preparado para RLS por usuário) |
| `type` | VARCHAR(10) | Sim | `'income'` ou `'expense'` |
| `description` | VARCHAR(255) | Sim | Descrição da transação |
| `amount` | DECIMAL(15,2) | Sim | Valor monetário |
| `category` | VARCHAR(100) | Não | Categoria da transação |
| `date` | DATE | Sim | Data da transação |
| `note` | TEXT | Não | Observação adicional |
| `created_at` | TIMESTAMP | Não | Preenchido automaticamente |

**Políticas RLS ativas:**
- SELECT: público (`USING (true)`)
- INSERT: público (`WITH CHECK (true)`)
- DELETE: público (`USING (true)`)

---

## 5. Responsividade

| Breakpoint | Comportamento |
|---|---|
| `> 768px` | Sidebar fixa visível, `#main` com `margin-left: 240px` |
| `≤ 768px` | Sidebar oculta por padrão, abre com classe `mobile-open` |
| `≤ 640px` | Formulários em coluna única (`.form-row.two-cols` empilha) |
| `≤ 960px` | Calculadora 3D em coluna única |
| `≤ 900px` | Dashboard grid em coluna única |

**Casos de teste – Responsividade:**

| # | Cenário | Resultado Esperado |
|---|---|---|
| RE01 | Viewport 375px | Sidebar oculta, botão menu visível |
| RE02 | Abrir menu (mobile) | Sidebar sobrepõe o conteúdo |
| RE03 | Viewport 1280px | Sidebar sempre visível |
| RE04 | Resize da janela | Gráfico redimensiona corretamente |

---

## 6. Acessibilidade

| Elemento | Atributo | Valor |
|---|---|---|
| Botão fechar sidebar | `aria-label` | "Fechar menu" |
| Botão abrir menu | `aria-label` | "Abrir menu" |
| Botão tema | `aria-label` | "Alternar tema claro/escuro" |
| Botão logout | `aria-label` | "Sair da conta" |
| Modal | `role`, `aria-modal`, `aria-labelledby` | `dialog`, `true`, `modalTitle` |
| Toast | `role`, `aria-live` | `alert`, `polite` |
| Botão mostrar senha | `aria-label` | "Mostrar senha" |

---

## 7. LocalStorage

| Chave | Descrição |
|---|---|
| `financas-theme` | Tema salvo: `'dark'` ou `'light'` |
| `financas-pro-transactions-cache` | Cache das transações (JSON) |
| `financas-pro-cache-time` | Timestamp do cache (expira em 5 minutos) |

---

## 8. Categorias Disponíveis

**Receitas:** Vendas, Serviços, Comissões, Investimentos, Outros (Receita)

**Despesas:** Aluguel, Salários, Fornecedores, Marketing, Utilidades, Impostos, Manutenção, Outros (Despesa)
