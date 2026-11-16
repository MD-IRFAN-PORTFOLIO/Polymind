"use client";

import React from "react";
import Link from "next/link";
import { LogIn, LogOut, User } from "lucide-react";
import { UserButton, useClerk, useUser } from "@clerk/nextjs";

export function UserAccountNav() {
  const isClerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  if (!isClerkEnabled) {
    return <GuestAccountNav />;
  }

  return <ClerkAccountNav />;
}

function GuestAccountNav() {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-surface-800 px-3 py-2 text-xs text-slate-400">
      <span className="flex items-center gap-2">
        <User className="h-3.5 w-3.5 text-slate-400" />
        <span>Guest Mode (Local)</span>
      </span>
      <Link
        href="/sign-in"
        className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300"
      >
        Sign In / Register
      </Link>
    </div>
  );
}

function ClerkAccountNav() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();

  if (!isLoaded) {
    return (
      <div className="flex h-10 w-full animate-pulse items-center rounded-lg border border-slate-800 bg-surface-800/60 px-3 py-2" />
    );
  }

  if (isSignedIn) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-surface-800/90 px-3 py-2 shadow-sm">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "h-7 w-7 ring-1 ring-slate-700",
              },
            }}
          />
          <div className="flex flex-col truncate max-w-[110px]">
            <span className="truncate text-xs font-medium text-slate-200">
              {user?.fullName || user?.firstName || "My Account"}
            </span>
            <span className="truncate text-[10px] text-slate-400">
              {user?.primaryEmailAddress?.emailAddress || "Online"}
            </span>
          </div>
        </div>

        <button
          onClick={() => signOut({ redirectUrl: "/" })}
          title="Log out of PolyMind"
          className="flex items-center gap-1 rounded-md px-2 py-1 text-slate-400 transition hover:bg-rose-500/15 hover:text-rose-400"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="text-[11px] font-medium">Log out</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-surface-800 px-3 py-2">
      <div className="flex w-full items-center justify-between">
        <span className="text-xs text-slate-400">Not signed in</span>
        <Link
          href="/sign-in"
          className="flex items-center gap-1.5 rounded-md bg-indigo-600/20 px-2.5 py-1 text-xs font-medium text-indigo-300 transition hover:bg-indigo-600/30"
        >
          <LogIn className="h-3.5 w-3.5" />
          Sign In / Register
        </Link>
      </div>
    </div>
  );
}
