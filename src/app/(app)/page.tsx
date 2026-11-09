import { Suspense } from "react";
import { Composer } from "@/components/composer";

export default function TodayPage() {
  return (
    <Suspense>
      <Composer />
    </Suspense>
  );
}
