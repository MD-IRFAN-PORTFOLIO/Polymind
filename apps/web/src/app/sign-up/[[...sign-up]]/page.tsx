import React, { Suspense } from "react";
import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-950 p-4">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 text-sm text-slate-400 transition hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to PolyMind
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <Image src="/logo-icon.png" alt="PolyMind Logo" width={36} height={36} priority />
        <span className="text-xl font-bold tracking-tight text-white">PolyMind</span>
      </div>

      <Suspense fallback={<div className="h-96 w-80 animate-pulse rounded-2xl bg-surface-900 border border-slate-800" />}>
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/"
        />
      </Suspense>
    </div>
  );
}
