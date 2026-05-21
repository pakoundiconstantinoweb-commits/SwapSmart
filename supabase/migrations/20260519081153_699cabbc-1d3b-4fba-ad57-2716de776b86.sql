CREATE TYPE public.item_category AS ENUM ('Mode','High-Tech','Maison','Livres','Jouets','Sport','Beauté','Autre');
CREATE TYPE public.item_condition AS ENUM ('Neuf','Très bon état','Bon état','Usagé');

ALTER TABLE public.items
  ADD COLUMN category public.item_category NOT NULL DEFAULT 'Autre',
  ADD COLUMN condition public.item_condition NOT NULL DEFAULT 'Bon état';

CREATE INDEX idx_items_category ON public.items(category);
CREATE INDEX idx_items_condition ON public.items(condition);