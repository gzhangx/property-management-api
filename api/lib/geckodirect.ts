// Import the net module for TCP sockets and 'events' for EventEmitter
//"C:\Program Files\Mozilla Firefox\firefox.exe" --marionette --profile d:\temp\testpf
import * as net from 'net';
import { EventEmitter } from 'events';

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

// --- Example Usage ---
async function main(): Promise<void> {
    const client = new MarionetteClient('127.0.0.1', 2828); // Default Marionette port

    try {
        await client.connect(); // Wait for connection

        // 1. Create a new WebDriver session within Marionette
        console.log('\n--- Creating new session ---');
        const sessionCapabilities: SessionCapabilities = {
            alwaysMatch: {
                browserName: 'firefox',
                'moz:firefoxOptions': {
                    // You can add specific Firefox options here if needed, e.g., headless
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

        // 2. Navigate to Google
        console.log('\n--- Navigating to google.com ---');
        await client.send('WebDriver:Navigate', { url: 'https://www.google.com', sessionId: sessionId });
        console.log('Navigated successfully.');

        // Add a small delay to ensure the page is fully loaded and elements are interactive
        //await new Promise(resolve => setTimeout(resolve, 2000));

        // --- Demonstrating different locator strategies ---

        // Example A: Find element by Name
        console.log('\n--- Finding element by Name (for search input) ---');
        const findByNameResponse: ElementReference = await client.send('WebDriver:FindElement', {
            sessionId: sessionId,
            using: 'name',
            value: 'q' // Google search input's name attribute
        });
        const searchInputIdByName: string = getElementId(findByNameResponse);
        console.log(`Found search input by Name with ID: ${searchInputIdByName}`);

        // Example B: Find element by ID
        console.log('\n--- Finding element by ID (for search input) ---');
        // Google's search input often has an ID like 'APjFqb' or similar, though it can change.
        // Using a common one for demonstration.
        const findByIdResponse: ElementReference = await client.send('WebDriver:FindElement', {
            sessionId: sessionId,
            using: 'id',
            value: 'APjFqb' // Common ID for Google search input
        });
        const searchInputIdById: string = getElementId(findByIdResponse);
        console.log(`Found search input by ID with ID: ${searchInputIdById}`);

        // Example C: Find element by CSS Selector (for search input)
        console.log('\n--- Finding element by CSS Selector (for search input) ---');
        // This targets an <input> element with class 'gLFyf'.
        // If you specifically wanted a <textarea> with this class, use 'textarea.gLFyf'.
        const findByCssResponse: ElementReference = await client.send('WebDriver:FindElement', {
            sessionId: sessionId,
            using: 'css selector',
            value: 'textarea.gLFyf' // Common CSS selector for Google search input
        });
        const searchInputIdByCss: string = getElementId(findByCssResponse);
        console.log(`Found search input by CSS Selector with ID: ${searchInputIdByCss}`);

        // --- Continuing with typing and clicking using one of the found elements ---
        // We'll use the element found by CSS selector for the subsequent actions.

        // 3. Type text into the search input field
        console.log('\n--- Typing "Marionette automation" into search field (using CSS selector found element) ---');
        const textToType: string = 'Marionette automation';
        await client.send('WebDriver:ElementSendKeys', {
            sessionId: sessionId,
            id: searchInputIdByCss, // Use the element ID found by CSS selector
            text: textToType
        });
        console.log(`Typed "${textToType}" into the search field.`);

        // Add another delay to see the typed text
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 4. Find the Google Search button using CSS selector
        console.log('\n--- Finding Google Search button by CSS selector ---');
        // Common CSS selector for Google search button is input[name="btnK"]
        const findButtonResponse: ElementReference = await client.send('WebDriver:FindElement', {
            sessionId: sessionId,
            using: 'css selector',
            value: '[name="btnK"]'
        });
        const searchButtonId: string = getElementId(findButtonResponse);
        console.log(`Found Google Search button with ID: ${searchButtonId}`);

        // 5. Click the Google Search button
        console.log('\n--- Clicking the Google Search button ---');
        await client.send('WebDriver:ElementClick', {
            sessionId: sessionId,
            id: searchButtonId
        });
        console.log('Google Search button clicked.');

        // Add a delay to allow search results to load
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 6. Get the page title (after search, it should reflect the search query)
        console.log('\n--- Getting page title after search ---');
        const titleResponse: string = await client.send('WebDriver:GetTitle', { sessionId: sessionId });
        const title: string = titleResponse;
        console.log(`Page Title: ${title}`);

        // 7. Delete the session (close the browser)
        console.log('\n--- Deleting session ---');
        await client.send('WebDriver:DeleteSession', { sessionId: sessionId });
        console.log('Session deleted.');

    } catch (error: any) {
        console.error('\n--- Automation Error ---');
        console.error('An error occurred during Marionette automation:', error);
    } finally {
        client.disconnect();
    }
}

main();
