-- Ver filas RSVP propias aunque falle el EXISTS contra public_events (borradores, bugs de RLS, etc.).
-- Las políticas permisivas se combinan con OR: basta una valida para ver la fila.

drop policy if exists "Users read own participation rows" on public.event_participants;

create policy "Users read own participation rows"
  on public.event_participants
  for select
  to authenticated
  using (auth.uid() = user_id);
