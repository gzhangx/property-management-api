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



const driverConfig = {
    pi: {
        headless: true,
        //apt-get install chromium -y on rpy
        //sudo apt install chromium-browser chromium-codecs-ffmpeg
        // in pi, use pupp 10.0.0
        //executablePath: '/usr/bin/chromium-browser',        
        
    },
}


export function getPuppeterMainConfig() {
    const PuppBrowserUserDataDir = process.env.PuppBrowserUserDataDir;
    if (!process.env.PuppBrowserExecPath) {
        throw 'Puppter env PuppBrowserExecPath not set';
    }
    if (!PuppBrowserUserDataDir) {
        throw 'Puppter env PuppBrowserUserDataDir not set';
    }
    const PuppBrowserDownloadDir = process.env.PuppBrowserDownloadDir
    if (!PuppBrowserDownloadDir) {
        throw 'Puppter env PuppBrowserDownloadDir not set';
    }
    return {
        PuppBrowserUserDataDir,
        PuppBrowserExecPath: process.env.PuppBrowserExecPath,
        PuppBrowserDownloadDir,
    };
}

const getCfg = () => {
    
    const pcfg = getPuppeterMainConfig();
    const standardConfig = {
        headless: false,
        executablePath: pcfg.PuppBrowserExecPath,
        args: [
            '--no-sandbox', '--disable-setuid-sandbox',
            '--disable-extensions', // Disable extensions for cleaner automation
            `--user-data-dir=${pcfg.PuppBrowserUserDataDir}`, // Use a custom user data directory for the profile
        ],
        defaultViewport: {
            width: 1224,
            height: 768,
            isMobile: false,
        }
        //slowMo: 250 // slow down by 250ms
    };
    if (process.env.PI) {
        return Object.assign({}, standardConfig, driverConfig.pi);
    }
    return standardConfig;
}

export async function createPuppeteerDefault(options?: Parameters<VanillaPuppeteer['launch']>[0]): Promise<IBrowserInfo> {

    const pcfg = getPuppeterMainConfig();
    const browser = await puppeteer.launch(options || {
        //headless: true,
        ...getCfg(),
        userDataDir: pcfg.PuppBrowserUserDataDir,
    });

    const client = await browser.target().createCDPSession();
    await client.send('Browser.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath:  pcfg.PuppBrowserDownloadDir,
    })

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
