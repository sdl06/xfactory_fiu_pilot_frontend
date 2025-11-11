import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

const ResetPasswordRedirect = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code =
      searchParams.get("resetCode") ||
      searchParams.get("code") ||
      searchParams.get("token") ||
      "";
    const email =
      searchParams.get("resetEmail") ||
      searchParams.get("email") ||
      "";

    const params = new URLSearchParams();
    if (code) {
      params.set("resetCode", code);
    }
    if (email) {
      params.set("resetEmail", email);
    }

    const nextUrl = params.toString();
    const target = nextUrl ? `/?${nextUrl}` : "/";
    window.location.replace(target);
  }, [searchParams]);

  return null;
};

export default ResetPasswordRedirect;
