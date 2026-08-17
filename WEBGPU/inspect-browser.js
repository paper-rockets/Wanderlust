import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function verifyAll() {
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

    console.log('Navigating to WebGPU build...');
    await page.goto('http://localhost:3000/Wanderlust/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 3000));

    // Capture Day Ocean
    await page.screenshot({ path: 'screenshot_ocean_day.png' });
    console.log('Saved screenshot_ocean_day.png');

    // Switch to Golden Hour
    await page.evaluate(() => {
        const timeBtn = document.getElementById('time-toggle');
        if (timeBtn) timeBtn.click();
    });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'screenshot_ocean_goldenhour.png' });
    console.log('Saved screenshot_ocean_goldenhour.png');

    // Teleport to Desert Dunes
    console.log('Teleporting to Desert Dunes in Golden Hour...');
    await page.evaluate(() => {
        if (typeof window.teleportToBiome === 'function') {
            window.teleportToBiome('Desert Dunes');
        }
    });
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: 'screenshot_desert_sparkle.png' });
    console.log('Saved screenshot_desert_sparkle.png');

    await browser.close();
    console.log('Verification finished.');
}

verifyAll();
