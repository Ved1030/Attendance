"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/lib/auth-context";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

export default function HomePage() {
  const { isAuthenticated, isLoading, needsOnboarding } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (needsOnboarding) {
      router.replace("/setup");
      return;
    }

    router.replace("/dashboard");
  }, [isLoading, isAuthenticated, needsOnboarding, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}
