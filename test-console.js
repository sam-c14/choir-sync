const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  let hasErrors = false;
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
      hasErrors = true;
    }
  });
  
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
    hasErrors = true;
  });

  try {
    await page.goto('http://localhost:4200', { waitUntil: 'networkidle2', timeout: 10000 });
    if (!hasErrors) console.log('No browser console errors detected.');
  } catch (e) {
    console.log('Failed to load page:', e.message);
  } finally {
    await browser.close();
  }
})();
