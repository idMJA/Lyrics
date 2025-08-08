import {
	mkdir as fsMkdir,
	readFile as fsReadFile,
	writeFile as fsWriteFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import fetchCookie from "fetch-cookie";
import nodeFetch from "node-fetch";
import type { FetchFunction, GlobalThis, NodeError } from "./types.js";

export function isNode(): boolean {
	return (
		typeof process !== "undefined" &&
		process.versions !== undefined &&
		typeof process.versions.node === "string"
	);
}

export function isBun(): boolean {
	return typeof (globalThis as GlobalThis).Bun !== "undefined";
}

export function isDeno(): boolean {
	return typeof (globalThis as GlobalThis).Deno !== "undefined";
}

export function isBrowser(): boolean {
	return (
		typeof (globalThis as GlobalThis).window !== "undefined" &&
		typeof (globalThis as GlobalThis).document !== "undefined"
	);
}

export async function mkdir(path: string): Promise<void> {
	if (isNode() || isBun()) {
		try {
			await fsMkdir(path, { recursive: true });
		} catch (error: unknown) {
			const nodeError = error as NodeError;
			if (nodeError.code !== "EEXIST") {
				throw error;
			}
		}
	} else if (isDeno()) {
		try {
			const deno = (globalThis as GlobalThis).Deno;
			if (deno) {
				await deno.mkdir(path, { recursive: true });
			}
		} catch (error: unknown) {
			const deno = (globalThis as GlobalThis).Deno;
			if (deno && !(error instanceof deno.errors.AlreadyExists)) {
				throw error;
			}
		}
	}
}

export async function writeFile(path: string, data: string): Promise<void> {
	if (isNode() || isBun()) {
		await fsWriteFile(path, data, "utf-8");
	} else if (isDeno()) {
		const deno = (globalThis as GlobalThis).Deno;
		if (deno) {
			await deno.writeTextFile(path, data);
		}
	}
}

export async function readFile(path: string): Promise<string> {
	if (isNode() || isBun()) {
		return await fsReadFile(path, "utf-8");
	} else if (isDeno()) {
		const deno = (globalThis as GlobalThis).Deno;
		if (deno) {
			return await deno.readTextFile(path);
		}
	}

	throw new Error("File system operations not supported in browser");
}

export function getCachePath(appName: string): string {
	if (isNode() || isBun()) {
		return join(homedir(), ".cache", appName);
	} else if (isDeno()) {
		const deno = (globalThis as GlobalThis).Deno;
		if (deno) {
			const homeDir =
				deno.env.get("HOME") || deno.env.get("USERPROFILE") || "/tmp";
			return `${homeDir}/.cache/${appName}`;
		}
	}

	return appName;
}

let fetchInstance: FetchFunction | null = null;

export async function getFetch(): Promise<FetchFunction> {
	if (fetchInstance) {
		return fetchInstance;
	}

	if (isBrowser()) {
		fetchInstance = (globalThis as GlobalThis).fetch as FetchFunction;
		return fetchInstance;
	}

	if (isDeno()) {
		fetchInstance = (globalThis as GlobalThis).fetch as FetchFunction;
		return fetchInstance;
	}

	if (isNode() || isBun()) {
		try {
			fetchInstance = fetchCookie(nodeFetch) as unknown as FetchFunction;
			return fetchInstance;
		} catch (_error) {
			try {
				fetchInstance = nodeFetch as unknown as FetchFunction;
				return fetchInstance;
			} catch (_fallbackError) {
				throw new Error(
					"node-fetch is required for Node.js/Bun environments. Please install it: npm install node-fetch",
				);
			}
		}
	}

	throw new Error("No fetch implementation available");
}
