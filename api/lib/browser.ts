import { Browser, Page } from 'puppeteer';
import puppeteer, { VanillaPuppeteer } from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
// Apply the stealth plugin
puppeteer.use(StealthPlugin());

type IBrowserInfo = {
    browser: Browser;
    page: Page;
    date: Date;
}
export async function createPuppeteerDefault(options?: Parameters<VanillaPuppeteer['launch']>[0]): Promise<IBrowserInfo> {

    const browser = await puppeteer.launch(options || {
        headless: true,
        userDataDir: '../secs/userData',
    });
    const page = await browser.newPage();
    return {
        browser,
        page,
        date: new Date(),
    }
    //await page.goto('https://bot.sannysoft.com/');

}

const userBrowserCache: Map<string, IBrowserInfo> = new Map();
export async function getOrCreateUserBrowser(userId: string, options?: Parameters<VanillaPuppeteer['launch']>[0]): Promise<IBrowserInfo> {
    const existing = userBrowserCache.get(userId);
    if (existing) return existing;
    const ret = await createPuppeteerDefault(options);
    await ret.page.setViewport({
        width: 1280,
        height: 720,
    })
    userBrowserCache.set(userId, ret);
    return ret;
}

export async function stopUserBrowser(userId: string) {
    const existing = userBrowserCache.get(userId);
    if (!existing) return false;
    await existing.browser.close();
    return true;
}
