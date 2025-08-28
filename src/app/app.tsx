"use client";

import dynamic from "next/dynamic";
import { APP_NAME } from "~/lib/constants";
import { Suspense } from "react";

// note: dynamic import is required for components that use the Frame SDK
const AppComponent = dynamic(() => import("~/components/App"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-[0a0a0a]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300">Loading DCA Agent...</p>
      </div>
    </div>
  ),
});

export default function App(
  { title }: { title?: string } = { title: APP_NAME }
) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-[0a0a0a]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading DCA Agent...</p>
        </div>
      </div>
    }>
      <AppComponent title={title} />
    </Suspense>
  );
}
