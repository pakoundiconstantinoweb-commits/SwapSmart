export const ITEM_CATEGORIES = [
  "Mode",
  "High-Tech",
  "Maison",
  "Livres",
  "Jouets",
  "Sport",
  "Beauté",
  "Autre",
] as const;

export const ITEM_CONDITIONS = [
  "Neuf",
  "Très bon état",
  "Bon état",
  "Usagé",
] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];
export type ItemCondition = (typeof ITEM_CONDITIONS)[number];
