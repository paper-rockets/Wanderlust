import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function diagnoseDev() {
    const browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: 'new',
        args: [
            '--enable-unsafe-webgpu',
            '--use-angle=d3d11',
            '--enable-features=Vulkan,DefaultANGLEVulkan,VulkanFromANGLE',
            '--ignore-gpu-blocklist',
            '--no-sandbox'
        ],
        defaultViewport: { width: 1280, height: 720 }
    });

    const page = await browser.newPage();

    page.on('console', msg => {
        console.log(`[CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
    });

    page.on('pageerror', err => {
        console.log(`[PAGE ERROR]`, err.stack || err.message);
    });

    console.log('Navigating to http://localhost:3000/Wanderlust/ ...');
    await page.goto('http://localhost:3000/Wanderlust/', { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 2000));

    const evalResult = await page.evaluate(() => {
        return {
            fps: document.getElementById('fps-counter')?.innerText,
            biome: document.getElementById('biome-label')?.innerText,
            errorsOnWindow: window.__lastError || null
        };
    });
    console.log('Eval Result:', evalResult);

    await page.screenshot({ path: 'screenshot_dev_status.png' });
    await browser.close();
}

diagnoseDev();
