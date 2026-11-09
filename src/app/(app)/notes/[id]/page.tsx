import { notFound } from "next/navigation";
import { connection } from "next/server";
import { NoteView } from "@/components/note-view";
import { LoadError } from "@/components/setup-notice";
import { getNote } from "@/lib/supabase";
import type { Note } from "@/lib/types";

const UUID = /^[0-9a-f-]{36}$/i;

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  let note: Note | null;
  try {
    note = await getNote(id);
  } catch (err) {
    return <LoadError error={err} />;
  }
  if (!note) notFound();
  return <NoteView note={note} />;
}
