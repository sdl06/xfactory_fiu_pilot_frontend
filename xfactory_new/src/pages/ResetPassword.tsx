import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Factory, Mail, KeyRound, ArrowLeft } from "lucide-react";
import { apiClient } from "@/lib/api";

type StatusMessage = { type: "success" | "error"; message: string };

interface ResetPasswordProps {
  onBack: () => void;
  initialVerificationCode?: string;
  initialEmail?: string;
}

const ResetPassword = ({ onBack, initialVerificationCode = "", initialEmail = "" }: ResetPasswordProps) => {
  const [email, setEmail] = useState(initialEmail);
  const [verificationCode, setVerificationCode] = useState(initialVerificationCode);
  const [newPassword, setNewPassword] = useState("");

  const [isRequesting, setIsRequesting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [requestStatus, setRequestStatus] = useState<StatusMessage | null>(null);
  const [resetStatus, setResetStatus] = useState<StatusMessage | null>(null);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setRequestStatus({ type: "error", message: "Please enter your email." });
      return;
    }
    setIsRequesting(true);
    setRequestStatus(null);

    const response = await apiClient.requestPasswordReset(email);
    if (response.error) {
      setRequestStatus({ type: "error", message: response.error });
    } else {
      const message =
        (response.data as any)?.message ||
        "If an account with that email exists, a verification code has been sent.";
      setRequestStatus({ type: "success", message });
    }

    setIsRequesting(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || !newPassword) {
      setResetStatus({ type: "error", message: "Verification code and new password are required." });
      return;
    }
    if (newPassword.length < 8) {
      setResetStatus({ type: "error", message: "Password must be at least 8 characters long." });
      return;
    }

    setIsResetting(true);
    setResetStatus(null);

    const response = await apiClient.resetPasswordWithCode(verificationCode, newPassword);
    if (response.error) {
      setResetStatus({ type: "error", message: response.error });
    } else {
      const message =
        (response.data as any)?.message ||
        "Password has been reset. You can now log in with your new password.";
      setResetStatus({ type: "success", message });
      setNewPassword("");
      if (!initialVerificationCode) {
        setVerificationCode("");
      }
    }

    setIsResetting(false);
  };

  useEffect(() => {
    setVerificationCode(initialVerificationCode);
  }, [initialVerificationCode]);

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-gradient-conveyor relative">
        <div className="absolute left-0 top-0 h-full flex items-center gap-4 pl-6">
          <img
            src="/logos/prov_logo_white.png"
            alt="Ivy Factory Logo"
            className="h-8 w-auto object-contain"
            onError={(e) => {
              const imgElement = e.target as HTMLImageElement;
              imgElement.style.display = "none";
              const parent = imgElement.parentElement;
              if (parent) {
                const fallbackIcon = document.createElement("div");
                fallbackIcon.innerHTML =
                  '<svg class="h-8 w-8 text-accent-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>';
                parent.appendChild(fallbackIcon);
              }
            }}
          />
          <img
            src="/logos/fiualonetransreverse.png"
            alt="FIU Logo"
            className="h-8 w-auto object-contain"
            onError={(e) => {
              const imgElement = e.target as HTMLImageElement;
              imgElement.style.display = "none";
              const parent = imgElement.parentElement;
              if (parent) {
                const fallbackText = document.createElement("span");
                fallbackText.textContent = "FIU";
                fallbackText.className = "text-white font-bold text-lg";
                parent.appendChild(fallbackText);
              }
            }}
          />
        </div>
        <div className="absolute right-0 top-0 h-full flex items-center gap-3 pr-6">
          <Button variant="ghost" size="icon" className="h-10 w-10 text-white hover:bg-white/10 rounded-full" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3 pl-[116px] lg:pl-[140px]">
            <div className="w-10 h-10 bg-gradient-machinery rounded-lg flex items-center justify-center animate-machinery-hum">
              <Factory className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Ivy Factory</h1>
              <p className="text-sm text-white/80">Account Recovery</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to login
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="shadow-industrial">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Forgot your password?</CardTitle>
              <CardDescription>
                Enter your email address and we&apos;ll send you a one-time verification code.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleRequestReset}>
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isRequesting}
                  />
                </div>
                {requestStatus && (
                  <p
                    className={`text-sm ${
                      requestStatus.type === "success" ? "text-green-600" : "text-destructive"
                    }`}
                  >
                    {requestStatus.message}
                  </p>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  variant="machinery"
                  disabled={isRequesting}
                >
                  {isRequesting ? "Sending..." : "Send Verification Code"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-industrial">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <KeyRound className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Reset password with verification code</CardTitle>
              <CardDescription>
                Enter the verification code you received via email and set a new password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleResetPassword}>
                <div className="space-y-2">
                  <Label htmlFor="code">Verification code</Label>
                  <Input
                    id="code"
                    placeholder="8-character code (e.g., AB12CD34)"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    required
                    disabled={isResetting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={8}
                    required
                    disabled={isResetting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Password must be at least 8 characters long.
                  </p>
                </div>
                {resetStatus && (
                  <p
                    className={`text-sm ${
                      resetStatus.type === "success" ? "text-green-600" : "text-destructive"
                    }`}
                  >
                    {resetStatus.message}
                    {resetStatus.type === "success" && (
                      <>
                        {" "}
                        <button type="button" className="underline text-primary" onClick={onBack}>
                        Return to login.
                        </button>
                      </>
                    )}
                  </p>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  variant="machinery"
                  disabled={isResetting}
                >
                  {isResetting ? "Resetting..." : "Reset Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
