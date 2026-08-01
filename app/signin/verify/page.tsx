// app/signin/verify/page.tsx
export default function VerifyRequestPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-semibold mb-2">Check your email</h1>
        <p className="text-sm text-neutral-500">
          We sent you a magic link. Click it to sign in.
        </p>
      </div>
    </div>
  );
}