import { describe, expect, it } from "vitest";
import { isSafeStoragePath } from "@/lib/storage/access-control";

describe("storage access-control", () => {
  it("rejects path traversal in key", () => {
    expect(isSafeStoragePath("photos", "../etc/passwd")).toBe(false);
    expect(isSafeStoragePath("photos", "2024/01/abc.jpg")).toBe(true);
  });

  it("rejects invalid bucket names", () => {
    expect(isSafeStoragePath("Photos", "a.jpg")).toBe(false);
    expect(isSafeStoragePath("chat-attachments", "2024/01/file.png")).toBe(true);
  });
});
