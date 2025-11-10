import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Factory, Mail, KeyRound, ArrowLeft } from "lucide-react";
import { apiClient } from "@/lib/api";

type StatusMessage = { type: "success" | "error"; message: string };

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const initialVerificationCode = searchParams.get("code") || searchParams.get("token") || "";
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
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

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-gradient-conveyor">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-machinery rounded-lg flex items-center justify-center animate-machinery-hum">
              <Factory className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">xFactory</h1>
              <p className="text-sm text-muted-foreground">Account Recovery</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/")}
          >
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
                        <Link to="/" className="underline text-primary">
                          Return to login
                        </Link>
                        .
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
