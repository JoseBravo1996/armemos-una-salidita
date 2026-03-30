-- Bloquear RSVP con status "going" cuando el evento ya comenzó (fecha + hora < now()).
-- Complementa la validación en el cliente (joinEventAsGoing).

create or replace function public.prevent_rsvp_past_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  start_ts timestamp without time zone;
begin
  if new.status is distinct from 'going' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status = 'going' and new.status = 'going' then
    return new;
  end if;

  select (pe.event_date + pe.event_time::time)
  into start_ts
  from public.public_events pe
  where pe.id = new.event_id
    and pe.published = true;

  if not found then
    raise exception 'Evento no encontrado o no publicado';
  end if;

  if start_ts < now() then
    raise exception 'No se puede confirmar asistencia a un evento ya iniciado o finalizado';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_event_participants_block_past_rsvp_ins on public.event_participants;
drop trigger if exists trg_event_participants_block_past_rsvp_upd on public.event_participants;

create trigger trg_event_participants_block_past_rsvp_ins
  before insert on public.event_participants
  for each row
  execute function public.prevent_rsvp_past_events();

create trigger trg_event_participants_block_past_rsvp_upd
  before update on public.event_participants
  for each row
  execute function public.prevent_rsvp_past_events();
