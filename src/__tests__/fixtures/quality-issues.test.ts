// Fixture: test file with quality issues
describe("Features", () => {
  it("should render page", () => {
    // No assertions — empty test body
    const element = document.getElementById("app");
  });

  it.skip("should validate email", () => {
    expect("a@b.com").toMatch(/@/);
  });

  it.only("should process order", () => {
    expect(true).toBe(true);
  });

  it("should handle error conditionally", () => {
    const status = 200;
    if (status === 200) {
      expect(status).toBe(200);
    }
  });
});

xdescribe("Disabled suite", () => {
  xit("disabled test", () => {
    expect(1).toBe(1);
  });
});
