import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";

type ActivationStatus = "loading" | "ready" | "expired" | "invalid" | "already";

interface ActivationData {
  email: string;
  first_name?: string;
  program?: {
    id: number;
    name: string;
    slug: string;
    logo_url: string;
  } | null;
  expires_at?: string;
}

const MIN_PASSWORD_LENGTH = 8;

const passwordStrength = (value: string) => {
  if (!value) return { label: "Too short", score: 0 };
  let score = 0;
  if (value.length >= MIN_PASSWORD_LENGTH) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  switch (score) {
    case 0:
    case 1:
      return { label: "Weak", score: 25 };
    case 2:
      return { label: "Fair", score: 50 };
    case 3:
      return { label: "Good", score: 75 };
    case 4:
      return { label: "Strong", score: 100 };
    default:
      return { label: "Weak", score: 25 };
  }
};

export const ActivateAccount = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setAuthData } = useAuth();

  const [status, setStatus] = useState<ActivationStatus>("loading");
  const [activation, setActivation] = useState<ActivationData | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");

  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    setStatus("loading");
    apiClient.getActivationDetails(token).then((response) => {
      if (!isMounted) return;
      if (response.data) {
        setActivation(response.data as ActivationData);
        setStatus("ready");
      } else if (response.status === 410) {
        setActivation(response.data as ActivationData);
        setStatus("expired");
      } else if (response.status === 409) {
        setStatus("already");
      } else {
        setStatus("invalid");
      }
    }).catch(() => {
      if (isMounted) {
        setStatus("invalid");
      }
    });
    return () => {
      isMounted = false;
    };
  }, [token]);

  const strength = useMemo(() => passwordStrength(password), [password]);
  const expiresLabel = activation?.expires_at ? new Date(activation.expires_at).toLocaleString() : null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    if (password.length < MIN_PASSWORD_LENGTH) {
      toast({ title: "Choose a stronger password", description: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords do not match", description: "Please re-enter your password.", variant: "destructive" });
      return;
    }
    if (!termsAccepted) {
      toast({ title: "Accept the Terms", description: "You need to accept the Terms of Use to continue.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiClient.completeActivation({
        token,
        password,
        confirm_password: confirmPassword,
        accepted_terms: true,
      });
      if (response.data?.token && response.data?.user) {
        setAuthData(response.data.token, response.data.user);
        toast({ title: "Account activated", description: "Welcome to IvyFactory!" });
        navigate("/activate/create-team", { replace: true });
      } else {
        toast({ title: "Activation failed", description: response.error || "Please try again.", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Activation failed", description: error?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resendEmail) {
      toast({ title: "Enter your email", description: "Please provide the email that received the invite.", variant: "destructive" });
      return;
    }
    setResendState("sending");
    try {
      const response = await apiClient.resendActivationInvite(resendEmail);
      if (response.error) {
        toast({ title: "Unable to resend invite", description: response.error, variant: "destructive" });
        setResendState("idle");
      } else {
        toast({ title: "Invite sent", description: "Check your inbox for a fresh activation link." });
        setResendState("sent");
      }
    } catch (error: any) {
      toast({ title: "Unable to resend invite", description: error?.message || "Please try again.", variant: "destructive" });
      setResendState("idle");
    }
  };

  const renderHeaderCopy = () => {
    if (!activation) return null;
    return (
      <>
        <CardTitle>Welcome to IvyFactory</CardTitle>
        <CardDescription>
          You&apos;re joining {activation.program?.name || "your program"} as {activation.email}.
        </CardDescription>
      </>
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-12">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          {status === "ready" && renderHeaderCopy()}
          {status === "loading" && (
            <>
              <CardTitle>Checking your invite…</CardTitle>
              <CardDescription>Give us just a moment.</CardDescription>
            </>
          )}
          {status === "expired" && (
            <>
              <CardTitle>Activation link expired</CardTitle>
              <CardDescription>Request a new invite below.</CardDescription>
            </>
          )}
          {status === "invalid" && (
            <>
              <CardTitle>We couldn&apos;t verify that link</CardTitle>
              <CardDescription>Double-check the invite or ask for a new one.</CardDescription>
            </>
          )}
          {status === "already" && (
            <>
              <CardTitle>Your account is already active</CardTitle>
              <CardDescription>Please head to the login page to sign in.</CardDescription>
            </>
          )}
        </CardHeader>

        {status === "ready" && (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {expiresLabel && (
                <p className="text-sm text-muted-foreground">This link expires on {expiresLabel}.</p>
              )}
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Create a strong password"
                  required
                />
                <div className="flex items-center gap-2">
                  <Progress value={strength.score} className="h-2 w-40" />
                  <span className="text-xs text-muted-foreground">{strength.label}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Re-enter password"
                  required
                />
              </div>
              <div className="flex items-start gap-2 rounded-md border p-3">
                <Checkbox id="terms" checked={termsAccepted} onCheckedChange={(value) => setTermsAccepted(Boolean(value))} />
                <Label htmlFor="terms" className="text-sm leading-tight font-normal">
                  I agree to the{" "}
                  <a className="underline" href="https://ivyfactory.io/terms" target="_blank" rel="noreferrer">
                    Terms of Use
                  </a>
                  .
                </Label>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" type="submit" disabled={submitting}>
                {submitting ? "Creating your account…" : "Create Account"}
              </Button>
            </CardFooter>
          </form>
        )}

        {(status === "expired" || status === "invalid") && (
          <form onSubmit={handleResend}>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter your pre-approved email and we&apos;ll send a fresh invite. If your program is closed, reach out to your program admin.
              </p>
              <div className="space-y-2">
                <Label htmlFor="resendEmail">Email</Label>
                <Input
                  id="resendEmail"
                  type="email"
                  value={resendEmail}
                  onChange={(event) => setResendEmail(event.target.value)}
                  placeholder="you@example.edu"
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3">
              <Button className="w-full" type="submit" disabled={resendState === "sending"}>
                {resendState === "sending" ? "Sending…" : "Resend Invite"}
              </Button>
              {resendState === "sent" && (
                <p className="text-xs text-muted-foreground">
                  Invite sent! Be sure to check your spam folder if it doesn&apos;t arrive within a few minutes.
                </p>
              )}
              <Button
                variant="ghost"
                type="button"
                className="w-full"
                onClick={() => navigate("/auth/login")}
              >
                Back to login
              </Button>
            </CardFooter>
          </form>
        )}

        {status === "already" && (
          <CardFooter className="flex flex-col space-y-2">
            <Button className="w-full" onClick={() => navigate("/auth/login")}>
              Go to Login
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default ActivateAccount;
