import { flaky } from "../flaky";

describe("flaky", () => {
  it("scores clean deterministic test as low risk", () => {
    const result = flaky("Calculate sum of two numbers");
    expect(result.score).toBe(1);
    expect(result.risks).toHaveLength(0);
    expect(result.suggestions).toHaveLength(0);
  });

  it("detects timing dependency", () => {
    const result = flaky("Wait 3 seconds then check if email arrived");
    expect(result.risks).toContain("Timing dependency");
    expect(result.score).toBeGreaterThan(1);
  });

  it("detects external API", () => {
    const result = flaky("Call REST API endpoint and verify response");
    expect(result.risks).toContain("External API");
  });

  it("detects database dependency", () => {
    const result = flaky("Insert record into database and query it back");
    expect(result.risks).toContain("Database");
  });

  it("detects file I/O", () => {
    const result = flaky("Upload file and verify download link");
    expect(result.risks).toContain("File I/O");
  });

  it("detects network dependency", () => {
    const result = flaky("Open socket connection to port 8080");
    expect(result.risks).toContain("Network");
  });

  it("detects concurrency risks", () => {
    const result = flaky("Run parallel async operations and check race condition");
    expect(result.risks).toContain("Concurrency");
  });

  it("detects UI animation risks", () => {
    const result = flaky("Wait for loading spinner to disappear then click modal");
    expect(result.risks).toContain("UI animation");
  });

  it("detects email/notification", () => {
    const result = flaky("Send email notification and check inbox");
    expect(result.risks).toContain("Email/notification");
  });

  it("detects date/time dependency", () => {
    const result = flaky("Verify cron job runs at midnight in correct timezone");
    expect(result.risks).toContain("Date/time");
  });

  it("detects random data usage", () => {
    const result = flaky("Generate random UUID and verify uniqueness");
    expect(result.risks).toContain("Random/generated");
  });

  it("detects environment dependency", () => {
    const result = flaky("Read secret from env variable in Docker container");
    expect(result.risks).toContain("Environment");
  });

  it("accumulates multiple risks", () => {
    const result = flaky("Wait 5s for API fetch then check email notification");
    expect(result.risks.length).toBeGreaterThan(2);
    expect(result.score).toBeGreaterThan(5);
  });

  it("caps score at 10", () => {
    const result = flaky(
      "Wait timeout for external API database file network parallel animation email timezone random env config",
    );
    expect(result.score).toBeLessThanOrEqual(10);
  });

  it("provides suggestion for each risk", () => {
    const result = flaky("Sleep 5 seconds then fetch API endpoint");
    expect(result.suggestions.length).toBe(result.risks.length);
    expect(result.suggestions.every((s) => s.length > 0)).toBe(true);
  });

  it("handles empty string", () => {
    const result = flaky("");
    expect(result.score).toBe(1);
    expect(result.risks).toHaveLength(0);
  });

  it("handles non-string gracefully", () => {
    const result = flaky(null as unknown as string);
    expect(result.score).toBe(1);
    expect(result.risks).toHaveLength(0);
  });

  it("is case-insensitive", () => {
    const lower = flaky("wait for api response");
    const upper = flaky("WAIT FOR API RESPONSE");
    expect(lower.risks).toEqual(upper.risks);
  });
});
