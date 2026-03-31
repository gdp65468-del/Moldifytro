export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function buildUniqueSlug(title: string, existingSlugs: string[]) {
  const base = slugify(title) || "template";

  if (!existingSlugs.includes(base)) {
    return base;
  }

  let attempt = 1;
  while (attempt < 9999) {
    const suffix = Math.random().toString(36).slice(2, 6);
    const next = `${base}-${suffix}`;
    if (!existingSlugs.includes(next)) {
      return next;
    }
    attempt += 1;
  }

  return `${base}-${Date.now().toString(36)}`;
}
