"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import Loader from "~/components/ui/Loader";

// note: dynamic import is required for components that use the Frame SDK
const ChatComponent = dynamic(() => import("~/components/ui/ChatApp"), {
  ssr: false,
  loading: Loader,
});

export default function ChatApp() {
  return (
    <Suspense fallback={<Loader/>
    }>
      <ChatComponent />
    </Suspense>
  );
}