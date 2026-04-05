"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLoginMutation } from "@/store/api/authApi";
import { setCredentials } from "@/store/slices/authSlice";
import { useAppDispatch } from "@/store/store";
import { loginSchema, type LoginFormData } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, Clock, Loader2 } from "lucide-react";

const DEMO_ACCOUNTS = [
  {
    label: "Admin",
    email: "corporate@coastaleats.com",
    role: "Corporate Admin",
  },
  {
    label: "Manager (NYC)",
    email: "james.wilson@coastaleats.com",
    role: "Manages Downtown & Midtown",
  },
  {
    label: "Manager (LA)",
    email: "sarah.chen@coastaleats.com",
    role: "Manages Westside & Marina",
  },
  {
    label: "Staff",
    email: "mike.johnson@coastaleats.com",
    role: "Bartender, Server",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const [login, { isLoading }] = useLoginMutation();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      const result = await login(data).unwrap();
      dispatch(setCredentials(result));
      const redirect = searchParams.get("redirect") || "/";
      // Use window.location for a hard navigation so the middleware
      // sees the freshly-set accessToken cookie on the very first request.
      window.location.href = redirect;
    } catch (err: any) {
      const message =
        err?.data?.message ||
        (typeof err?.data?.message === "object"
          ? err.data.message[0]
          : "Login failed. Please check your credentials.");
      setError(Array.isArray(message) ? message[0] : message);
    }
  };

  const fillDemoCredentials = (email: string) => {
    setValue("email", email);
    setValue("password", "Password123!");
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo / Branding */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Clock className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-primary">ShiftSync</h1>
          </div>
          <p className="text-muted-foreground">
            Coastal Eats Staff Scheduling Platform
          </p>
        </div>

        {/* Login Form */}
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access the platform
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@coastaleats.com"
                  autoComplete="email"
                  {...register("email")}
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register("password")}
                  aria-invalid={!!errors.password}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Demo Accounts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Demo Accounts</CardTitle>
            <CardDescription>
              Click to fill credentials (password:{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                Password123!
              </code>
              )
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => fillDemoCredentials(account.email)}
                className="flex items-center justify-between rounded-md border p-3 text-left text-sm transition-colors hover:bg-accent"
              >
                <div>
                  <span className="font-medium">{account.label}</span>
                  <p className="text-xs text-muted-foreground">
                    {account.role}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground truncate ml-2 max-w-[180px]">
                  {account.email}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
