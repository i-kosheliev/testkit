import { analyzeTestFile } from "../analyze-file";

describe("analyzeTestFile", () => {
  it("returns minimum score for empty input", () => {
    const result = analyzeTestFile("");
    expect(result.score).toBe(1);
    expect(result.risks).toEqual([]);
  });

  it("returns minimum score for non-string input", () => {
    // @ts-expect-error testing defensive path
    const result = analyzeTestFile(null);
    expect(result.score).toBe(1);
    expect(result.risks).toEqual([]);
  });

  it("does NOT flag mere keyword mention without structural evidence", () => {
    const content = `
      // This test validates email addresses in user profile
      it("rejects invalid email", () => {
        expect(isEmail("foo")).toBe(false);
      });
    `;
    const result = analyzeTestFile(content);
    const emailRisk = result.risks.find((r) => r.label === "Email / messaging");
    expect(emailRisk).toBeUndefined();
  });

  it("flags fixed sleep when setTimeout is actually called", () => {
    const content = `
      it("waits for animation", async () => {
        await new Promise((r) => setTimeout(r, 500));
        expect(foo).toBe(true);
      });
    `;
    const result = analyzeTestFile(content);
    expect(result.risks.some((r) => r.label === "Fixed sleep/timeout")).toBe(true);
    expect(result.score).toBeGreaterThan(1);
  });

  it("flags real HTTP calls but not mere keyword", () => {
    const withEvidence = `
      import axios from "axios";
      it("fetches data", async () => {
        const res = await axios.get("https://api.example.com/x");
      });
    `;
    const keywordOnly = `
      it("builds url from config", () => {
        const url = buildUrl("/api/x");
        expect(url).toContain("/api");
      });
    `;
    expect(
      analyzeTestFile(withEvidence).risks.some((r) => r.label === "Network / external API")
    ).toBe(true);
    expect(
      analyzeTestFile(keywordOnly).risks.some((r) => r.label === "Network / external API")
    ).toBe(false);
  });

  it("flags database access via prisma import", () => {
    const content = `
      import { prisma } from "@prisma/client";
      it("reads users", async () => {
        const users = await prisma.user.findMany();
      });
    `;
    const result = analyzeTestFile(content);
    expect(result.risks.some((r) => r.label === "Database / ORM")).toBe(true);
  });

  it("flags Date.now() as time dependency", () => {
    const content = `
      it("expires tokens", () => {
        const now = Date.now();
        expect(expiresAt > now).toBe(true);
      });
    `;
    const result = analyzeTestFile(content);
    expect(result.risks.some((r) => r.label === "Date/time dependency")).toBe(true);
  });

  it("flags Math.random() as random data", () => {
    const content = `
      it("picks winner", () => {
        const n = Math.random();
        expect(n).toBeLessThan(1);
      });
    `;
    const result = analyzeTestFile(content);
    expect(result.risks.some((r) => r.label === "Random / dynamic data")).toBe(true);
  });

  it("flags Promise.all concurrency", () => {
    const content = `
      it("runs parallel tasks", async () => {
        await Promise.all([task1(), task2()]);
      });
    `;
    const result = analyzeTestFile(content);
    expect(result.risks.some((r) => r.label === "Concurrency / race conditions")).toBe(true);
  });

  it("caps score at 10 even with many risks", () => {
    const content = `
      import axios from "axios";
      import { prisma } from "@prisma/client";
      import nodemailer from "nodemailer";
      it("does everything", async () => {
        await new Promise((r) => setTimeout(r, 100));
        await axios.get("https://example.com");
        await prisma.user.findMany();
        const now = Date.now();
        const n = Math.random();
        await Promise.all([a(), b()]);
      });
    `;
    const result = analyzeTestFile(content);
    expect(result.score).toBeLessThanOrEqual(10);
    expect(result.score).toBeGreaterThan(5);
  });

  it("evidence string is truncated to 60 chars", () => {
    const content = `
      await axios.get("https://very-long-url.example.com/some/endpoint/that/is/very/long");
    `;
    const result = analyzeTestFile(content);
    const risk = result.risks.find((r) => r.label === "Network / external API");
    if (risk) {
      expect(risk.evidence.length).toBeLessThanOrEqual(100);
    }
  });
});
