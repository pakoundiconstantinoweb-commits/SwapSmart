
-- =========================
-- PROFILES
-- =========================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  avatar_url text,
  location text,
  bio text,
  points integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated using (auth.uid() = id);

-- updated_at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile + 100 starting points on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================
-- ITEMS
-- =========================
create type public.item_status as enum ('available', 'pending', 'swapped');

create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  points integer not null check (points >= 0),
  image_url text,
  location text,
  status public.item_status not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index items_user_id_idx on public.items(user_id);
create index items_status_idx on public.items(status);
create index items_created_at_idx on public.items(created_at desc);

alter table public.items enable row level security;

create policy "Items are viewable by authenticated users"
  on public.items for select
  to authenticated using (true);

create policy "Users can insert their own items"
  on public.items for insert
  to authenticated with check (auth.uid() = user_id);

create policy "Users can update their own items"
  on public.items for update
  to authenticated using (auth.uid() = user_id);

create policy "Users can delete their own items"
  on public.items for delete
  to authenticated using (auth.uid() = user_id);

create trigger items_set_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();

-- =========================
-- MESSAGES
-- =========================
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (length(content) > 0 and length(content) <= 2000),
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index messages_sender_idx on public.messages(sender_id);
create index messages_receiver_idx on public.messages(receiver_id);
create index messages_created_idx on public.messages(created_at desc);

alter table public.messages enable row level security;

create policy "Users can view their own messages"
  on public.messages for select
  to authenticated using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can send messages"
  on public.messages for insert
  to authenticated with check (auth.uid() = sender_id and sender_id <> receiver_id);

create policy "Users can mark received messages as read"
  on public.messages for update
  to authenticated using (auth.uid() = receiver_id);

-- =========================
-- SWAP REQUESTS
-- =========================
create type public.swap_status as enum ('pending', 'accepted', 'declined', 'cancelled');

create table public.swap_requests (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  points integer not null check (points >= 0),
  status public.swap_status not null default 'pending',
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index swap_requests_item_idx on public.swap_requests(item_id);
create index swap_requests_buyer_idx on public.swap_requests(buyer_id);
create index swap_requests_seller_idx on public.swap_requests(seller_id);

alter table public.swap_requests enable row level security;

create policy "Users can view their own swap requests"
  on public.swap_requests for select
  to authenticated using (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "Users can create swap requests as buyer"
  on public.swap_requests for insert
  to authenticated with check (auth.uid() = buyer_id and buyer_id <> seller_id);

create policy "Buyer or seller can update swap request"
  on public.swap_requests for update
  to authenticated using (auth.uid() = buyer_id or auth.uid() = seller_id);

create trigger swap_requests_set_updated_at
  before update on public.swap_requests
  for each row execute function public.set_updated_at();

-- =========================
-- TRANSACTIONS
-- =========================
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null,
  item_title text not null,
  from_user uuid not null references auth.users(id) on delete set null,
  to_user uuid not null references auth.users(id) on delete set null,
  points integer not null,
  created_at timestamptz not null default now()
);

create index transactions_from_idx on public.transactions(from_user);
create index transactions_to_idx on public.transactions(to_user);

alter table public.transactions enable row level security;

create policy "Users can view their own transactions"
  on public.transactions for select
  to authenticated using (auth.uid() = from_user or auth.uid() = to_user);

-- =========================
-- ACCEPT SWAP - atomic transfer
-- =========================
create or replace function public.accept_swap_request(_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _req record;
  _buyer_points int;
  _tx_id uuid;
begin
  -- Lock the request
  select * into _req from public.swap_requests where id = _request_id for update;
  if _req is null then
    raise exception 'Request not found';
  end if;
  if _req.seller_id <> auth.uid() then
    raise exception 'Only the seller can accept this request';
  end if;
  if _req.status <> 'pending' then
    raise exception 'Request is not pending';
  end if;

  -- Lock buyer profile and check points
  select points into _buyer_points from public.profiles where id = _req.buyer_id for update;
  if _buyer_points < _req.points then
    raise exception 'Buyer has insufficient points';
  end if;

  -- Lock the item
  perform 1 from public.items where id = _req.item_id and status = 'available' for update;
  if not found then
    raise exception 'Item is no longer available';
  end if;

  -- Transfer points
  update public.profiles set points = points - _req.points where id = _req.buyer_id;
  update public.profiles set points = points + _req.points where id = _req.seller_id;

  -- Transfer ownership and mark swapped
  update public.items
    set user_id = _req.buyer_id, status = 'swapped'
    where id = _req.item_id;

  -- Mark request accepted
  update public.swap_requests set status = 'accepted' where id = _req.id;

  -- Decline all other pending requests for this item
  update public.swap_requests
    set status = 'declined'
    where item_id = _req.item_id and id <> _req.id and status = 'pending';

  -- Record transaction
  insert into public.transactions (item_id, item_title, from_user, to_user, points)
  select _req.item_id, i.title, _req.seller_id, _req.buyer_id, _req.points
  from public.items i where i.id = _req.item_id
  returning id into _tx_id;

  return _tx_id;
end;
$$;

-- =========================
-- STORAGE BUCKETS
-- =========================
insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true), ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Anyone can view item images"
  on storage.objects for select
  using (bucket_id = 'item-images');

create policy "Authenticated can upload item images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'item-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update own item images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'item-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete own item images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'item-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Authenticated can upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
