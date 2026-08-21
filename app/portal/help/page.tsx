import { Suspense } from "react";
import { HelpCenter } from "@/components/help/help-center";

export default function PortalHelpPage() {
  return (
    <Suspense>
      <HelpCenter />
    </Suspense>
  );
}
