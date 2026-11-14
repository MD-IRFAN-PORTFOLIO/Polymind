export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-950 text-white">
      <h2 className="text-2xl font-bold">404 - Page Not Found</h2>
      <a href="/" className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500">
        Return to Home
      </a>
    </div>
  );
}
