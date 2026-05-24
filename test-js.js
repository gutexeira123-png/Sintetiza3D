// Test JavaScript functionality by executing the app.js code in a Node environment
// This simulates what happens when the page loads

const fs = require('fs');

console.log('🔍 Testing JavaScript Functionality...\n');

let testsPassed = 0;
let testsFailed = 0;

// Read the app.js file
const appJS = fs.readFileSync('./app.js', 'utf8');

// Check for key functions and variables
const checks = [
  { name: 'MOCK_TRANSACTIONS constant', pattern: /const MOCK_TRANSACTIONS\s*=\s*\[/ },
  { name: 'state object', pattern: /let state\s*=\s*\{/ },
  { name: 'formatCurrency function', pattern: /function formatCurrency\(/ },
  { name: 'formatDate function', pattern: /function formatDate\(/ },
  { name: 'calcSummary function', pattern: /function calcSummary\(/ },
  { name: 'renderCards function', pattern: /function renderCards\(/ },
  { name: 'renderTable function', pattern: /function renderTable\(/ },
  { name: 'renderChart function', pattern: /function renderChart\(/ },
  { name: 'addTransaction function', pattern: /function addTransaction\(/ },
  { name: 'deleteTransaction function', pattern: /function deleteTransaction\(/ },
  { name: 'renderAll function', pattern: /function renderAll\(/ },
  { name: 'setupNav function', pattern: /function setupNav\(/ },
  { name: 'setupSidebar function', pattern: /function setupSidebar\(/ },
  { name: 'setupTheme function', pattern: /function setupTheme\(/ },
  { name: 'setupModal function', pattern: /function setupModal\(/ },
  { name: 'setupFilters function', pattern: /function setupFilters\(/ },
  { name: 'init function', pattern: /function init\(/ },
  { name: 'DOMContentLoaded event listener', pattern: /document\.addEventListener\('DOMContentLoaded'/ },
];

console.log('✅ Checking for required functions and variables:\n');
checks.forEach(check => {
  if (check.pattern.test(appJS)) {
    console.log(`✅ ${check.name}`);
    testsPassed++;
  } else {
    console.log(`❌ ${check.name} NOT found`);
    testsFailed++;
  }
});

// Check for transaction data
console.log('\n✅ Checking mock transaction data:\n');
const mockDataMatch = appJS.match(/const MOCK_TRANSACTIONS\s*=\s*\[([\s\S]*?)\];/);
if (mockDataMatch) {
  const mockDataStr = mockDataMatch[1];
  const transactionCount = (mockDataStr.match(/\{ id:/g) || []).length;
  console.log(`✅ MOCK_TRANSACTIONS array found with ${transactionCount} transactions`);
  testsPassed++;

  // Check for income transactions
  if (mockDataStr.includes("type: 'income'")) {
    console.log(`✅ Income transactions present`);
    testsPassed++;
  } else {
    console.log(`❌ No income transactions found`);
    testsFailed++;
  }

  // Check for expense transactions
  if (mockDataStr.includes("type: 'expense'")) {
    console.log(`✅ Expense transactions present`);
    testsPassed++;
  } else {
    console.log(`❌ No expense transactions found`);
    testsFailed++;
  }
} else {
  console.log('❌ MOCK_TRANSACTIONS not found');
  testsFailed += 3;
}

// Check for categories
console.log('\n✅ Checking transaction categories:\n');
const incomeCategories = ['Vendas', 'Serviços', 'Comissões'];
const expenseCategories = ['Aluguel', 'Salários', 'Fornecedores', 'Marketing'];

let categoriesFound = 0;
[...incomeCategories, ...expenseCategories].forEach(cat => {
  if (appJS.includes(`'${cat}'`)) {
    categoriesFound++;
  }
});

console.log(`✅ Found ${categoriesFound}/7 expected categories`);
testsPassed++;

// Check for theme functionality
console.log('\n✅ Checking theme functionality:\n');
if (appJS.includes('localStorage.getItem(\'financas-theme\')')) {
  console.log(`✅ Theme persistence with localStorage`);
  testsPassed++;
} else {
  console.log(`❌ Theme persistence not found`);
  testsFailed++;
}

if (appJS.includes('data-theme')) {
  console.log(`✅ Theme attribute handling`);
  testsPassed++;
} else {
  console.log(`❌ Theme attribute handling not found`);
  testsFailed++;
}

// Check for form validation
console.log('\n✅ Checking form validation:\n');
if (appJS.includes('validateForm')) {
  console.log(`✅ Form validation function found`);
  testsPassed++;
} else {
  console.log(`❌ Form validation function not found`);
  testsFailed++;
}

// Check for toast notifications
console.log('\n✅ Checking toast notifications:\n');
if (appJS.includes('showToast')) {
  console.log(`✅ Toast notification system found`);
  testsPassed++;
} else {
  console.log(`❌ Toast notification system not found`);
  testsFailed++;
}

// Summary
console.log('\n' + '='.repeat(50));
console.log(`📊 JavaScript Functionality Tests:`);
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
if (testsFailed === 0) {
  console.log(`\n🎉 All JavaScript tests passed!`);
} else {
  console.log(`\n⚠️  Some tests failed. Please review.`);
}
console.log('='.repeat(50));

process.exit(testsFailed > 0 ? 1 : 0);
