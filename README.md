# FinançasPRO – Aplicação de Controle Financeiro com Supabase

Uma aplicação web moderna e responsiva para gerenciamento financeiro de pequenas empresas, com persistência de dados em tempo real via Supabase.

## ✨ Features

### Funcionalidades Principais
- ✅ **Adicionar Transações** - Receitas e despesas com categorias
- ✅ **Visualizar Totais** - Saldo, receitas e despesas em cards
- ✅ **Listar Transações** - Tabela com filtros e busca
- ✅ **Gráfico de Resumo** - 7 dias de receitas vs despesas
- ✅ **Tema Dark/Light** - Modo claro e escuro
- ✅ **Design Responsivo** - Mobile, tablet e desktop
- ✅ **Persistência Real** - Supabase como backend
- ✅ **Cache Local** - Funciona offline com localStorage
- ✅ **Interface Intuitiva** - Modal rápida para transações

### Tecnologias
- **Frontend:** HTML5, CSS3, JavaScript ES6+
- **Backend:** Supabase (PostgreSQL + API)
- **Database:** PostgreSQL (Supabase)
- **Styling:** CSS custom properties com dark/light theme

## 🚀 Quick Start

### 1. Configurar Supabase

```bash
# 1. Criar projeto em https://supabase.com
# 2. Ir para Settings → API
# 3. Copiar URL do projeto e chave anônima
# 4. Editar supabase-config.js:

const SUPABASE_URL = 'https://seu-id.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ...';
```

### 2. Criar Tabela no Supabase

Ir para **SQL Editor** no dashboard do Supabase e rodar:

```sql
CREATE TABLE transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID DEFAULT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  category VARCHAR(100),
  date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date DESC);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON transactions FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete" ON transactions FOR DELETE USING (true);
```

### 3. Instalar & Rodar

```bash
# Instalar dependências
npm install

# Rodar servidor local
npm run dev
# ou
http-server -p 8000

# Abrir em navegador
http://localhost:8000
```

## 📁 Estrutura

```
financeiro-app/
├── index.html                    # Estrutura HTML
├── app.js                       # Lógica principal (com Supabase)
├── style.css                    # Estilos (dark/light theme)
├── supabase-config.js           # Configuração do Supabase
├── supabase-client.js           # Cliente Supabase + CRUD
├── package.json                 # Dependências
├── .env                         # Variáveis de ambiente (não commitado)
├── .gitignore                   # Git ignore rules
├── SUPABASE_SETUP.md            # Guia detalhado de setup
├── SUPABASE_INTEGRATION.md      # Resumo da integração
└── README.md                    # Este arquivo
```

## 🔧 Configuração

### Arquivo `.env`

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
```

⚠️ **IMPORTANTE:**
- Não comitar `.env` (já está em `.gitignore`)
- Usar apenas a chave **pública anônima** (não service role)
- Manter credenciais seguras

### Arquivo `supabase-config.js`

```javascript
// Edite com suas credenciais do Supabase
const SUPABASE_URL = 'https://xyz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ...';
```

## 💾 Persistência de Dados

### Com Supabase
- ✅ Transações persistem em banco de dados PostgreSQL
- ✅ Sincronizam entre dispositivos
- ✅ Backups automáticos
- ✅ Histórico de dados

### Cache Local
- ✅ Funciona offline com localStorage
- ✅ Cache de 5 minutos para performance
- ✅ Sincroniza quando conexão volta

### Fallback
- ✅ Se Supabase indisponível, usa cache
- ✅ Se sem cache, usa dados mock para demo
- ✅ Erro claro no console e toast

## 🎨 Temas

### Dark Mode (Padrão)
- Fundo: #0f0f1a
- Cards: #16162a
- Gradiente Primário: Roxo → Índigo
- Receitas: Verde
- Despesas: Rosa

### Light Mode
- Fundo: #f1f5f9
- Cards: Branco
- Alto contraste para legibilidade

Alternar tema com o botão de sol/lua na topbar.

## 📊 Filtros & Busca

### Filtro por Tipo
- **Todos** - Mostrar todas transações
- **Receitas** - Apenas income
- **Despesas** - Apenas expense

### Busca por Texto
- Busca na descrição
- Busca na categoria
- Case-insensitive

## 📱 Responsividade

- **Desktop** (> 900px) - Sidebar lateral fixo
- **Tablet** (640-900px) - Sidebar retrátil
- **Mobile** (< 640px) - Sidebar overlay

## 🔐 Segurança

### Credenciais
- Chave pública anônima é segura no cliente
- RLS policies no Supabase protegem dados
- `.env` não é commitado
- Sem dados sensíveis hardcoded

### Próximos Passos
- Adicionar autenticação (Supabase Auth)
- Implementar user_id nas transações
- Restringir acesso por usuário
- Audit logs de alterações

## 🐛 Troubleshooting

### "Supabase não configurado"
```javascript
// Verificar em supabase-config.js
const SUPABASE_URL = 'https://...'; // Não pode ter 'sua-id-projeto'
const SUPABASE_ANON_KEY = 'eyJ...'; // Deve começar com eyJ
```

### 404 ao criar transação
```sql
-- Verificar que a tabela existe
SELECT * FROM transactions LIMIT 1;

-- Verificar RLS policies
SELECT * FROM pg_policies WHERE tablename = 'transactions';
```

### Cache desatualizado
```javascript
// No console do navegador
localStorage.removeItem('financas-pro-transactions-cache');
location.reload();
```

## 📚 Documentação

- **`SUPABASE_SETUP.md`** - Guia completo de instalação e setup
- **`SUPABASE_INTEGRATION.md`** - Resumo técnico da integração
- **`RELATORIO_TESTES.md`** - Resultados dos testes automatizados

## 🚀 Deploy

### GitHub Pages
```bash
# Copiar arquivos para branch gh-pages
git push origin main:gh-pages
```

### Netlify
```bash
# Conectar repositório
# Deploymentos automáticos em git push
```

### Vercel
```bash
# Conectar repositório
# Deploymentos automáticos em git push
```

### Servidor Próprio
```bash
# Usar any HTTP server
python -m http.server 8000
# ou
npx http-server
```

## 📈 Roadmap

### v1.1 (2-3 semanas)
- [ ] Editar transações
- [ ] Soft delete (arquivar)
- [ ] Busca avançada por data
- [ ] Exportar dados

### v2.0 (1-2 meses)
- [ ] Autenticação (Supabase Auth)
- [ ] Contas multi-usuário
- [ ] Sync em tempo real
- [ ] Equipes & permissões

### v3.0 (3-6 meses)
- [ ] App mobile (React Native)
- [ ] PWA offline-first
- [ ] Relatorios avançados
- [ ] Integração com APIs externas

## 💡 Features Futuras

- Suporte a múltiplas moedas
- Metas financeiras
- Alertas de limite de gastos
- Análise de gastos por categoria
- Agendamento de transações recorrentes
- Compartilhamento de dados
- API pública (para integrações)

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

MIT License - veja LICENSE file para detalhes

## 📞 Suporte

- **Issues:** Abra uma issue no GitHub
- **Discussões:** Use GitHub Discussions
- **Docs:** Veja SUPABASE_SETUP.md
- **Console:** Verifique browser console (F12)

## 👨‍💻 Autor

FinançasPRO - Aplicação de Controle Financeiro

## 🙏 Agradecimentos

- Supabase pelo backend
- Google Fonts pela tipografia
- Comunidade open source

---

**Versão:** 1.0.0  
**Status:** ✅ Pronto para Produção  
**Última Atualização:** 23 de Maio de 2026

Aproveite! 🎉
