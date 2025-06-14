// Import the net module for TCP sockets and 'events' for EventEmitter
//"C:\Program Files\Mozilla Firefox\firefox.exe" --marionette --profile d:\temp\testpf
//"D:\gecko-dev\obj-x86_64-pc-windows-msvc\dist\bin\firefox.exe" --marionette --remote-debugging-port=0 --no-remote --profile d:\temp\testpf -attach-console

// C: \Program Files\nodejs\node.exe--experimental - network - inspection.\test.js
// Downloads will be saved to: D: \temp\testpf\downloads
// Browser user data will be stored in: D: \temp\testpf
// opts
// { executablePath: 'D:/gecko-dev/obj-x86_64-pc-windows-msvc/dist/bin/firefox.exe', args: Array(8), handleSIGHUP: true, handleSIGTERM: true, handleSIGINT: true, … }
// args: (8)['--wait-for-browser', 'about:blank', '--user-data-dir=D:\\temp\\testpf', '--disable-extensions', '--no-sandbox', '--remote-debugging-port=0', '--profile', 'D:\\temp\\systemp\\temp\\puppeteer_dev_firefox_profile-XqdByA']
// dumpio: false
// env: { ACSvcPort: '17532', ALLUSERSPROFILE: 'C:\\ProgramData', APPDATA: 'C:\\Users\\gzhan\\AppData\\Roaming', APPLICATION_INSIGHTS_NO_STATSBEAT: 'true', CHROME_CRASHPAD_PIPE_NAME: '\\\\.\\pipe\\crashpad_1784_OVDZGQNJFSHKICQD', … }
// executablePath: 'D:/gecko-dev/obj-x86_64-pc-windows-msvc/dist/bin/firefox.exe'
// handleSIGHUP: true
// handleSIGINT: true
// handleSIGTERM: true
// onExit: async () => { \n            await this.cleanUserDataDir(launchArgs.userDataDir, { \n                isTemp: launchArgs.isTempUserDataDir, \n }); \n }
// pipe: false


import { WebSocket} from 'ws';
import * as net from 'net';
import { EventEmitter } from 'events';
import { sleep } from '@gzhangx/googleapi/lib/util';
import { writeFileSync } from 'fs';
import { getPuppeterMainConfig } from './browser';
import { ChildProcessByStdio, spawn } from 'child_process';
import { Readable } from 'stream';

// --- Type Definitions for Marionette Protocol ---

/**
 * Represents the initial capabilities object sent by Marionette upon connection.
 */
interface MarionetteCapabilities {
    applicationType: string;
    marionetteProtocol: number;
    [key: string]: any; // Allow other properties
}

/**
 * Represents a standard Marionette command message.
 * [type (0 for command), message ID, command name, parameters]
 */
type MarionetteCommandMessage = [0, number, string, object];

/**
 * Represents a standard Marionette response message.
 * [type (1 for response), message ID, error object (or null), result object (or null)]
 */
type MarionetteResponseMessage = [1, number, object | null, any];

/**
 * Type for any Marionette message received.
 */
type AnyMarionetteMessage = MarionetteCapabilities | MarionetteCommandMessage | MarionetteResponseMessage;

/**
 * Structure of an element reference returned by WebDriver FindElement commands.
 */
interface ElementReference {
    value: {
        'element-6066-11e4-a52e-4f735466cecf': string;
    };
}

/**
 * Capabilities object for a new WebDriver session.
 */
interface SessionCapabilities {
    alwaysMatch: {
        browserName: string;
        'moz:firefoxOptions'?: {
            args?: string[];
            prefs?: {
                [key: string]: string | number | boolean;
            };
            [key: string]: any;
        };
        [key: string]: any;
    };
    [key: string]: any;
}

// --- MarionetteClient Class ---
// This class handles the low-level TCP communication and Marionette protocol framing.
class MarionetteClient extends EventEmitter {
    private host: string;
    private port: number;
    private socket: net.Socket | null = null;
    private messageId: number = 1; // Unique ID for each command
    private responsePromises: Map<number, { resolve: (value: any) => void; reject: (reason?: any) => void }> = new Map(); // Map to store promises for responses by messageId
    private receiveBuffer: Buffer = Buffer.alloc(0); // Buffer for incoming data
    private expectedLength: number = -1; // -1 means we're waiting for the length prefix
    private lengthString: string = ''; // Buffer to build the length string

    /**
     * @param {string} host - The host where Marionette is listening (e.g., '127.0.0.1').
     * @param {number} port - The port where Marionette is listening (e.g., 2828).
     */
    constructor(host: string, port: number) {
        super();
        this.host = host;
        this.port = port;
    }

    /**
     * Establishes a TCP connection to the Marionette server.
     * @returns {Promise<void>} Resolves when connected, rejects on error.
     */
    public connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.socket = new net.Socket();

            // Handle incoming data
            this.socket.on('data', (data: Buffer) => {
                // console.log(`[MarionetteClient] Raw incoming data (${data.length} bytes):`, data.toString('utf8').substring(0, 50) + '...');
                this.receiveBuffer = Buffer.concat([this.receiveBuffer, data]);
                this._processBuffer(); // Process the buffer for complete messages
            });

            // Handle connection established
            this.socket.on('connect', () => {
                console.log(`[MarionetteClient] Connected to ${this.host}:${this.port}`);
                // Resolve connection immediately after TCP handshake
                resolve();
            });

            // Handle errors
            this.socket.on('error', (err: Error) => {
                console.error(`[MarionetteClient] Socket error: ${err.message}`);
                this.emit('error', err);
                reject(err);
            });

            // Handle socket closure
            this.socket.on('close', () => {
                console.log('[MarionetteClient] Connection closed.');
                this.emit('close');
            });

            this.socket.connect(this.port, this.host);
        });
    }

    /**
     * Sends a Marionette command and awaits its response.
     * @param {string} commandName - The name of the Marionette command (e.g., 'WebDriver:NewSession').
     * @param {object} params - The parameters for the command.
     * @returns {Promise<any>} Resolves with the command result, rejects on error.
     */
    public send<T = any>(commandName: string, params: object = {}): Promise<T> {
        if (!this.socket || this.socket.connecting || this.socket.destroyed) {
            return Promise.reject(new Error('Not connected to Marionette. Call connect() first.'));
        }

        const currentMessageId: number = this.messageId++;
        const command: MarionetteCommandMessage = [0, currentMessageId, commandName, params]; // type 0 for command
        const jsonCommand: string = JSON.stringify(command);
        const length: number = Buffer.byteLength(jsonCommand, 'utf8');

        // Marionette protocol: length prefix is a string followed by a colon
        const lengthPrefix: string = `${length}:`;

        // Concatenate length prefix and JSON payload
        const fullMessage: Buffer = Buffer.from(lengthPrefix + jsonCommand, 'utf8');

        console.log(`[MarionetteClient] Sending command (ID: ${currentMessageId}): ${lengthPrefix}${jsonCommand}`);

        // Store a promise resolver for this message ID
        //let resolveResponse: (value: T) => void;
        //let rejectResponse: (reason?: any) => void;
        const responsePromise: Promise<T> = new Promise((resolve, reject) => {
            //resolveResponse = resolve;
            //rejectResponse = reject;
            this.responsePromises.set(currentMessageId, { resolve, reject });
        });
        //this.responsePromises.set(currentMessageId, { resolve: resolveResponse, reject: rejectResponse });

        this.socket.write(fullMessage);
        return responsePromise;
    }

    /**
     * Processes the incoming data buffer to extract complete Marionette messages.
     * This method is called whenever new data arrives.
     */
    private _processBuffer(): void {
        while (true) {
            // Step 1: Read the length prefix (string until ':') if not already read
            if (this.expectedLength === -1) {
                const colonIndex: number = this.receiveBuffer.indexOf(':');
                if (colonIndex !== -1) {
                    this.lengthString = this.receiveBuffer.slice(0, colonIndex).toString('utf8');
                    this.expectedLength = parseInt(this.lengthString, 10);

                    if (isNaN(this.expectedLength)) {
                        console.error(`[MarionetteClient] Invalid length prefix received: "${this.lengthString}"`);
                        this.emit('error', new Error(`Invalid length prefix: "${this.lengthString}"`));
                        this.disconnect();
                        return; // Stop processing due to error
                    }

                    // Remove length string and colon from buffer
                    this.receiveBuffer = this.receiveBuffer.slice(colonIndex + 1);
                    // console.log(`[MarionetteClient] Read length prefix: "${this.lengthString}", expectedLength: ${this.expectedLength}`);
                } else {
                    // Not enough data for length prefix yet, or colon not found
                    break;
                }
            }

            // Step 2: Read the JSON payload
            if (this.expectedLength !== -1 && this.receiveBuffer.length >= this.expectedLength) {
                const jsonPayload: string = this.receiveBuffer.slice(0, this.expectedLength).toString('utf8');
                this.receiveBuffer = this.receiveBuffer.slice(this.expectedLength); // Remove processed payload
                this.expectedLength = -1; // Reset for the next message
                this.lengthString = ''; // Reset length string for next message

                try {
                    const message: AnyMarionetteMessage = JSON.parse(jsonPayload);
                    this._handleMessage(message); // Process the parsed message
                } catch (e: any) {
                    console.error(`[MarionetteClient] Failed to parse JSON: ${e.message}, Payload: ${jsonPayload}`);
                    this.emit('error', new Error(`JSON parsing failed: ${e.message} for payload: ${jsonPayload}`));
                    this.disconnect(); // Disconnect to prevent further errors on corrupted stream
                    break; // Stop processing this buffer as it's likely corrupted
                }
            } else {
                break; // Not enough data for the full payload yet
            }
        }
    }

    /**
     * Handles a parsed Marionette message (command or response).
     * @param {AnyMarionetteMessage} message - The parsed JSON (could be array for command/response or object for handshake).
     */
    private _handleMessage(message: AnyMarionetteMessage): void {
        // Marionette sends an initial capabilities object (not an array) upon connection.
        // We handle this first, and all subsequent messages are expected to be arrays.
        if (Array.isArray(message) && message.length === 4) {
            // It's a standard Marionette command or response array
            const [type, messageId, errorOrCommand, resultOrParams] = message as MarionetteResponseMessage | MarionetteCommandMessage;

            if (type === 1) { // It's a response to one of our commands
                const promiseEntry = this.responsePromises.get(messageId);
                if (promiseEntry) {
                    this.responsePromises.delete(messageId); // Remove the promise after handling

                    if (errorOrCommand !== null) {
                        // This means 'errorOrCommand' is an error object (Marionette error)
                        console.error(`[MarionetteClient] Received error response (ID: ${messageId}):`, errorOrCommand);
                        promiseEntry.reject(errorOrCommand);
                    } else {
                        // This means 'resultOrParams' is the successful result
                        console.log(`[MarionetteClient] Received success response (ID: ${messageId}):`, resultOrParams);
                        promiseEntry.resolve(resultOrParams);
                    }
                } else {
                    console.warn(`[MarionetteClient] Received unhandled response for ID: ${messageId}`);
                }
            } else if (type === 0) { // It's a command from the server to us
                // For this client, we primarily expect responses from our sent commands.
                // If Marionette sends a command to us, we'd handle it here if necessary.
                console.log(`[MarionetteClient] Received unexpected command from server (ID: ${messageId}):`, errorOrCommand, resultOrParams);
            } else { // Unknown array type
                console.warn(`[MarionetteClient] Received message with unknown type (${type}) (ID: ${messageId}):`, message);
            }
        } else if (typeof message === 'object' && message !== null) {
            // This is likely the initial capabilities object sent by Marionette upon connection.
            console.log('[MarionetteClient] Initial Marionette capabilities object received (not a response):', message);
            // No promise to resolve for this, as it's an unsolicited message.
        } else {
            // Malformed message (e.g., not an array of 4, not a valid object)
            console.error(`[MarionetteClient] Received malformed Marionette message:`, message);
            this.emit('error', new Error('Malformed Marionette message received.'));
            this.disconnect();
        }
    }

    /**
     * Disconnects the TCP socket.
     */
    public disconnect(): void {
        if (this.socket && !this.socket.destroyed) {
            this.socket.end();
            this.socket.destroy(); // Ensure socket is fully closed
            this.socket = null;
            console.log('[MarionetteClient] Disconnected.');
        }
    }
}

// Helper to extract the element ID from a WebDriver response
function getElementId(response: ElementReference): string {
    // The W3C WebDriver spec uses a specific key to identify element references.
    // This key is 'element-6066-11e4-a52e-4f735466cecf'
    return response.value['element-6066-11e4-a52e-4f735466cecf'];
}

type FindEementUsing = 'css selector' | 'id' | 'name' | 'xpath' | 'link text' | 'partial link text';


async function launchFirefoxAndConnectBiDi() {

    const cfg = getPuppeterMainConfig();
    

    // Arguments to launch Firefox with remote debugging enabled and a temporary profile
    const firefoxArgs = [
        '--marionette',
        '--profile', cfg.PuppBrowserUserDataDir,
        `--remote-debugging-port=0`, // Allows remote connections            
        // Use --no-remote to prevent interference with existing Firefox instances
        '--no-remote',
        // '-headless', // Uncomment to run in headless mode
    ];

    const firefoxProcess = spawn(cfg.PuppBrowserExecPath, firefoxArgs, {
        stdio: ['ignore', 'pipe', 'pipe'] // Capture stdout and stderr
    });

    let outputBuffer = '';
    const bidiUrlPromise = new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Timed out waiting for BiDi WebSocket URL from Firefox.'));
        }, 30000); // 30 seconds timeout

        firefoxProcess.stderr.on('data', (data) => {
            outputBuffer += data.toString();
            //console.log('frombrowser::::'+data.toString())
            // Firefox typically outputs the BiDi URL to stderr
            const match = outputBuffer.match(/WebDriver BiDi listening on (ws:\/\/[a-z0-9.]+:\d+)/);
            if (match) {
                clearTimeout(timeout);
                resolve(match[1]);
            }
        });

        //firefoxProcess.stdout.on('data', (data) => {                
        //console.log('frombrowserstdut->::::' + data.toString())                
        //});

        firefoxProcess.on('error', (err) => {
            clearTimeout(timeout);
            reject(new Error(`Failed to start Firefox process: ${err.message}. Is '${cfg.PuppBrowserExecPath}' correct?`));
        });

        firefoxProcess.on('close', (code) => {
            if (!outputBuffer.includes('WebDriver BiDi listening on')) {
                clearTimeout(timeout);
                reject(new Error(`Firefox closed unexpectedly before BiDi URL was found (Exit code: ${code}). Output:\n${outputBuffer}`));
            }
        });
    });

    const bidiUrl = await bidiUrlPromise;
    console.log(`WebDriver BiDi URL found: ${bidiUrl}`);

    // --- Connect to BiDi WebSocket ---
    console.log('Connecting to BiDi WebSocket...');
    const ws = new WebSocket(bidiUrl + '/session', {
        followRedirects: true,
        perMessageDeflate: false,
        allowSynchronousEvents: false,
        maxPayload: 256 * 1024 * 1024, // 256Mb
        headers: {
            //'User-Agent': `Puppeteer ${version_js_1.packageVersion}`,
            //...headers,
        },
    });

    await new Promise<void>((resolve, reject) => {
        ws.onopen = () => {
            console.log('WebSocket connection established.');
            resolve();
        };
        ws.onerror = (error) => {
            reject(new Error(`WebSocket error: ${error.message}`));
        };
        // ws.on('message', data => {
        //     const jsObj = JSON.parse(data.toString());
        //     const { type, method, params } = jsObj;
        //     if (type === 'event' && (method === 'network.beforeRequestSent')) {
        //         console.log('ws msssgag: ' + method + ' ' + params.request.method, params.isBlocked, params.request.request);
        //         //'context', 'isBlocked', 'navigation', 'redirectCount', 'request', 'timestamp', 'response'
        //         if (params.request.url.indexOf('transactions/download') > 0) {
        //             console.log('NOT XCONTINEUDDD!!!!!!!!!!!!!!!!!!')
        //             const pr = params.request as { headers: any[], url: string; method: string; };
        //             const headers = pr.headers.reduce((acc, h) => {
        //                 acc[h.name] = h.value.value;
        //                 return acc;
        //             }, {});
        //             console.log('ws msssgag: ' + method + ' ' + params.request.method + ' ' + params.request.url, JSON.stringify(params, null, 2))
        //             fetch(pr.url, {
        //                 method: pr.method,
        //                 headers,
        //                 body: JSON.stringify({ "keyword": "", "documentFormat": "CSV", "displayContentName": "DATE", "startRange": "2025-05-10", "endRange": "2025-06-13" })
        //             }).then(async r => {
        //                 console.log('r', r);
        //                 console.log('r', await r.text());
        //             })
        //         } else if (params.isBlocked) {

        //             try {
        //                 sendCommand('network.continueRequest', params.request).catch(err => {
        //                     console.log('!!!!!!!!!!!!!!!!!!!!error continue request', params.request.request, params.request)
        //                 })
        //             } catch (err) {
        //                 console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! continereq err', err)
        //             }

        //         }
        //     }
        // })
        ws.onclose = () => {
            console.log('WebSocket connection closed.');
        };
    });

    // --- Send BiDi Commands ---
    let messageId = 1;
    const sendCommand = (method: string, params: any) => {
        const id = messageId++;
        const message = JSON.stringify({ id, method, params });
        console.log(`Sending BiDi command (ID: ${id}): ${method}`);
        ws.send(message);
        return new Promise<any>((resolve, reject) => {
            const listener = (data: Buffer) => {
                const response = JSON.parse(data.toString());
                //console.log('debugremove bid resposne sendcmd rsp', response)
                if (response.id === id) {
                    if (response.error) {
                        reject(new Error(`BiDi command error (ID: ${id}): ${response.error.message || JSON.stringify(response.error)}`));
                    } else {
                        resolve(response.result);
                    }
                    ws.off('message', listener); // Remove listener after response
                }
            };
            ws.on('message', listener);
        });
    };


    const capabilities = {
        firstMatch: undefined,
        alwaysMatch: {
            acceptInsecureCerts: false,
            unhandledPromptBehavior: {
                default: "ignore",
            },
            webSocketUrl: true,
            "goog:prerenderingDisabled": true,
        },
    };
    //don't do session here since we will be using marineette session
    const res = await sendCommand('session.new', { capabilities })

    // 1. Create a new browsing context (tab)
    console.log('Creating a new browsing context (tab)...');
    const newContextResult = await sendCommand('browsingContext.create', {
        type: 'tab'
    });
    const contextId = newContextResult.context;
    console.log(`New browsing context created: ${contextId}`);

        
    // async function gotoUrl(url: string) {
    //     return await sendCommand('browsingContext.navigate', {
    //         context: contextId,
    //         url,
    //         wait: 'complete' // Wait until the page is fully loaded
    //     });
    // }

    // async function queryOneSelector(value: string) {
    //     return await sendCommand('browsingContext.locateNodes', {
    //         context: contextId,
    //         locator: {
    //             type: 'css',
    //             value,
    //         }
    //     });
    // }

    async function doSessionSubcribeNetBeforeRequestSent() {
        await sendCommand('session.subscribe', {
            events: [
                //'browsingContext.load',
                //'browsingContext.domContentLoaded',
                //'network.responseCompleted',
                'network.beforeRequestSent',
                // You can add more events like:
                // 'browsingContext.contextCreated',
                // 'browsingContext.contextDestroyed',
                // 'log.entryAdded', // For console logs
                // 'network.responseCompleted', // For network requests
            ]
        });
    }
    function shutdown() {
        if (ws) {
            console.log('Closing WebSocket connection...');
            ws.close();
        }
        if (firefoxProcess) {
            console.log('Terminating Firefox process...');
            firefoxProcess.kill(); // Send SIGTERM to the process
        }
    }


    return {
        shutdown,
        sendCommand,
        doSessionSubcribeNetBeforeRequestSent,
        ws,
        contextId,
    }

    //console.log('===============> added intercept', addinterceptpres)
    // 2. Navigate to Google.com
        
    //const gurlres = await gotoUrl('https://www.google.com');
        


    //https://www.w3.org/TR/webdriver-bidi/#cddl-type-browsingcontextlocator        
    //const r = await queryOneSelector('input[id="password"]')        

    //await new Promise(resolve => setTimeout(resolve, 20000));
    //const addinterceptpres = await sendCommand('network.addIntercept', {
    //    phases: ['beforeRequestSent'], //'responseStarted', 
    //    contexts: [contextId],
    //    urlPatterns: []
    //})

    // Optional: Keep browser open for a few seconds before closing        
}

// xpath: //input[@type='text'] or //div[@id='myContainer']/button
async function createGeckoDriver() {
    const cfg = getPuppeterMainConfig();


    // Arguments to launch Firefox with remote debugging enabled and a temporary profile
    const firefoxArgs = [
        '--marionette',
        '--profile', cfg.PuppBrowserUserDataDir,
        `--remote-debugging-port=0`, // Allows remote connections            
        // Use --no-remote to prevent interference with existing Firefox instances
        '--no-remote',
        // '-headless', // Uncomment to run in headless mode
    ];

    const firefoxProcess = spawn(cfg.PuppBrowserExecPath, firefoxArgs, {
        stdio: ['ignore', 'pipe', 'pipe'] // Capture stdout and stderr
    });

    const client = new MarionetteClient('127.0.0.1', 2828); // Default Marionette port    
    
    await client.connect(); // Wait for connection
    // 1. Create a new WebDriver session within Marionette
    console.log('\n--- Creating new session ---');
    const sessionCapabilities: SessionCapabilities = {
        alwaysMatch: {
            browserName: 'firefox',
            'moz:firefoxOptions': {                
                // args: ['-headless']                
            }
        }
    };
    const newSessionCommand = {
        capabilities: sessionCapabilities
    };
    const sessionResponse: { sessionId: string } = await client.send('WebDriver:NewSession', newSessionCommand);
    const sessionId: string = sessionResponse.sessionId;

    console.log(`Session created with ID: ${sessionId}`);
    async function findElement(type: FindEementUsing, value: string, timeout: number = 15000): Promise<ElementReference> {
        while (true) {
            try {
                const findButtonResponse: ElementReference = await client.send('WebDriver:FindElement', {
                    sessionId: sessionId,
                    using: type,
                    value,
                });
                return findButtonResponse;
            } catch (err) {
                await sleep(500);
                timeout -= 500;
                if (timeout > 0) continue;
                throw err;
            }
        }
    }
    async function findElements(type: FindEementUsing, value: string, timeout: number = 15000): Promise<ElementReference[]> {
        while (true) {
            try {
                const findButtonResponse: ElementReference[] = await client.send('WebDriver:FindElement', {
                    sessionId: sessionId,
                    using: type,
                    value,
                });
                return findButtonResponse;
            } catch (err) {
                await sleep(500);
                timeout -= 500;
                if (timeout > 0) continue;
                throw err;
            }
        }
    }
    const sendKeys = async (ele: ElementReference, text: string) => {
        await client.send('WebDriver:ElementSendKeys', {
            sessionId: sessionId,
            id: getElementId(ele),
            text,
        });
    };
    async function sendClick(ele: ElementReference) {
        await client.send('WebDriver:ElementClick', {
            sessionId: sessionId,
            id: getElementId(ele),
        });
    };

    async function sendMouseActions(x: number, y: number) {
        console.log('\n--- Moving mouse and clicking at coordinates (e.g., 200, 200) ---');
        // Define a sequence of actions: move, pointer down, pointer up
        const actionsPayload = {
            sessionId,
            actions: [
                {
                    type: 'pointer', // Indicates a pointer input source (mouse, touch, pen)
                    id: 'mouse1',    // A unique ID for this input source
                    parameters: { pointerType: 'mouse' }, // Specify it's a mouse
                    actions: [
                        { type: 'pointerMove', duration: 100, x, y }, // Move to (200, 200) relative to viewport
                        { type: 'pointerDown', button: 0 }, // Left mouse button (0 for left, 1 for middle, 2 for right)
                        { type: 'pointerUp', button: 0 }    // Release left mouse button
                    ]
                }
            ]
        };
        await client.send('WebDriver:PerformActions', actionsPayload);
        // It's good practice to release actions after using them to reset input state
        await client.send('WebDriver:ReleaseActions', { sessionId: sessionId });
    }


    return {
        sessionId,
        goto: async (url: string) => await client.send('WebDriver:Navigate', { url, sessionId: sessionId }),
        findElement,
        findElements,
        sendKeys,
        sendClick,
        findElementAndSendKeys: async (type: FindEementUsing, value: string, text: string, timeout: number = 15000) => {
            const ele = await findElement(type, value, timeout);
            await sendKeys(ele, text);
        },
        findElementAndClick: async (type: FindEementUsing, value: string, timeout: number = 15000) => {
            const ele = await findElement(type, value, timeout);
            await sendClick(ele);
        },
        deleteSession: async () => {
            // 7. Delete the session (close the browser)
            console.log('\n--- Deleting session ---');
            await client.send('WebDriver:DeleteSession', { sessionId: sessionId });
            console.log('Session deleted.');
        },
        screenShoot: async () => {
            const screenshotBase64: {
                value: string;
            } = await client.send('WebDriver:TakeScreenshot', { sessionId: sessionId });
            const screenshotBuffer: Buffer = Buffer.from(screenshotBase64.value, 'base64');
            //const screenshotFileName: string = `screenshot-${Date.now()}.png`;
            //fs.writeFileSync(screenshotFileName, screenshotBuffer);  
            return screenshotBuffer;
        },
        sendMouseActions,
        disconnect: () => client.disconnect(),
        shutdown: () => firefoxProcess.kill(),
    };
     
}
// --- Example Usage ---
export async function testtestmain(ppp: string): Promise<void> {
    

    const clk = await createGeckoDriver();
    try {
        
        await clk.goto('https://www.citi.com/');
        console.log('Navigated successfully.');

        // Add a small delay to ensure the page is fully loaded and elements are interactive
        //await new Promise(resolve => setTimeout(resolve, 2000));

        let ele = await clk.findElement('css selector', 'input[id="password"]');
        await clk.sendKeys(ele, ppp);
        ele = await clk.findElement('css selector', 'button[id="signInBtn"]');
        await clk.sendClick(ele);

        await clk.findElementAndClick('css selector', 'button[id="bankAccountSelector0TileBody"]');
        await clk.findElementAndClick('css selector', 'div[aria-label="Export transactions"]');

        await clk.findElementAndClick('xpath', '//button[text()="Export"]');
        const buf = await clk.screenShoot();
        writeFileSync('d://temp//testsc.png', buf);        
        
        
        // --- Demonstrating different locator strategies ---

        
            // 6. Get the page title (after search, it should reflect the search query)
            //console.log('\n--- Getting page title after search ---');
            //const titleResponse: string = await client.send('WebDriver:GetTitle', { sessionId: sessionId });
            
        clk.shutdown();

    } catch (error: any) {
        console.error('\n--- Automation Error ---');
        console.error('An error occurred during Marionette automation:', error);
    } 
}


