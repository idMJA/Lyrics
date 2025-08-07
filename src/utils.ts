// Runtime detection utilities
export function isNode(): boolean {
    return typeof process !== 'undefined' && 
           process.versions !== undefined && 
           typeof process.versions.node === 'string';
}

export function isBun(): boolean {
    return typeof (globalThis as any).Bun !== 'undefined';
}

export function isDeno(): boolean {
    return typeof (globalThis as any).Deno !== 'undefined';
}

export function isBrowser(): boolean {
    return typeof (globalThis as any).window !== 'undefined' && 
           typeof (globalThis as any).document !== 'undefined';
}

// Cross-platform file system utilities
export async function mkdir(path: string): Promise<void> {
    if (isNode() || isBun()) {
        const { mkdir: fsMkdir } = await import('fs/promises');
        try {
            await fsMkdir(path, { recursive: true });
        } catch (error: any) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    } else if (isDeno()) {
        try {
            await (globalThis as any).Deno.mkdir(path, { recursive: true });
        } catch (error: any) {
            if (!(error instanceof (globalThis as any).Deno.errors.AlreadyExists)) {
                throw error;
            }
        }
    }
    // Browser doesn't support file system operations
}

export async function writeFile(path: string, data: string): Promise<void> {
    if (isNode() || isBun()) {
        const { writeFile: fsWriteFile } = await import('fs/promises');
        await fsWriteFile(path, data, 'utf-8');
    } else if (isDeno()) {
        await (globalThis as any).Deno.writeTextFile(path, data);
    }
    // Browser doesn't support file system operations
}

export async function readFile(path: string): Promise<string> {
    if (isNode() || isBun()) {
        const { readFile: fsReadFile } = await import('fs/promises');
        return await fsReadFile(path, 'utf-8');
    } else if (isDeno()) {
        return await (globalThis as any).Deno.readTextFile(path);
    }
    // Browser doesn't support file system operations
    throw new Error('File system operations not supported in browser');
}

export function getCachePath(appName: string): string {
    if (isNode() || isBun()) {
        const { join } = require('path');
        const { homedir } = require('os');
        return join(homedir(), '.cache', appName);
    } else if (isDeno()) {
        const Deno = (globalThis as any).Deno;
        const homeDir = Deno.env.get('HOME') || Deno.env.get('USERPROFILE') || '/tmp';
        return `${homeDir}/.cache/${appName}`;
    }
    // Browser uses localStorage or sessionStorage
    return appName;
}

// Cross-platform fetch with cookie support
let fetchInstance: any = null;

export async function getFetch(): Promise<any> {
    if (fetchInstance) {
        return fetchInstance;
    }

    if (isBrowser()) {
        // Use native fetch in browser
        fetchInstance = (globalThis as any).fetch;
        return fetchInstance;
    }

    if (isDeno()) {
        // Deno has built-in fetch
        fetchInstance = (globalThis as any).fetch;
        return fetchInstance;
    }

    if (isNode() || isBun()) {
        try {
            // Try to use node-fetch with fetch-cookie for Node.js/Bun
            const nodeFetch = (await import('node-fetch' as any)).default;
            const fetchCookie = (await import('fetch-cookie' as any)).default;
            fetchInstance = fetchCookie(nodeFetch);
            return fetchInstance;
        } catch (error) {
            // Fallback to basic node-fetch if fetch-cookie is not available
            try {
                const nodeFetch = (await import('node-fetch' as any)).default;
                fetchInstance = nodeFetch;
                return fetchInstance;
            } catch (fallbackError) {
                throw new Error('node-fetch is required for Node.js/Bun environments. Please install it: npm install node-fetch');
            }
        }
    }

    throw new Error('No fetch implementation available');
}
