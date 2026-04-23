/**
 * Shared HTTP client for all extractors.
 *
 * Corporate networks with Zscaler (or similar intercepting proxies) re-sign
 * TLS certificates with their own CA, which Node.js rejects by default.
 * We disable `rejectUnauthorized` so scraping works behind the proxy.
 * This is scoped to outbound extraction requests only — MongoDB and OAuth
 * connections are unaffected.
 */

import axios, { type AxiosInstance } from "axios";
import https from "https";

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

export const httpClient: AxiosInstance = axios.create({
  httpsAgent,
  timeout: 20_000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  },
});
