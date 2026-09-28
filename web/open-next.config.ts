// ============================================================
// laSolutions - Config OpenNext para Cloudflare Workers
// La app es estatica (SSG) + route handlers dinamicos; no usa
// ISR/PPR/image optimization, asi que no requiere overrides de
// cache (KV/R2). Los assets se sirven con el binding ASSETS.
// ============================================================
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({});