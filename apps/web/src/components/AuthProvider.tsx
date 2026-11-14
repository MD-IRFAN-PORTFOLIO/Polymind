"use client";

import React, { useEffect } from "react";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { setAuthTokenGetter } from "@/lib/api";

function AuthTokenSync() {
  const { getToken } = useAuth();

  useEffect(() => {
    setAuthTokenGetter(async () => {
      try {
        return await getToken();
      } catch {
        return null;
      }
    });
  }, [getToken]);

  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    // Graceful fallback when Clerk keys are not yet configured in .env
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#6366f1",
        },
      } as any}
    >
      <AuthTokenSync />
      {children}
    </ClerkProvider>
  );
}
