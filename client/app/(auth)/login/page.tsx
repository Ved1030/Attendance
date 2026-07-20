"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { z } from "zod";
import { Eye, EyeOff, LogIn } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { AuthFormWrapper } from "@/components/auth/auth-form-wrapper";
import { AuthIllustration } from "@/components/auth/auth-illustration";
import { AuthErrorCard } from "@/components/auth/auth-error-card";

const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

const formItem = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setError(null);
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        if (authError.message.includes("Invalid login credentials")) {
          setError("Invalid email or password. Please try again.");
        } else if (authError.message.includes("Email not confirmed")) {
          setError("No account found with this email.");
        } else {
          setError(authError.message);
        }
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Unable to connect. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 flex">
      <div className="hidden w-1/2 lg:block">
        <AuthIllustration />
      </div>

      <div className="flex w-full flex-1 flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-12">
        <AuthFormWrapper
          footer={
            <motion.p
              variants={formItem}
              className="text-center text-sm text-muted-foreground"
            >
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-medium text-foreground hover:underline"
              >
                Sign up
              </Link>
            </motion.p>
          }
        >
          <motion.div variants={formItem} className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to your account to continue
            </p>
          </motion.div>

          <motion.form
            variants={formItem}
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
          >
            {error && <AuthErrorCard message={error} />}

            <motion.div variants={formItem} className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </motion.div>

            <motion.div variants={formItem} className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  className="pr-10"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
            </motion.div>

            <motion.div variants={formItem}>
              <Button
                type="submit"
                className="h-10 w-full text-sm"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner
                      size="sm"
                      className="text-primary-foreground"
                    />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Sign in
                  </>
                )}
              </Button>
            </motion.div>
          </motion.form>
        </AuthFormWrapper>
      </div>
    </div>
  );
}
