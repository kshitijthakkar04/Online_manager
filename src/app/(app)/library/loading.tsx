import { PageLoader } from "@/components/page-loader";

export default function LibraryLoading() {
  return (
    <PageLoader
      notchText="Opening your library…"
      messages={["Dusting off the shelves…", "Counting your streak…", "Gathering everything you've learned…", "Sorting the good stuff…"]}
    />
  );
}
