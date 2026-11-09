import { connection } from "next/server";
import { LibraryView } from "@/components/library-view";
import { LoadError } from "@/components/setup-notice";
import { listNotes } from "@/lib/supabase";

export default async function LibraryPage() {
  await connection();
  try {
    return <LibraryView notes={await listNotes()} />;
  } catch (err) {
    return <LoadError error={err} />;
  }
}
