// Fixture: clean test file with no issues
describe("Calculator", () => {
  it("should add two numbers", () => {
    expect(1 + 1).toBe(2);
  });

  it("should subtract two numbers", () => {
    expect(5 - 3).toBe(2);
  });

  describe("edge cases", () => {
    it("should handle zero", () => {
      expect(0 + 0).toBe(0);
    });
  });
});
