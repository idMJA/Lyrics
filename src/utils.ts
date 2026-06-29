import {
	mkdir as fsMkdir,
	readFile as fsReadFile,
	rm as fsRm,
	writeFile as fsWriteFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import fetchCookie from "fetch-cookie";
import ky from "ky";
import type { NodeError } from "./types.js";

export function isNode(): boolean {
	return (
		typeof process !== "undefined" &&
		process.versions !== undefined &&
		typeof process.versions.node === "string"
	);
}

export function isBun(): boolean {
	return typeof globalThis.Bun !== "undefined";
}

export async function mkdir(path: string): Promise<void> {
	try {
		await fsMkdir(path, { recursive: true });
	} catch (error: unknown) {
		const nodeError = error as NodeError;
		if (nodeError.code !== "EEXIST") {
			throw error;
		}
	}
}

export async function writeFile(path: string, data: string): Promise<void> {
	await fsWriteFile(path, data, "utf-8");
}

export async function readFile(path: string): Promise<string> {
	return await fsReadFile(path, "utf-8");
}

export async function deleteFile(path: string): Promise<void> {
	try {
		await fsRm(path, { force: true });
	} catch {
		// ignore
	}
}

export function getCachePath(appName: string): string {
	return join(homedir(), ".cache", appName);
}

const cookieJar = fetchCookie(globalThis.fetch);

export const kyClient = ky.create({
	fetch: cookieJar,
	headers: {
		"User-Agent":
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/115.0.0.0 Safari/537.36",
		Accept: "application/json, text/javascript, */*; q=0.01",
		Referer: "https://www.musixmatch.com/",
		Origin: "https://www.musixmatch.com",
	},
	throwHttpErrors: false,
});
