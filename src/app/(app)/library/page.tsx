import { connection } from "next/server";
import { LibraryView } from "@/components/library-view";
import { SetupNotice } from "@/components/setup-notice";
import { ConfigError } from "@/lib/env";
import { listNotes } from "@/lib/supabase";

export default async function LibraryPage() {
  await connection();
  try {
    return <LibraryView notes={await listNotes()} />;
  } catch (err) {
    if (err instanceof ConfigError) return <SetupNotice missing={err.missing} />;
    throw err;
  }
}
