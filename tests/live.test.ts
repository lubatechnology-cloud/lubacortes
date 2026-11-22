import { describe, expect, it } from "vitest";
import { validarUrlLive } from "../src/lib/video/live";

describe("Live HLS", () => {
  it("aceita uma playlist HLS pública", () => {
    const u = validarUrlLive("https://cdn.exemplo.ao/live/stream.m3u8?token=abc");
    expect(u.hostname).toBe("cdn.exemplo.ao");
  });

  it("rejeita URL que não é HLS", () => {
    expect(() => validarUrlLive("https://exemplo.ao/video.mp4")).toThrow();
  });

  it("rejeita endereço privado", () => {
    expect(() => validarUrlLive("http://192.168.1.10/live.m3u8")).toThrow();
  });

  it("rejeita credenciais na URL", () => {
    expect(() => validarUrlLive("https://user:pass@exemplo.ao/live.m3u8")).toThrow();
  });
});
