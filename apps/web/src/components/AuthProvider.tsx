"use client";

import React, { createContext, useContext, useEffect } from "react";
import { ClerkProvider, useAuth, useUser } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { setAuthTokenGetter } from "@/lib/api";

interface AuthContextType {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  user: any;
  isClerkConfigured: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isLoaded: true,
  isSignedIn: false,
  userId: null,
  user: null,
  isClerkConfigured: false,
});

export const useAppAuth = () => useContext(AuthContext);

function ClerkStateSync({ children }: { children: React.ReactNode }) {
  const { getToken, userId } = useAuth();
  const { isLoaded, isSignedIn, user } = useUser();

  useEffect(() => {
    setAuthTokenGetter(async () => {
      try {
        return await getToken();
      } catch {
        return null;
      }
    });
  }, [getToken]);

  return (
    <AuthContext.Provider
      value={{
        isLoaded,
        isSignedIn: Boolean(isSignedIn),
        userId: userId || null,
        user,
        isClerkConfigured: true,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    // When Clerk is not configured locally, treat local guest as signed in
    return (
      <AuthContext.Provider
        value={{
          isLoaded: true,
          isSignedIn: true,
          userId: "local-guest",
          user: null,
          isClerkConfigured: false,
        }}
      >
        {children}
      </AuthContext.Provider>
    );
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
      <ClerkStateSync>{children}</ClerkStateSync>
    </ClerkProvider>
  );
}
