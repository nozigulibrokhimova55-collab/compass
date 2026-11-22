// Meetings: teachers post free 60 minute slots, parents book them. Tables and functions come from
// supabase/migrations/20261123000002_meetings.sql. Pages never import the Supabase client directly.

import { supabase } from './supabase'

export const MEETINGS_MIGRATION = 'supabase/migrations/20261123000002_meetings.sql'

export class MeetingsNotSetUpError extends Error {
  constructor() {
    super(`Meetings aren’t switched on yet. Run ${MEETINGS_MIGRATION} in the Supabase SQL Editor.`)
  }
}

function client() {
  if (!supabase) throw new Error('Supabase is not set up. Add the two keys from .env.example.')
  return supabase
}

function check(error: { code?: string; message: string } | null) {
  if (!error) return
  // Missing function, table or column: the migration hasn't run.
  if (['PGRST202', 'PGRST204', 'PGRST205', '42P01', '42703', '42883'].includes(error.code ?? '')) throw new MeetingsNotSetUpError()
  // A real Error, so screens can show the plain message the database wrote.
  throw new Error(error.message)
}

// ---------------------------------------------------------------------------
// Teacher
// ---------------------------------------------------------------------------

/** What a teacher sees about a child they are meeting. Real quiz data only. */
export type MeetingProgress = {
  /** How many of this teacher's quizzes the child finished. */
  quizzes: number
  /** Average score over those quizzes, 0 to 100. Null when none are finished. */
  average: number | null
  /** The last five, newest first. */
  recent: { title: string; right: number; total: number }[]
}

export type TeacherSlot = {
  slotId: string
  startsAt: string
  endsAt: string
  booked: boolean
  parentName: string | null
  studentId: string | null
  studentName: string | null
  bookedAt: string | null
  /** Only on booked slots. */
  progress: MeetingProgress | null
}

type RawProgress = { quizzes?: number | string; average?: number | string | null; recent?: { title: string; right: number | string; total: number | string }[] }
type RawTeacherSlot = {
  slot_id: string
  starts_at: string
  ends_at: string
  booked: boolean
  parent_name: string | null
  student_id: string | null
  student_name: string | null
  booked_at: string | null
  progress: RawProgress | null
}

/** The teacher's slots from a week ago onward, free and booked, oldest first. */
export async function fetchTeacherMeetings(): Promise<TeacherSlot[]> {
  const { data, error } = await client().rpc('teacher_meetings')
  check(error)
  return ((data ?? []) as RawTeacherSlot[]).map((r) => ({
    slotId: r.slot_id,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    booked: r.booked === true,
    parentName: r.parent_name,
    studentId: r.student_id,
    studentName: r.student_name,
    bookedAt: r.booked_at,
    progress: r.progress
      ? {
          quizzes: Number(r.progress.quizzes ?? 0),
          average: r.progress.average === null || r.progress.average === undefined ? null : Number(r.progress.average),
          recent: (r.progress.recent ?? []).map((q) => ({ title: q.title, right: Number(q.right), total: Number(q.total) })),
        }
      : null,
  }))
}

/** Posts free slots. `starts` are ISO strings (see seoulToIso). Returns how many were added. Nothing is saved if one is refused. */
export async function postMeetingSlots(starts: string[]): Promise<number> {
  const { data, error } = await client().rpc('post_meeting_slots', { p_starts: starts })
  check(error)
  return Number(data ?? 0)
}

/** Removes a free slot. */
export async function removeMeetingSlot(slotId: string): Promise<void> {
  const { error } = await client().rpc('remove_meeting_slot', { p_slot: slotId })
  check(error)
}

// ---------------------------------------------------------------------------
// Parent
// ---------------------------------------------------------------------------

/** A child of this parent and one teacher who teaches them. */
export type MeetingTeacher = { childId: string; childName: string; teacherId: string; teacherName: string }
export type FreeSlot = { slotId: string; startsAt: string; endsAt: string }
export type ParentMeeting = { slotId: string; startsAt: string; endsAt: string; teacherId: string; teacherName: string; studentId: string | null; studentName: string | null }

/** Each of the parent's children with each of their teachers. */
export async function fetchMeetingTeachers(): Promise<MeetingTeacher[]> {
  const { data, error } = await client().rpc('my_meeting_teachers')
  check(error)
  return ((data ?? []) as { child_id: string; child_name: string; teacher_id: string; teacher_name: string }[]).map((r) => ({
    childId: r.child_id,
    childName: r.child_name,
    teacherId: r.teacher_id,
    teacherName: r.teacher_name,
  }))
}

/** A teacher's free, upcoming slots for one of the parent's children. */
export async function fetchFreeSlots(teacherId: string, childId: string): Promise<FreeSlot[]> {
  const { data, error } = await client().rpc('list_free_slots', { p_teacher: teacherId, p_student: childId })
  check(error)
  return ((data ?? []) as { slot_id: string; starts_at: string; ends_at: string }[]).map((r) => ({ slotId: r.slot_id, startsAt: r.starts_at, endsAt: r.ends_at }))
}

export async function bookSlot(slotId: string, childId: string): Promise<void> {
  const { error } = await client().rpc('book_slot', { p_slot: slotId, p_student: childId })
  check(error)
}

/** The parent's bookings from a week ago onward, oldest first. */
export async function fetchMyMeetings(): Promise<ParentMeeting[]> {
  const { data, error } = await client().rpc('my_meetings')
  check(error)
  return ((data ?? []) as { slot_id: string; starts_at: string; ends_at: string; teacher_id: string; teacher_name: string; student_id: string | null; student_name: string | null }[]).map((r) => ({
    slotId: r.slot_id,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    teacherId: r.teacher_id,
    teacherName: r.teacher_name,
    studentId: r.student_id,
    studentName: r.student_name,
  }))
}

// ---------------------------------------------------------------------------
// Both
// ---------------------------------------------------------------------------

/**
 * Cancels a meeting that hasn't started: the slot becomes free again.
 * A teacher can pass `removeSlot` to delete the slot too. Parents can't remove slots.
 */
export async function cancelMeeting(slotId: string, removeSlot = false): Promise<void> {
  const { error } = await client().rpc('cancel_meeting', { p_slot: slotId, p_remove: removeSlot })
  check(error)
}

/** Moves a booking to another free slot of the same teacher. The old slot is freed in the same step. */
export async function rescheduleMeeting(fromSlotId: string, toSlotId: string): Promise<void> {
  const { error } = await client().rpc('reschedule_meeting', { p_from: fromSlotId, p_to: toSlotId })
  check(error)
}
