import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:960}});
 await page.goto('http://localhost:5173/?project=clean_canvas');await page.waitForSelector('#player-current');
 await page.locator('#scrub').evaluate((element:any)=>{element.value='8';element.dispatchEvent(new Event('input'));});
 await page.waitForFunction(()=>document.querySelector('#player-current')?.textContent==='0:08');
 assert.equal(await page.locator('#player-current').innerText(),'0:08');
 const y=await page.locator('#transport-bar').boundingBox();assert.ok(y&&y.y>850,'Controls are not under timeline');
 assert.equal(await page.locator('#tr-play svg').count(),1);
 await page.locator('#tr-play').click();await page.waitForFunction(()=>document.querySelector('#tr-play')?.getAttribute('aria-label')==='Tạm dừng (Space)');
 await page.locator('#tr-play').click();
 await page.locator('#tr-loop').click();await page.waitForFunction(()=>document.querySelector('#tr-loop')?.getAttribute('aria-pressed')==='true');assert.equal(await page.locator('#tr-loop').getAttribute('aria-pressed'),'true');
 await page.locator('#tr-loop').click();await page.waitForFunction(()=>document.querySelector('#tr-loop')?.getAttribute('aria-pressed')==='false');
 await page.locator('#scene-search').fill('Một cảnh mới');await page.locator('#scene-search').press('Space');
 assert.equal(await page.locator('#tr-play').getAttribute('aria-label'),'Phát (Space)');
 assert.equal(await page.locator('#player-mute').isDisabled(),true);
 await page.locator('#scrub').hover();assert.equal(await page.locator('.player-seek-tooltip').isVisible(),true);
 await page.mouse.move(700,600);await page.screenshot({path:'/Users/log/Documents/pdoom-video/projects/test/out/player-youtube.png'});
 console.log('PASS: seek, SVG playback controls, loop, typing isolation, tooltip and timeline layout');
}finally{await browser.close();}
