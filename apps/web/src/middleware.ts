import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api(.*)",
  "/favicon.ico",
  "/logo-icon.png",
  "/logo.png",
  "/icon.png",
]);

const hasClerkKey = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  process.env.CLERK_PUBLISHABLE_KEY
);

let clerkHandler: any = null;
if (hasClerkKey) {
  try {
    clerkHandler = clerkMiddleware(async (auth, req) => {
      // Public routes do not require login
      if (!isPublicRoute(req)) {
        await auth.protect();
      }
    });
  } catch (err) {
    console.error("Clerk middleware initialization failed:", err);
  }
}

export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  if (!hasClerkKey || !clerkHandler) {
    return NextResponse.next();
  }
  try {
    return await clerkHandler(req, event);
  } catch (err) {
    console.error("Clerk middleware invocation failed:", err);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
