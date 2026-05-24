# FinançasPRO – Supabase Integration Guide

## 📋 Table of Contents
1. [Quick Setup](#quick-setup)
2. [Supabase Configuration](#supabase-configuration)
3. [Database Schema](#database-schema)
4. [Environment Variables](#environment-variables)
5. [How It Works](#how-it-works)
6. [API Functions](#api-functions)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)
9. [Future Enhancements](#future-enhancements)

---

## ⚡ Quick Setup

### Step 1: Create Supabase Project
1. Go to https://supabase.com
2. Sign up or log in
3. Click "New Project"
4. Fill in project details and create

### Step 2: Get Credentials
1. After project is created, go to **Settings → API**
2. Copy:
   - **Project URL** (looks like: `https://xxx.supabase.co`)
   - **anon public key** (starts with `eyJ...`)
3. **DO NOT copy the service_role key** – only use the public anon key

### Step 3: Configure App
1. Open `supabase-config.js` in your project
2. Replace:
   ```javascript
   const SUPABASE_URL = 'https://sua-id-projeto.supabase.co';
   const SUPABASE_ANON_KEY = 'sua-chave-anonima-publica-aqui';
   ```

3. With your actual credentials:
   ```javascript
   const SUPABASE_URL = 'https://xyzabc123.supabase.co';
   const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
   ```

### Step 4: Create Database Table
1. In Supabase Dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy and paste the SQL from [Database Schema](#database-schema) section
4. Click "Run"

### Step 5: Run App
```bash
npm install
npm run dev
# ou use http-server -p 8000
```

---

## 🔐 Supabase Configuration

### File: `supabase-config.js`

This file stores Supabase credentials and is loaded by the HTML before the main app.

```javascript
const SUPABASE_URL = 'https://sua-id-projeto.supabase.co';
const SUPABASE_ANON_KEY = 'sua-chave-anonima-publica-aqui';

// Stored in window.SUPABASE_CONFIG for access in app.js
window.SUPABASE_CONFIG = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY
};
```

**⚠️ IMPORTANT:**
- Keep `.env` updated with your Supabase URL and key
- `.env` is in `.gitignore` and should NOT be committed
- Never share your credentials with anyone
- If credentials are exposed, regenerate them in Supabase Dashboard

### Environment Variables (`.env`)

```env
VITE_SUPABASE_URL=https://sua-id-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-publica-aqui
```

---

## 📊 Database Schema

Run this SQL in Supabase **SQL Editor** to create the transactions table:

```sql
-- Create transactions table
CREATE TABLE transactions (
  -- Identifier
  id BIGSERIAL PRIMARY KEY,
  
  -- User tracking (prepared for multi-user, NULL for now)
  user_id UUID DEFAULT NULL,
  
  -- Transaction details
  type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  category VARCHAR(100),
  date DATE NOT NULL,
  note TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date DESC);
CREATE INDEX idx_transactions_type ON transactions(type);

-- Create updated_at trigger (auto-update when record changes)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) but allow public access for now
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous users to read all transactions
CREATE POLICY "Allow public read" ON transactions
    FOR SELECT USING (true);

-- Policy: Allow anonymous users to insert transactions
CREATE POLICY "Allow public insert" ON transactions
    FOR INSERT WITH CHECK (true);

-- Policy: Allow users to delete their own transactions
CREATE POLICY "Allow public delete" ON transactions
    FOR DELETE USING (true);
```

### Alternative: Manual Creation via UI

If you prefer the UI:

1. In Supabase Dashboard → **SQL Editor** → Click "+" → Create new table
2. Name: `transactions`
3. Add columns:
   - `id` (bigint, primary key, auto-increment)
   - `user_id` (uuid, nullable)
   - `type` (text, not null)
   - `description` (text, not null)
   - `amount` (numeric, not null)
   - `category` (text, nullable)
   - `date` (date, not null)
   - `note` (text, nullable)
   - `created_at` (timestamp with time zone, auto-set)
   - `updated_at` (timestamp with time zone, auto-set)

---

## 🔧 Environment Variables

### Development (`.env`)
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key-here
```

### Important Notes
- These variables are prefixed with `VITE_` to indicate they're client-side only
- Values starting with `sua-` or `seu-` are placeholders – replace them
- Never commit `.env` to git (already in `.gitignore`)
- For local development, create a `.env.local` if you need multiple configs

---

## 💡 How It Works

### Data Flow

```
User Action (Add/Delete)
    ↓
app.js (addTransaction / deleteTransaction)
    ↓
supabase-client.js (CRUD functions)
    ↓
Supabase Database (Real persistence)
    ↓
localStorage Cache (5-min fallback)
    ↓
state.transactions (In-memory state)
    ↓
Render functions (UI update)
```

### Loading Transactions

1. On page load, `init()` calls `loadTransactions()`
2. `loadTransactions()` calls `getTransactions()` from Supabase
3. Data is stored in `state.transactions`
4. Cache is updated in localStorage (5-min TTL)
5. If Supabase unavailable, uses cache
6. If no cache, uses mock data as fallback

### Creating Transaction

1. Form submission triggers `addTransaction(txData)`
2. Data is sent to `supabaseCreateTransaction()`
3. Supabase inserts and returns new row
4. Cache is cleared
5. `loadTransactions()` is called to refresh all data
6. UI updates with new data

### Deleting Transaction

1. Delete button triggers `deleteTransaction(id)`
2. Supabase deletes the row
3. Cache is cleared
4. `loadTransactions()` refreshes data
5. UI updates

---

## 🚀 API Functions

All functions are in `supabase-client.js`:

### `getTransactions(options)`
Fetch all transactions from Supabase or cache.

```javascript
const transactions = await getTransactions({ forceRefresh: true });
```

**Parameters:**
- `options.forceRefresh` (bool): Skip cache and fetch fresh from DB

**Returns:** Array of transaction objects

---

### `createTransaction(txData)`
Create a new transaction in Supabase.

```javascript
const result = await createTransaction({
  type: 'income',
  description: 'Venda de produto',
  amount: 1500,
  category: 'Vendas',
  date: '2026-05-23',
  note: 'Nota opcional'
});

if (result.error) {
  console.error('Error:', result.error);
} else {
  console.log('Created:', result.data);
}
```

**Parameters:**
- `txData.type` (required): 'income' or 'expense'
- `txData.description` (required): What happened
- `txData.amount` (required): Positive number
- `txData.category` (optional): Category name
- `txData.date` (required): ISO date (YYYY-MM-DD)
- `txData.note` (optional): Additional notes

**Returns:** `{ data: {...}, error: null }` or `{ data: null, error: "message" }`

---

### `deleteTransaction(id)`
Delete a transaction from Supabase.

```javascript
const result = await deleteTransaction(123);
```

**Parameters:**
- `id` (required): Transaction ID

**Returns:** `{ success: true }` or `{ error: "message" }`

---

### `updateTransaction(id, updates)`
Update transaction fields (prepared for future use).

```javascript
const result = await updateTransaction(123, {
  description: 'Updated description',
  amount: 2000
});
```

---

### `clearCache()`
Manually clear the localStorage cache.

```javascript
clearCache();
```

---

### `isSupabaseConfigured()`
Check if Supabase is properly configured.

```javascript
if (isSupabaseConfigured()) {
  console.log('Connected to Supabase');
} else {
  console.log('Using local data only');
}
```

**Returns:** Boolean

---

### `getSupabaseStatus()`
Get detailed status of Supabase connection and cache.

```javascript
const status = getSupabaseStatus();
console.log(status);
// {
//   configured: true,
//   url: "Configurado",
//   hasCache: true,
//   cacheExpired: false
// }
```

---

## 🧪 Testing

### Manual Testing

1. **Add Transaction:**
   - Click "Nova Transação"
   - Fill form and submit
   - Check Supabase Dashboard → `transactions` table
   - Verify toast says "adicionada com sucesso"

2. **Delete Transaction:**
   - Click delete icon on a transaction
   - Check Supabase Dashboard
   - Verify row is removed

3. **Filter & Search:**
   - Use filters on Transações tab
   - Verify correct results shown

4. **Charts & Totals:**
   - Add multiple transactions
   - Verify sums update in cards
   - Verify chart changes

5. **Offline Mode:**
   - Turn off internet
   - Refresh page
   - Verify data loads from cache
   - Turn internet back on
   - Refresh page
   - Verify real data loads

### Browser Console

Open DevTools (F12) → Console to see logs:

```
✅ Supabase cliente inicializado com sucesso
✅ 12 transações carregadas do Supabase
✅ Transação criada com sucesso: { id: 13, ... }
```

---

## 🐛 Troubleshooting

### "Supabase não configurado"
**Problem:** See warning in console  
**Solution:**
1. Check `supabase-config.js`
2. Verify URL and key are not placeholder values
3. Reload page
4. Check browser console for exact error

### 404 Error When Creating Transaction
**Problem:** Getting error 404 from Supabase  
**Solution:**
1. Verify `transactions` table exists in Supabase
2. Check table name is exactly `transactions` (lowercase)
3. Verify RLS policies are enabled
4. Check that anon key has INSERT permission

### Cache Not Clearing
**Problem:** Old data showing even after delete  
**Solution:**
1. Open DevTools → Console
2. Run: `localStorage.removeItem('financas-pro-transactions-cache')`
3. Refresh page

### Slow Performance
**Problem:** App feels sluggish  
**Solution:**
1. Data is cached for 5 minutes - refresh with F5
2. Check internet connection
3. Check Supabase Dashboard for database performance
4. Look at network tab in DevTools

### Still Using Mock Data
**Problem:** Transactions not persisting  
**Solution:**
1. Check browser console for errors
2. Verify Supabase project is active
3. Check RLS policies allow INSERT
4. Verify user_id column exists in table

---

## 🔮 Future Enhancements

### Phase 2: Authentication
- Add Supabase Auth (email/password or social)
- Filter transactions by user_id
- Personal dashboards per user
- Session management

### Phase 3: Advanced Features
- Edit transactions (UPDATE support)
- Bulk operations (delete multiple)
- CSV/PDF export
- Recurring transactions
- Budget tracking
- Multi-currency support

### Phase 4: Real-time Collaboration
- Supabase Realtime subscriptions
- Multi-device sync
- Live collaboration on business accounts
- Audit logs

### Phase 5: Mobile App
- React Native app
- PWA (Progressive Web App)
- Offline-first architecture
- Native file export

---

## 📞 Support

If you encounter issues:

1. **Check console errors** (F12 → Console)
2. **Review Supabase logs** (Dashboard → Logs)
3. **Check database** (Dashboard → Tables → transactions)
4. **Verify credentials** (Dashboard → Settings → API)
5. **Test with curl**:
   ```bash
   curl -H "apikey: YOUR_ANON_KEY" \
        https://your-project.supabase.co/rest/v1/transactions
   ```

---

## 📝 Quick Reference

| Action | File | Function |
|--------|------|----------|
| Configure | `supabase-config.js` | Manual edit |
| CRUD | `supabase-client.js` | getTransactions, createTransaction, etc |
| UI Logic | `app.js` | addTransaction, deleteTransaction, renderAll |
| Schema | SQL Editor | CREATE TABLE transactions |

---

**Version:** 1.0.0  
**Last Updated:** May 23, 2026  
**Docs:** This guide
