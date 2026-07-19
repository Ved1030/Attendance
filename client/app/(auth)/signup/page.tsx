"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { z } from "zod";
import { Eye, EyeOff, UserPlus, Check } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { AuthFormWrapper } from "@/components/auth/auth-form-wrapper";
import { AuthIllustration } from "@/components/auth/auth-illustration";
import { AuthErrorCard } from "@/components/auth/auth-error-card";
import { toast } from "sonner";

const signupSchema = z
  .object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(255, "Name must be at most 255 characters"),
    email: z.email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be at most 128 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain uppercase, lowercase, and a number",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignupForm = z.infer<typeof signupSchema>;

const formItem = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ characters", met: password.length >= 8 },
    { label: "Uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Lowercase letter", met: /[a-z]/.test(password) },
    { label: "Number", met: /\d/.test(password) },
  ];

  if (!password) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="space-y-1.5"
    >
      {checks.map((check) => (
        <div key={check.label} className="flex items-center gap-1.5">
          <div
            className={`flex h-3.5 w-3.5 items-center justify-center rounded-full transition-colors ${
              check.met
                ? "bg-green-500/10 text-green-500"
                : "bg-muted text-muted-foreground/50"
            }`}
          >
            <Check className="h-2.5 w-2.5" />
          </div>
          <span
            className={`text-xs ${
              check.met ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {check.label}
          </span>
        </div>
      ))}
    </motion.div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  const passwordValue = watch("password", "");

  const onSubmit = async (data: SignupForm) => {
    try {
      setError(null);
      const supabase = createClient();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.name,
          },
        },
      });

      if (authError) {
        console.error("[signup] auth error:", JSON.stringify(authError, null, 2));
        if (
          authError.message.includes("already") ||
          authError.message.includes("registered")
        ) {
          setError(
            "An account with this email already exists. Please try signing in instead.",
          );
        } else if (
          authError.message.includes("weak") ||
          authError.message.includes("at least")
        ) {
          setError("Password is too weak. Please use a stronger password.");
        } else {
          setError(authError.message);
        }
        return;
      }

      const user = authData.user;
      if (!user) {
        console.error("[signup] signUp succeeded but no user returned");
        setError("Account creation failed. Please try again.");
        return;
      }

      console.log("[signup] user created:", user.id);

      toast.success("Account created successfully!", {
        description: "You can now sign in with your credentials.",
      });
      router.push("/login");
    } catch (err) {
      console.error("[signup] unexpected error:", err);
      setError(
        "Unable to connect. Please check your connection and try again.",
      );
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
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-foreground hover:underline"
              >
                Sign in
              </Link>
            </motion.p>
          }
        >
          <motion.div variants={formItem} className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Create an account
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your details to get started
            </p>
          </motion.div>

          <motion.form
            variants={formItem}
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
          >
            {error && <AuthErrorCard message={error} />}

            <motion.div variants={formItem} className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                autoComplete="name"
                aria-invalid={!!errors.name}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </motion.div>

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
                  placeholder="Create a strong password"
                  autoComplete="new-password"
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
              <PasswordStrength password={passwordValue} />
            </motion.div>

            <motion.div variants={formItem} className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  aria-invalid={!!errors.confirmPassword}
                  className="pr-10"
                  {...register("confirmPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={
                    showConfirm ? "Hide password" : "Show password"
                  }
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {errors.confirmPassword.message}
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
                    Creating account...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Create account
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
