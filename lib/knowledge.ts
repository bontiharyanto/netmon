export const KB_CATEGORIES = ["general", "network", "alert", "runbook", "security"] as const;
export type KbCategory = (typeof KB_CATEGORIES)[number];

export function slugify(title: string) {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return slug || "article";
}

export function isKbCategory(value: string): value is KbCategory {
  return (KB_CATEGORIES as readonly string[]).includes(value);
}
