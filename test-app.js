// FinançasPRO - Test Script
// Tests the application for basic functionality and errors

const http = require('http');
const fs = require('fs');

console.log('🧪 Testing FinançasPRO Application...\n');

const tests = {
  passed: 0,
  failed: 0,
  errors: []
};

// Test 1: Check if HTML loads
console.log('Test 1: Loading HTML...');
http.get('http://localhost:8000', (res) => {
  let html = '';
  res.on('data', chunk => html += chunk);
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ HTML loads successfully (Status: 200)');
      tests.passed++;
    } else {
      console.log(`❌ HTML failed to load (Status: ${res.statusCode})`);
      tests.failed++;
    }

    // Check HTML content
    const checks = [
      { name: 'Dashboard section', pattern: 'section-dashboard' },
      { name: 'Transactions section', pattern: 'section-transactions' },
      { name: 'Add transaction section', pattern: 'section-add' },
      { name: 'Sidebar', pattern: 'sidebar' },
      { name: 'Transaction form', pattern: 'transactionForm' },
      { name: 'Cards grid', pattern: 'cards-grid' },
      { name: 'Balance display', pattern: 'balanceValue' },
      { name: 'Income total display', pattern: 'incomeValue' },
      { name: 'Expense total display', pattern: 'expenseValue' },
      { name: 'Recent transactions list', pattern: 'recentTransactionsList' },
      { name: 'Transactions table', pattern: 'transactionsTable' },
      { name: 'Modal overlay', pattern: 'modalOverlay' },
    ];

    console.log('\nTest 2: Checking HTML structure...');
    checks.forEach(check => {
      if (html.includes(check.pattern)) {
        console.log(`✅ ${check.name} found`);
        tests.passed++;
      } else {
        console.log(`❌ ${check.name} NOT found`);
        tests.failed++;
        tests.errors.push(`Missing: ${check.name}`);
      }
    });

    // Check if CSS is linked
    console.log('\nTest 3: Checking stylesheet link...');
    if (html.includes('href="style.css"')) {
      console.log('✅ CSS file is linked');
      tests.passed++;
    } else {
      console.log('❌ CSS file NOT linked properly');
      tests.failed++;
      tests.errors.push('Missing CSS link');
    }

    // Check if JS is linked
    console.log('\nTest 4: Checking JavaScript link...');
    if (html.includes('src="app.js"')) {
      console.log('✅ JavaScript file is linked');
      tests.passed++;
    } else {
      console.log('❌ JavaScript file NOT linked properly');
      tests.failed++;
      tests.errors.push('Missing JS link');
    }

    // Check language
    console.log('\nTest 5: Checking language...');
    if (html.includes('lang="pt-BR"')) {
      console.log('✅ Portuguese-BR language is set');
      tests.passed++;
    } else {
      console.log('❌ Portuguese-BR language NOT set');
      tests.failed++;
    }

    // Check for Google Fonts
    console.log('\nTest 6: Checking Google Fonts...');
    if (html.includes('fonts.googleapis.com')) {
      console.log('✅ Google Fonts are loaded');
      tests.passed++;
    } else {
      console.log('❌ Google Fonts NOT loaded');
      tests.failed++;
    }

    // Test local files exist
    console.log('\nTest 7: Checking local files...');
    const path = require('path');
    const files = ['style.css', 'app.js'];
    const cwd = process.cwd();
    files.forEach(file => {
      const filePath = path.join(cwd, file);
      if (fs.existsSync(filePath)) {
        console.log(`✅ File ${file} exists`);
        tests.passed++;
      } else {
        console.log(`❌ File ${file} NOT found at ${filePath}`);
        tests.failed++;
        tests.errors.push(`File missing: ${file}`);
      }
    });

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log(`📊 Test Results:`);
    console.log(`✅ Passed: ${tests.passed}`);
    console.log(`❌ Failed: ${tests.failed}`);
    if (tests.errors.length > 0) {
      console.log(`\n⚠️  Errors found:`);
      tests.errors.forEach(err => console.log(`   - ${err}`));
    } else {
      console.log(`\n🎉 No errors found!`);
    }
    console.log('='.repeat(50));

    process.exit(tests.failed > 0 ? 1 : 0);
  });
}).on('error', err => {
  console.error('❌ Failed to connect to server:', err.message);
  console.error('Make sure the HTTP server is running on http://localhost:8000');
  process.exit(1);
});
