import { PageLoader } from "@/components/page-loader";

export default function NoteLoading() {
  return (
    <PageLoader
      notchText="Turning to the page…"
      messages={["Finding the right page…", "Smoothing the creases…", "Almost there…"]}
    />
  );
}
