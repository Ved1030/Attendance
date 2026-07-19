import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Attendance Pro - Authentication",
  description: "Sign in to manage your attendance",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
