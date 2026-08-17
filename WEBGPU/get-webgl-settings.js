import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function extractWebGLSettings() {
    const browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: 'new',
        args: ['--no-sandbox', '--ignore-gpu-blocklist'],
        defaultViewport: { width: 1280, height: 720 }
    });

    const page = await browser.newPage();
    console.log('Navigating to WebGL on port 8000...');
    await page.goto('http://localhost:8000/Wanderlust/webgl/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    const settings = await page.evaluate(() => {
        return {
            params: typeof window.params !== 'undefined' ? window.params : null,
            timePhase: typeof window.timePhase !== 'undefined' ? window.timePhase : null,
            envConfigs: typeof window.envConfigs !== 'undefined' ? window.envConfigs : null,
            localStorage: JSON.stringify(window.localStorage),
            scene: {
                background: window.scene?.background ? '#' + window.scene.background.getHexString() : null,
                fog: window.scene?.fog ? {
                    color: '#' + window.scene.fog.color.getHexString(),
                    near: window.scene.fog.near,
                    far: window.scene.fog.far
                } : null
            }
        };
    });

    console.log('EXTRACTED SETTINGS:', JSON.stringify(settings, null, 2));
    await browser.close();
}

extractWebGLSettings();
