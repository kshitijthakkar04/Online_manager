"use client";

import { useEffect, useState } from "react";
import { Check, Wand2 } from "lucide-react";
import { useNotch } from "@/components/notch";
import { PageHeader } from "@/components/page-header";
import { AutoTextarea, Markdown, api, errorText } from "@/components/ui";

type Style = { style_samples: string; style_profile: string };

export default function StylePage() {
  const notch = useNotch();
  const [style, setStyle] = useState<Style>({ style_samples: "", style_profile: "" });
  const [saved, setSaved] = useState<Style | null>(null);
  const [busy, setBusy] = useState(false);
  const [editProfile, setEditProfile] = useState(false);

  useEffect(() => {
    api<Style>("/api/style")
      .then((s) => {
        setStyle(s);
        setSaved(s);
      })
      .catch((e) => notch.error(errorText(e)));
  }, [notch]);

  const dirty = saved !== null && (saved.style_samples !== style.style_samples || saved.style_profile !== style.style_profile);
  const words = style.style_samples.trim() ? style.style_samples.trim().split(/\s+/).length : 0;

  async function save(next = style) {
    setBusy(true);
    notch.busy("Saving your voice…");
    try {
      await api("/api/style", { method: "PUT", body: next });
      setSaved(next);
      notch.success("Voice saved — new notes will sound like you");
    } catch (e) {
      notch.error(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function analyze() {
    setBusy(true);
    notch.busy("Studying how you write…");
    try {
      const { profile } = await api<{ profile: string }>("/api/style/analyze", { body: { samples: style.style_samples } });
      const next = { ...style, style_profile: profile };
      setStyle(next);
      setBusy(false);
      await save(next);
    } catch (e) {
      notch.error(errorText(e));
      setBusy(false);
    }
  }

  // 300–2,000 words of samples gives Gemini enough to pick up a voice.
  const fill = Math.min(1, words / 600);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="My voice"
        title="Teach Gemini how you write"
        description="Paste things you've written — blog posts, messages, old notes. Gemini distils them into a style profile and uses both whenever it writes a note for you."
      >
        {dirty && <span className="text-xs text-ink-400">Unsaved changes</span>}
        <button onClick={() => save()} disabled={!dirty || busy} className="btn-primary">
          <Check className="size-4" strokeWidth={2.5} /> Save
        </button>
      </PageHeader>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <section className="card flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5 sm:px-6">
            <span className="flex items-center gap-2 text-[13px] font-semibold text-ink-100">
              <span className="grid size-5 place-items-center rounded-full bg-white/[0.06] text-[10px] text-ink-300">1</span>
              Writing samples
            </span>
            <span className="flex items-center gap-2 text-xs text-ink-400 tabular-nums">
              <span className="h-1 w-16 overflow-hidden rounded-full bg-white/[0.06]">
                <span className="block h-full rounded-full bg-lamp transition-all" style={{ width: `${fill * 100}%` }} />
              </span>
              {words.toLocaleString()} words
            </span>
          </div>
          <div className="flex-1 px-5 py-5 sm:px-6">
            <AutoTextarea
              value={style.style_samples}
              onChange={(e) => setStyle({ ...style, style_samples: e.target.value })}
              minRows={16}
              placeholder="Paste 300–2,000 words of your own writing here…"
              className="w-full bg-transparent font-serif text-[1.05rem] leading-[1.8] text-ink-200 caret-lamp outline-none placeholder:text-ink-500"
            />
          </div>
        </section>

        <section className="card flex flex-col overflow-hidden lg:sticky lg:top-20 lg:self-start">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5 sm:px-6">
            <span className="flex items-center gap-2 text-[13px] font-semibold text-ink-100">
              <span className="grid size-5 place-items-center rounded-full bg-white/[0.06] text-[10px] text-ink-300">2</span>
              Style profile
            </span>
            {style.style_profile && (
              <button onClick={() => setEditProfile(!editProfile)} className="btn-ghost h-7 px-2 text-xs">
                {editProfile ? "Preview" : "Edit"}
              </button>
            )}
          </div>
          <div className="px-5 py-5 sm:px-6">
            {editProfile || !style.style_profile ? (
              <AutoTextarea
                value={style.style_profile}
                onChange={(e) => setStyle({ ...style, style_profile: e.target.value })}
                minRows={8}
                placeholder={"Describe your style, or let Gemini analyse your samples.\n\ne.g. Short punchy sentences. Lots of analogies from cooking. Ends with a one-line takeaway."}
                className="field text-[13px] leading-relaxed"
              />
            ) : (
              <Markdown className="text-[0.95rem]">{style.style_profile}</Markdown>
            )}
            <button onClick={analyze} disabled={busy || words < 40} className="btn-soft mt-5 w-full">
              <Wand2 className="size-4 text-lamp" />
              {style.style_profile ? "Re-analyse my samples" : "Analyse my samples"}
            </button>
            {words < 40 && <p className="mt-2 text-center text-xs text-ink-500">Add a few paragraphs of samples first.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
