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


const commonConfig = {
    defaultViewport: {
        width: 1224,
        height: 768,
        isMobile: false,
    }
};

const driverConfig = {
    pi: {
        headless: true,
        executablePath: '/usr/bin/chromium-browser',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        ...commonConfig
    },
}


const  getCfg = () => {
        if (process.env.PI) {
            return driverConfig.pi;
        }
        return {
            headless: false,
            ...commonConfig,
            //slowMo: 250 // slow down by 250ms
        }
    }

export async function createPuppeteerDefault(options?: Parameters<VanillaPuppeteer['launch']>[0]): Promise<IBrowserInfo> {

    const browser = await puppeteer.launch(options || {
        //headless: true,
        ...getCfg(),
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
