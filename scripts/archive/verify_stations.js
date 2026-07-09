import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_STREAMS_FILE = path.join(ROOT, "src", "lib", "audio", "DefaultStreams.ts");
const BROWSER_ORIGIN = process.env.BROWSER_ORIGIN?.trim() || "https://example.com";
const APP_ORIGIN = process.env.APP_ORIGIN?.trim() || "";
const TIMEOUT_MS = Number(process.env.STREAM_TIMEOUT_MS || 12000);
const REPORT_FILE = process.env.STREAM_REPORT_FILE?.trim() || "";

function resolveBrowserExecutable() {
    const candidates = [
        path.join(process.env.LOCALAPPDATA || "", "ms-playwright", "chromium-1217", "chrome-win64", "chrome.exe"),
        path.join(process.env.LOCALAPPDATA || "", "ms-playwright", "chromium-1217", "chrome-win64", "chrome.exe"),
        path.join(process.env.LOCALAPPDATA || "", "ms-playwright", "chromium-1169", "chrome-win", "chrome.exe"),
    ];

    for (const candidate of candidates) {
        if (candidate && existsSync(candidate)) return candidate;
    }

    return "";
}

function parseDefaultStreams(source) {
    const stationPattern = /\{\s*id:\s*"(?<id>[^"]+)"[\s\S]*?title:\s*"(?<title>[^"]+)"[\s\S]*?artist:\s*"(?<artist>[^"]+)"[\s\S]*?album:\s*"(?<album>[^"]+)"[\s\S]*?source:\s*"(?<source>[^"]+)"[\s\S]*?url:\s*"(?<url>[^"]+)"[\s\S]*?mime:\s*"(?<mime>[^"]+)"[\s\S]*?isStream:\s*(?<isStream>true|false)[\s\S]*?\}/g;
    return [...source.matchAll(stationPattern)].map((match) => match.groups).filter(Boolean);
}

function toProxyUrl(appOrigin, streamUrl) {
    const proxyUrl = new URL("/api/stream-proxy", appOrigin);
    proxyUrl.searchParams.set("url", streamUrl);
    return proxyUrl.toString();
}

async function probeAudio(page, streamUrl, timeoutMs = TIMEOUT_MS) {
    return page.evaluate(
        async ({ streamUrl: url, timeoutMs: maxWait }) => {
            const startedAt = performance.now();

            const waitForEvent = (audio, eventName) =>
                new Promise((resolve) => {
                    const onEvent = () => resolve({ ok: true, event: eventName });
                    audio.addEventListener(eventName, onEvent, { once: true });
                });

            const audio = document.createElement("audio");
            audio.preload = "metadata";
            audio.crossOrigin = "anonymous";
            audio.muted = true;
            audio.playsInline = true;
            audio.src = url;

            const cleanup = () => {
                try {
                    audio.pause();
                    audio.removeAttribute("src");
                    audio.load();
                } catch {
                    // ignore
                }
            };

            const errorResult = () => ({
                ok: false,
                event: "error",
                errorCode: audio.error?.code ?? null,
                errorMessage: audio.error?.message ?? null,
            });

            try {
                const metadataPromise = waitForEvent(audio, "loadedmetadata");
                const canPlayPromise = waitForEvent(audio, "canplay");
                const stalledPromise = waitForEvent(audio, "stalled");

                const timeoutPromise = new Promise((resolve) => {
                    window.setTimeout(() => {
                        resolve({ ok: false, event: "timeout" });
                    }, maxWait);
                });

                audio.addEventListener("error", () => { }, { once: true });
                audio.load();

                const result = await Promise.race([metadataPromise, canPlayPromise, stalledPromise, timeoutPromise, new Promise((resolve) => {
                    audio.addEventListener("error", () => resolve(errorResult()), { once: true });
                })]);

                cleanup();
                return {
                    ...result,
                    currentSrc: audio.currentSrc,
                    readyState: audio.readyState,
                    networkState: audio.networkState,
                    duration: Number.isFinite(audio.duration) ? audio.duration : null,
                    elapsedMs: Math.round(performance.now() - startedAt),
                };
            } catch (error) {
                cleanup();
                return {
                    ok: false,
                    event: "exception",
                    errorMessage: error instanceof Error ? error.message : String(error),
                    elapsedMs: Math.round(performance.now() - startedAt),
                };
            }
        },
        { streamUrl, timeoutMs }
    );
}

function summarizeStation(record) {
    const isHttp = record.url.startsWith("http://");
    return {
        id: record.id,
        title: record.title,
        artist: record.artist,
        album: record.album,
        url: record.url,
        isHttp,
        direct: null,
        proxy: null,
        browserUnreachable: null,
    };
}

async function run() {
    const file = await fs.readFile(DEFAULT_STREAMS_FILE, "utf8");
    const stations = parseDefaultStreams(file).map(summarizeStation);

    if (stations.length !== 30) {
        throw new Error(`Expected 30 default streams, parsed ${stations.length}. The catalog parser likely needs an update.`);
    }

    const executablePath = resolveBrowserExecutable();
    const browser = await chromium.launch(executablePath ? { headless: true, executablePath } : { headless: true });
    const directPage = await browser.newPage();
    await directPage.goto(BROWSER_ORIGIN, { waitUntil: "domcontentloaded" });

    let proxyPage = null;
    if (APP_ORIGIN) {
        proxyPage = await browser.newPage();
        await proxyPage.goto(APP_ORIGIN, { waitUntil: "domcontentloaded" });
    }

    const report = [];

    for (const station of stations) {
        console.log(`Testing ${station.title} (${station.id})...`);

        station.direct = await probeAudio(directPage, station.url);

        if (station.isHttp && proxyPage && APP_ORIGIN) {
            station.proxy = await probeAudio(proxyPage, toProxyUrl(APP_ORIGIN, station.url));
        }

        const directReachable = !!station.direct?.ok;
        const proxyReachable = station.proxy ? !!station.proxy.ok : null;
        station.browserUnreachable = station.isHttp
            ? (directReachable ? false : proxyReachable === true ? false : true)
            : !directReachable;

        report.push(station);

        const directLabel = directReachable ? `DIRECT OK (${station.direct.event})` : `DIRECT FAIL (${station.direct.event})`;
        const proxyLabel = station.proxy ? (proxyReachable ? `PROXY OK (${station.proxy.event})` : `PROXY FAIL (${station.proxy.event})`) : "PROXY SKIP";
        const statusLabel = station.browserUnreachable ? "UNREACHABLE" : "PLAYABLE";
        console.log(`  ${statusLabel} | ${directLabel} | ${proxyLabel}`);
    }

    const unreachable = report.filter((station) => station.browserUnreachable);
    const httpOnly = report.filter((station) => station.isHttp).length;
    const playable = report.length - unreachable.length;

    console.log("\n--- BROWSER SMOKE SUMMARY ---");
    console.log(JSON.stringify({ total: report.length, playable, unreachable: unreachable.length, httpOnly }, null, 2));

    if (REPORT_FILE) {
        const reportPath = path.isAbsolute(REPORT_FILE) ? REPORT_FILE : path.join(ROOT, REPORT_FILE);
        await fs.writeFile(reportPath, JSON.stringify({
            browserOrigin: BROWSER_ORIGIN,
            appOrigin: APP_ORIGIN || null,
            generatedAt: new Date().toISOString(),
            total: report.length,
            playable,
            unreachable: unreachable.length,
            stations: report,
        }, null, 2), "utf8");
        console.log(`Report written to ${reportPath}`);
    }

    await browser.close();

    if (unreachable.length > 0) {
        process.exitCode = 1;
    }
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});