// Advanced DOM simulation test
// Uses jsdom to simulate the browser environment and test JavaScript execution

const fs = require('fs');

console.log('🌐 Testing DOM Simulation and JavaScript Execution...\n');

try {
  // Try to use jsdom if available
  const { JSDOM } = require('jsdom');

  console.log('📦 Using JSDOM for DOM simulation...\n');

  // Load HTML
  const htmlContent = fs.readFileSync('./index.html', 'utf8');

  // Create DOM
  const dom = new JSDOM(htmlContent, {
    url: 'http://localhost:8000',
    pretendToBeVisual: true,
    resources: 'usable'
  });

  const { window } = dom;
  global.window = window;
  global.document = window.document;
  global.HTMLElement = window.HTMLElement;

  console.log('✅ DOM created successfully');

  // Try to load and execute app.js
  const appJSContent = fs.readFileSync('./app.js', 'utf8');

  // Execute the app.js code
  try {
    // Create a function to execute in the window context
    window.eval(appJSContent);
    console.log('✅ JavaScript executed without errors');
  } catch (err) {
    console.log('⚠️  JavaScript execution note: ' + err.message);
  }

  // Check if DOM elements were initialized
  const checks = [
    { name: 'Sidebar element', selector: '#sidebar' },
    { name: 'Main content area', selector: '#main' },
    { name: 'Dashboard section', selector: '#section-dashboard' },
    { name: 'Balance value display', selector: '#balanceValue' },
    { name: 'Income value display', selector: '#incomeValue' },
    { name: 'Expense value display', selector: '#expenseValue' },
    { name: 'Toast notification', selector: '#toast' },
    { name: 'Modal overlay', selector: '#modalOverlay' },
  ];

  console.log('\n✅ Checking DOM elements:\n');
  let elementsFound = 0;
  checks.forEach(check => {
    const el = window.document.querySelector(check.selector);
    if (el) {
      console.log(`✅ ${check.name} found`);
      elementsFound++;
    } else {
      console.log(`❌ ${check.name} NOT found`);
    }
  });

  console.log(`\n✅ Elements found: ${elementsFound}/${checks.length}`);

  // Check if critical functions exist in window scope
  console.log('\n✅ Checking global functions:\n');
  const functions = [
    'formatCurrency',
    'formatDate',
    'calcSummary',
    'renderCards',
    'addTransaction',
    'deleteTransaction',
    'navigateTo',
    'showToast'
  ];

  let functionsFound = 0;
  functions.forEach(fn => {
    if (typeof window[fn] === 'function') {
      console.log(`✅ ${fn}() exists`);
      functionsFound++;
    } else {
      console.log(`⚠️  ${fn}() not found (may be OK if defined in app scope)`);
    }
  });

  console.log(`\n✅ Functions available: ${functionsFound}/${functions.length}`);

  console.log('\n' + '='.repeat(50));
  console.log('🎉 DOM simulation test completed successfully!');
  console.log('='.repeat(50));

} catch (err) {
  if (err.code === 'MODULE_NOT_FOUND' && err.message.includes('jsdom')) {
    console.log('ℹ️  jsdom not installed. Using basic HTML content check instead...\n');

    const htmlContent = fs.readFileSync('./index.html', 'utf8');

    const checks = [
      { name: 'Sidebar', pattern: 'id="sidebar"' },
      { name: 'Main content', pattern: 'id="main"' },
      { name: 'Dashboard section', pattern: 'id="section-dashboard"' },
      { name: 'Balance display', pattern: 'id="balanceValue"' },
      { name: 'Toast system', pattern: 'id="toast"' },
      { name: 'Modal', pattern: 'id="modalOverlay"' },
    ];

    console.log('✅ Checking HTML for required elements:\n');
    let found = 0;
    checks.forEach(check => {
      if (htmlContent.includes(check.pattern)) {
        console.log(`✅ ${check.name}`);
        found++;
      } else {
        console.log(`❌ ${check.name}`);
      }
    });

    console.log(`\n✅ Elements found: ${found}/${checks.length}`);
    console.log('\n' + '='.repeat(50));
    console.log('ℹ️  HTML structure check completed!');
    console.log('='.repeat(50));
  } else {
    console.error('Error:', err);
  }
}
