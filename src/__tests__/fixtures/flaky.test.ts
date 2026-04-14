// Fixture: test file with flaky code patterns
describe("API Integration", () => {
  it("should wait for login redirect", () => {
    setTimeout(() => {
      expect(window.location.href).toContain("/dashboard");
    }, 3000);
  });

  it("should fetch user data", () => {
    const response = fetch("/api/users");
    expect(response).toBeDefined();
  });

  it("should handle timestamp", () => {
    const now = Date.now();
    expect(now).toBeGreaterThan(0);
  });

  it("should generate random id", () => {
    const id = Math.random().toString(36);
    expect(id).toBeTruthy();
  });

  it("should use environment config", () => {
    const apiUrl = process.env.API_URL;
    expect(apiUrl).toBeDefined();
  });
});
