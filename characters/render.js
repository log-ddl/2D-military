const { chromium } = require('../app/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');

async function renderSvg(svgPath, outPngPath) {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  });
  const page = await browser.newPage({
    viewport: { width: 1200, height: 800, deviceScaleFactor: 2 },
  });
  const svgContent = fs.readFileSync(svgPath, 'utf8');
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { margin: 0; background: #222; display: flex; align-items: center; justify-content: center; height: 100vh; }
        </style>
      </head>
      <body>
        ${svgContent}
      </body>
    </html>
  `);
  const svgElement = await page.$('svg');
  if (svgElement) {
    await svgElement.screenshot({ path: outPngPath });
  } else {
    await page.screenshot({ path: outPngPath });
  }
  await browser.close();
  console.log('Rendered', outPngPath);
}

const target = process.argv[2] || path.join(__dirname, 'characters.svg');
const out = process.argv[3] || path.join(__dirname, 'characters.svg.png');
renderSvg(target, out);
