import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Room } from '@/lib/types';

export interface SeatRecord {
  roll_number: string;
  room_number: string;
  seat_number: number;
  exam_code: string | null;
  dept: string | null;
  session_id: string;
  published_at: string;
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;

/** Without Supabase configured, sessions live in this browser only (useful for demos). */
const LOCAL_KEY = 'seating_sessions';

type LocalStore = Record<string, SeatRecord[]>;

function readLocal(): LocalStore {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
  } catch {
    return {};
  }
}

export function buildRecords(rooms: Room[], roomLabel: (r: Room) => string, sessionId: string): SeatRecord[] {
  const publishedAt = new Date().toISOString();
  const seen = new Set<string>();
  const records: SeatRecord[] = [];
  for (const room of rooms) {
    const label = roomLabel(room);
    let seatNo = 0;
    for (const row of room.grid)
      for (const s of row) {
        if (!s) continue;
        seatNo++;
        if (!s.rollNumber || seen.has(s.rollNumber)) continue;
        seen.add(s.rollNumber);
        records.push({
          roll_number: s.rollNumber.toUpperCase(),
          room_number: label,
          seat_number: seatNo,
          exam_code: s.examCode || null,
          dept: s.department || null,
          session_id: sessionId,
          published_at: publishedAt,
        });
      }
  }
  return records;
}

export async function publishSession(records: SeatRecord[], sessionId: string, totalRooms: number) {
  if (!supabase) {
    const store = readLocal();
    store[sessionId] = records;
    localStorage.setItem(LOCAL_KEY, JSON.stringify(store));
    return;
  }
  const { error: sessionError } = await supabase.from('exam_sessions').upsert([
    {
      session_id: sessionId,
      total_students: records.length,
      total_rooms: totalRooms,
      published_at: records[0]?.published_at ?? new Date().toISOString(),
      is_active: true,
    },
  ]);
  if (sessionError) throw sessionError;
  const { error } = await supabase
    .from('exam_seating_lookup')
    .upsert(records, { onConflict: 'roll_number,session_id' });
  if (error) throw error;
}

/** Looks up a roll number in the given session, or in the most recently published one. */
export async function findSeat(roll: string, sessionId: string | null): Promise<SeatRecord | null> {
  const rollNumber = roll.trim().toUpperCase();
  if (!supabase) {
    const store = readLocal();
    const sessions = sessionId ? [store[sessionId] ?? []] : Object.values(store);
    const hits = sessions.flat().filter((r) => r.roll_number === rollNumber);
    hits.sort((a, b) => b.published_at.localeCompare(a.published_at));
    return hits[0] ?? null;
  }
  let query = supabase.from('exam_seating_lookup').select('*').eq('roll_number', rollNumber);
  query = sessionId ? query.eq('session_id', sessionId) : query.order('published_at', { ascending: false }).limit(1);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data as SeatRecord | null;
}
