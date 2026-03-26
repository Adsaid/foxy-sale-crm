export function normalizeInterviewerName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}
