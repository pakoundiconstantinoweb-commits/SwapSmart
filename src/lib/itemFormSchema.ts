import { z } from "zod";
import { ITEM_CATEGORIES, ITEM_CONDITIONS } from "@/lib/itemMeta";

export const itemFormSchema = z.object({
  title: z.string().trim().min(1, "Le titre est requis").max(100, "100 caractères maximum"),
  description: z.string().trim().max(1000, "1000 caractères maximum").optional(),
  points: z.number().int().min(0, "Les points doivent être positifs").max(10000, "Maximum 10 000 points"),
  location: z.string().trim().max(100, "100 caractères maximum").optional(),
  category: z.enum(ITEM_CATEGORIES, { required_error: "Choisis une catégorie" }),
  condition: z.enum(ITEM_CONDITIONS, { required_error: "Choisis un état" }),
});

export type ItemFormValues = z.infer<typeof itemFormSchema>;
