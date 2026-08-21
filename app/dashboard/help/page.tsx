import { Suspense } from "react";
import { HelpCenter } from "@/components/help/help-center";

export default function HelpPage() {
  return (
    <Suspense>
      <HelpCenter />
    </Suspense>
  );
}
