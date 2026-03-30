import type { Event, User } from '@/app/data/mockData';
import { createClient } from '@/lib/supabase/client';
import type { PublicEventRow } from '@/lib/events/publicExplore';
import { mapPublicEventRowToEvent } from '@/lib/events/publicExplore';
import { isEventInPast } from '@/lib/events/eventSchedule';

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type ParticipantRow = {
  user_id: string;
  profile: { display_name: string | null; avatar_url: string | null } | null;
};

function avatarFallback(userId: string): string {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userId.slice(0, 12))}&fontWeight=600`;
}

export function participantRowToUser(row: ParticipantRow): User {
  const name =
    row.profile?.display_name?.trim() ||
    'Participante';
  const avatar =
    row.profile?.avatar_url?.trim() || avatarFallback(row.user_id);
  return {
    id: row.user_id,
    name,
    avatar,
  };
}

export async function fetchMyPlanEvents(userId: string): Promise<Event[]> {
  const supabase = createClient();
  const { data: parts, error: pErr } = await supabase
    .from('event_participants')
    .select('event_id')
    .eq('user_id', userId);

  if (pErr) throw pErr;
  const ids = (parts ?? []).map((r) => r.event_id as string).filter(Boolean);
  if (ids.length === 0) return [];

  const { data: rows, error: eErr } = await supabase
    .from('public_events')
    .select('*')
    .in('id', ids)
    .eq('published', true)
    .order('event_date', { ascending: true });

  if (eErr) throw eErr;
  return ((rows ?? []) as PublicEventRow[]).map(mapPublicEventRowToEvent);
}

export async function fetchParticipantUsersForEvent(eventId: string): Promise<User[]> {
  const supabase = createClient();
  const { data: parts, error: pErr } = await supabase
    .from('event_participants')
    .select('user_id')
    .eq('event_id', eventId);

  if (pErr) throw pErr;
  const userIds = (parts ?? []).map((r) => r.user_id as string);
  if (userIds.length === 0) return [];

  const { data: profs, error: profErr } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', userIds);

  if (profErr) throw profErr;
  const byId = new Map(
    ((profs ?? []) as ProfileRow[]).map((p) => [p.id, p])
  );

  return userIds.map((user_id) =>
    participantRowToUser({
      user_id,
      profile: byId.has(user_id)
        ? {
            display_name: byId.get(user_id)!.display_name,
            avatar_url: byId.get(user_id)!.avatar_url,
          }
        : null,
    })
  );
}

export async function isUserParticipating(
  eventId: string,
  userId: string
): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('event_participants')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .eq('status', 'going')
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function joinEventAsGoing(
  eventId: string,
  userId: string
): Promise<void> {
  const supabase = createClient();
  const { data: row, error: loadErr } = await supabase
    .from('public_events')
    .select('event_date, event_time')
    .eq('id', eventId)
    .eq('published', true)
    .maybeSingle();

  if (loadErr) throw loadErr;
  if (!row) throw new Error('No encontramos este evento o no está publicado.');
  if (
    isEventInPast({
      date: row.event_date as string,
      time: row.event_time as string,
    })
  ) {
    throw new Error('Este evento ya ocurrió; no podés confirmar asistencia.');
  }

  const { error } = await supabase.from('event_participants').upsert(
    {
      event_id: eventId,
      user_id: userId,
      status: 'going',
    },
    { onConflict: 'event_id,user_id' }
  );
  if (error) throw error;
}

export async function leaveEvent(eventId: string, userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('event_participants')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userId);
  if (error) throw error;
}
