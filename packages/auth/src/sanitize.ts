export function sanitize(input: string, maxLen = 2000): string {
  return input.slice(0, maxLen).replace(/[<>]/g, "").trim();
}
