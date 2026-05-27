-- Allow accepting swaps when item is reserved (pending) after a request
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

  select points into _buyer_points from public.profiles where id = _req.buyer_id for update;
  if _buyer_points < _req.points then
    raise exception 'Buyer has insufficient points';
  end if;

  perform 1 from public.items
    where id = _req.item_id and status in ('available', 'pending')
    for update;
  if not found then
    raise exception 'Item is no longer available';
  end if;

  update public.profiles set points = points - _req.points where id = _req.buyer_id;
  update public.profiles set points = points + _req.points where id = _req.seller_id;

  update public.items
    set user_id = _req.buyer_id, status = 'swapped'
    where id = _req.item_id;

  update public.swap_requests set status = 'accepted' where id = _req.id;

  update public.swap_requests
    set status = 'declined'
    where item_id = _req.item_id and id <> _req.id and status = 'pending';

  insert into public.transactions (item_id, item_title, from_user, to_user, points)
  select _req.item_id, i.title, _req.seller_id, _req.buyer_id, _req.points
  from public.items i where i.id = _req.item_id
  returning id into _tx_id;

  return _tx_id;
end;
$$;

grant execute on function public.accept_swap_request(uuid) to authenticated;
