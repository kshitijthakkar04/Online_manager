import { notFound } from "next/navigation";
import { connection } from "next/server";
import { NoteView } from "@/components/note-view";
import { SetupNotice } from "@/components/setup-notice";
import { ConfigError } from "@/lib/env";
import { getNote } from "@/lib/supabase";

const UUID = /^[0-9a-f-]{36}$/i;

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  try {
    const note = await getNote(id);
    if (!note) notFound();
    return <NoteView note={note} />;
  } catch (err) {
    if (err instanceof ConfigError) return <SetupNotice missing={err.missing} />;
    throw err;
  }
}
