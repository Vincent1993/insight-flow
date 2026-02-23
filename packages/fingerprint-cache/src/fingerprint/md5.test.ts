import { describe, expect, test } from "@rstest/core";
import { createMd5Fingerprint } from "./md5.js";

describe("createMd5Fingerprint", () => {
  test("same payload should generate same fingerprint", () => {
    const a = createMd5Fingerprint({
      points: [1, 2, 3],
      title: "demo"
    });
    const b = createMd5Fingerprint({
      title: "demo",
      points: [1, 2, 3]
    });

    expect(a).toBe(b);
  });

  test("changed payload should generate different fingerprint", () => {
    const a = createMd5Fingerprint({
      points: [1, 2, 3]
    });
    const b = createMd5Fingerprint({
      points: [1, 2, 4]
    });

    expect(a).not.toBe(b);
  });
});
