"use client";

import { ModelDetailProvider } from "@/components/model-detail";

export function Providers({ children }: { children: React.ReactNode }) {
  return <ModelDetailProvider>{children}</ModelDetailProvider>;
}
