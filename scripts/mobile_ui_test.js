// Automated Mobile App & UI/UX Test Suite
// Verifies PWA configuration, touch targets, mobile responsive stylesheets, safe-area insets, and API availability.

const fs = require('fs');
const path = require('path');
const http = require('http');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function run() {
  console.log('\n======================================================');
  console.log('📱 MOBILE APP & UI/UX COMPREHENSIVE AUDIT TEST SUITE');
  console.log('======================================================\n');

  // Test 1: PWA HTML Meta Tags & Mobile Viewport
  console.log('--- Test 1: PWA & Mobile Meta Tags (index.html) ---');
  const indexHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf-8');
  assert(indexHtml.includes('viewport-fit=cover'), 'Viewport includes viewport-fit=cover for iPhone notch and home bar');
  assert(indexHtml.includes('user-scalable=no') || indexHtml.includes('maximum-scale=1.0'), 'Viewport handles mobile zoom boundary correctly');
  assert(indexHtml.includes('rel="manifest" href="/manifest.json"'), 'Manifest link present');
  assert(indexHtml.includes('apple-mobile-web-app-capable'), 'iOS Safari standalone web app mode enabled');
  assert(indexHtml.includes('apple-mobile-web-app-status-bar-style'), 'iOS status bar style defined');

  // Test 2: Manifest JSON Specification
  console.log('\n--- Test 2: PWA Web App Manifest (manifest.json) ---');
  const manifestRaw = fs.readFileSync(path.join(__dirname, '../public/manifest.json'), 'utf-8');
  const manifest = JSON.parse(manifestRaw);
  assert(manifest.display === 'standalone', 'PWA display mode is standalone (removes browser URL bar)');
  assert(manifest.start_url === '/', 'PWA start_url is /');
  assert(manifest.theme_color && manifest.background_color, 'Theme and background colors are defined');
  assert(Array.isArray(manifest.icons) && manifest.icons.length > 0, 'App launcher icons configured in manifest');

  // Test 3: Mobile Responsive CSS & Touch Target Rules
  console.log('\n--- Test 3: Responsive CSS & Touch Affordances (style.css) ---');
  const styleCss = fs.readFileSync(path.join(__dirname, '../public/css/style.css'), 'utf-8');
  assert(styleCss.includes('env(safe-area-inset-top') && styleCss.includes('env(safe-area-inset-bottom'), 'Safe-area CSS environment variables defined');
  assert(styleCss.includes('touch-action: manipulation'), 'Fast tap touch-action: manipulation enabled');
  assert(styleCss.includes('.min-touch-target'), 'Minimum 44px touch target utility defined');
  assert(styleCss.includes('@media (max-width: 640px)'), 'Mobile media query block present');
  assert(styleCss.includes('font-size: 16px !important'), '16px input font size rule present to prevent iOS Safari auto-zoom');
  assert(styleCss.includes('mobile-bottom-sheet'), 'Native mobile bottom-sheet styling present');

  // Test 4: Mobile Touch Targets in Views
  console.log('\n--- Test 4: Mobile Action Buttons in Views ---');
  const foodJs = fs.readFileSync(path.join(__dirname, '../public/js/views/food.js'), 'utf-8');
  assert(foodJs.includes('min-h-[38px]') || foodJs.includes('min-touch-target'), 'FoodView contains mobile touch target sizes');
  assert(!foodJs.includes('w-6 h-6 rounded-lg bg-white border border-slate-200'), 'Tiny 24px food payment toggles removed in favor of comfortable touch targets');

  const billsJs = fs.readFileSync(path.join(__dirname, '../public/js/views/bills.js'), 'utf-8');
  assert(billsJs.includes('min-h-[44px]'), 'BillsView mobile split cards have minimum 44px touch buttons');

  const paymentsJs = fs.readFileSync(path.join(__dirname, '../public/js/views/payments.js'), 'utf-8');
  assert(paymentsJs.includes('min-h-[44px]'), 'PaymentsView review buttons meet 44px touch guidelines');

  const portalJs = fs.readFileSync(path.join(__dirname, '../public/js/views/portal.js'), 'utf-8');
  assert(portalJs.includes('min-h-[48px]'), 'PortalView main payment button has high-affordance 48px touch target');

  // Test 5: Service Worker Cache Version & App Shell Pre-caching
  console.log('\n--- Test 5: Service Worker Cache Consistency (sw.js) ---');
  const swJs = fs.readFileSync(path.join(__dirname, '../public/sw.js'), 'utf-8');
  assert(swJs.includes('flat-app-v8'), 'Service Worker cache updated to v8 for instant asset refresh');
  assert(swJs.includes('/css/style.css') && swJs.includes('/js/app.js'), 'Core mobile scripts and styles pre-cached for offline access');

  // Test 6: HTTP Server Mobile Asset Delivery
  console.log('\n--- Test 6: Live Server Static Asset & Mobile Endpoint Verification ---');
  await new Promise((resolve) => {
    http.get('http://localhost:3000/manifest.json', (res) => {
      assert(res.statusCode === 200, 'Live server serves manifest.json with HTTP 200');
      assert(res.headers['content-type']?.includes('json'), 'manifest.json has application/json content-type');
      resolve();
    }).on('error', (err) => {
      assert(false, `Live server connection failed: ${err.message}`);
      resolve();
    });
  });

  await new Promise((resolve) => {
    http.get('http://localhost:3000/css/style.css', (res) => {
      assert(res.statusCode === 200, 'Live server serves style.css with HTTP 200');
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        assert(data.includes('min-touch-target'), 'Live style.css serves mobile touch target rules');
        resolve();
      });
    }).on('error', (err) => {
      assert(false, `Live server connection failed: ${err.message}`);
      resolve();
    });
  });

  console.log('\n======================================================');
  console.log(`RESULTS: ${passedTests} / ${totalTests} tests passed`);
  if (passedTests === totalTests) {
    console.log('🎉 ALL MOBILE APP & UI/UX AUDIT TESTS PASSED 100%!');
  } else {
    console.error('⚠️ SOME TESTS FAILED. PLEASE REVIEW.');
    process.exit(1);
  }
  console.log('======================================================\n');
}

run();
