import React, { Suspense } from "react";
import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Cpu, Sparkles, ShieldCheck, Zap, Layers } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="min-h-screen w-full bg-surface-950 text-slate-100 flex flex-col lg:grid lg:grid-cols-12 overflow-x-hidden">
      {/* LEFT COLUMN: Premium Illustrative Branding & Live Model Preview */}
      <div className="relative hidden lg:flex lg:col-span-7 flex-col justify-between p-12 xl:p-16 border-r border-slate-800/80 bg-gradient-to-br from-surface-950 via-surface-900 to-[#070b16] overflow-hidden">
        {/* Ambient radial glows */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-[500px] w-[500px] rounded-full bg-indigo-500/10 blur-[130px]" />
        <div className="pointer-events-none absolute -bottom-24 -right-20 h-[450px] w-[450px] rounded-full bg-cyan-500/10 blur-[140px]" />

        {/* Subtle grid texture overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Top brand header */}
        <div className="relative z-10 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-600/20 shadow-md shadow-indigo-500/10 transition group-hover:scale-105">
              <Image
                src="/logo-icon.png"
                alt="PolyMind Logo"
                width={28}
                height={28}
                priority
              />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">PolyMind</span>
          </Link>
          <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-300">
            Multi-LLM Intelligence
          </span>
        </div>

        {/* Middle Illustrative Showcase */}
        <div className="relative z-10 my-auto py-8 max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300 mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            Parallel Model Execution & Grounded Citations
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight mb-4">
            Benchmark frontier AI models <br />
            <span className="bg-gradient-to-r from-indigo-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
              side-by-side in real-time.
            </span>
          </h1>

          <p className="text-sm xl:text-base text-slate-400 mb-8 leading-relaxed">
            Eliminate model bias. Simultaneously broadcast prompts across Google Gemini, 
            Groq Llama/Qwen, and OpenRouter with auto-failover and private RAG embeddings.
          </p>

          {/* Illustrative Multi-Model Cards Visual */}
          <div className="rounded-2xl border border-slate-800 bg-surface-950/60 p-4 backdrop-blur-xl shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-slate-200">Live Consensus Stream</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-surface-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                Prompt: &quot;Benchmark system architecture&quot;
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              {/* Model 1: Gemini */}
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-indigo-300 mb-1">
                    <span>Gemini Flash</span>
                    <span className="text-[9px] text-indigo-400 bg-indigo-500/10 px-1 rounded">2.4s</span>
                  </div>
                  <div className="space-y-1">
                    <div className="h-1.5 w-full bg-indigo-400/40 rounded-full" />
                    <div className="h-1.5 w-4/5 bg-indigo-400/30 rounded-full" />
                    <div className="h-1.5 w-3/4 bg-indigo-400/20 rounded-full" />
                  </div>
                </div>
                <span className="text-[9px] text-slate-400 mt-2 font-mono flex items-center gap-1">
                  <Zap className="h-2.5 w-2.5 text-indigo-400" /> 75% faster
                </span>
              </div>

              {/* Model 2: Groq */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-300 mb-1">
                    <span>Qwen 3.8</span>
                    <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1 rounded">480 tps</span>
                  </div>
                  <div className="space-y-1">
                    <div className="h-1.5 w-full bg-emerald-400/40 rounded-full" />
                    <div className="h-1.5 w-5/6 bg-emerald-400/30 rounded-full" />
                    <div className="h-1.5 w-2/3 bg-emerald-400/20 rounded-full" />
                  </div>
                </div>
                <span className="text-[9px] text-slate-400 mt-2 font-mono flex items-center gap-1">
                  <Cpu className="h-2.5 w-2.5 text-emerald-400" /> Groq LPU
                </span>
              </div>

              {/* Model 3: OpenRouter */}
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-cyan-300 mb-1">
                    <span>Nemotron 3.5</span>
                    <span className="text-[9px] text-cyan-400 bg-cyan-500/10 px-1 rounded">Deep</span>
                  </div>
                  <div className="space-y-1">
                    <div className="h-1.5 w-full bg-cyan-400/40 rounded-full" />
                    <div className="h-1.5 w-3/4 bg-cyan-400/30 rounded-full" />
                    <div className="h-1.5 w-1/2 bg-cyan-400/20 rounded-full" />
                  </div>
                </div>
                <span className="text-[9px] text-slate-400 mt-2 font-mono flex items-center gap-1">
                  <Layers className="h-2.5 w-2.5 text-cyan-400" /> Reasoning
                </span>
              </div>
            </div>
          </div>

          {/* Value Props Row */}
          <div className="grid grid-cols-2 gap-4 mt-6 pt-2">
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <span>Private multi-tenant database isolation</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
                <Zap className="h-4 w-4" />
              </div>
              <span>Intelligent auto-failover fallback</span>
            </div>
          </div>
        </div>

        {/* Bottom footer notice */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 pt-6 border-t border-slate-800/60">
          <span>&copy; {new Date().getFullYear()} PolyMind Engine</span>
          <span>
            Developed &amp; Maintained by{" "}
            <strong className="text-slate-300 font-semibold">Mohammed Irfan</strong>
          </span>
        </div>
      </div>

      {/* RIGHT COLUMN: Ultra-Clean Authentication Form */}
      <div className="flex-1 lg:col-span-5 flex flex-col justify-between p-6 sm:p-12 relative">
        {/* Top navigation link */}
        <div className="flex items-center justify-between w-full">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition group"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition group-hover:-translate-x-0.5" />
            Back to PolyMind
          </Link>

          {/* Mobile only logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <Image src="/logo-icon.png" alt="PolyMind" width={22} height={22} />
            <span className="text-sm font-bold text-white">PolyMind</span>
          </div>
        </div>

        {/* Central Auth Container */}
        <div className="my-auto mx-auto w-full max-w-[420px] py-8">
          <div className="mb-6 text-center lg:text-left">
            <h2 className="text-2xl font-bold tracking-tight text-white">Welcome back</h2>
            <p className="text-xs text-slate-400 mt-1">
              Sign in to access your projects, saved API keys, and multi-model workspaces.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-surface-900/60 p-2 sm:p-4 backdrop-blur-xl shadow-2xl shadow-indigo-950/20">
            <Suspense
              fallback={
                <div className="h-96 w-full animate-pulse rounded-xl bg-surface-900/80 border border-slate-800 flex items-center justify-center text-xs text-slate-500">
                  Loading secure sign-in...
                </div>
              }
            >
              <SignIn
                routing="path"
                path="/sign-in"
                signUpUrl="/sign-up"
                fallbackRedirectUrl="/"
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "bg-transparent shadow-none border-0 p-2 sm:p-4",
                    headerTitle: "text-lg font-bold text-slate-100",
                    headerSubtitle: "text-xs text-slate-400",
                    formButtonPrimary:
                      "bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 transition shadow-lg shadow-indigo-600/25 rounded-lg",
                    formFieldInput:
                      "bg-surface-950 border-slate-800 text-slate-200 text-xs focus:ring-indigo-500 focus:border-indigo-500 rounded-lg",
                    formFieldLabel: "text-xs font-medium text-slate-300",
                    footerActionLink: "text-indigo-400 hover:text-indigo-300 font-medium text-xs",
                    dividerLine: "bg-slate-800",
                    dividerText: "text-[11px] text-slate-500 uppercase",
                    socialButtonsBlockButton:
                      "border-slate-800 bg-surface-950 hover:bg-surface-800 text-slate-200 text-xs transition rounded-lg",
                    socialButtonsBlockButtonText: "text-slate-200 font-medium text-xs",
                  },
                }}
              />
            </Suspense>
          </div>
        </div>

        {/* Minimalist footer */}
        <div className="text-center text-[11px] text-slate-500 pt-4">
          Developed &amp; Maintained by <span className="text-slate-300 font-medium">Mohammed Irfan</span> &bull; End-to-end encrypted
        </div>
      </div>
    </div>
  );
}