"use client";

import { FormEvent, useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/Button";
import Input from "@/components/forms/Input";
import { api } from "@/lib/api";
import { getOrCreateDeviceId } from "@/lib/device";
import { useLocale } from "@/LocaleContext";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const callbackUrl = searchParams.get("callbackUrl") ?? "/liga";

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const deviceId = getOrCreateDeviceId();

      if (!challengeId) {
        const challenge = await api.auth.login.challenge({
          email,
          password,
          deviceId,
        });

        if (challenge.requiresVerification) {
          setChallengeId(challenge.challengeId);
          setNotice(t("auth.login.deviceVerification"));
          setLoading(false);
          return;
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        deviceId,
        challengeId,
        verificationCode,
        redirect: false,
        callbackUrl,
      });

      if (!result || result.error) {
        setError(t("auth.login.invalidCredentials"));
        return;
      }

      router.push(result.url ?? callbackUrl);
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("auth.login.failed");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-8 max-w-md mx-auto">
      <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
        {t("auth.login.title")}
      </h1>
      <p className="text-[var(--color-muted)] mb-6">
        {t("auth.login.subtitle")}
      </p>

      <form
        onSubmit={onSubmit}
        className="bg-[var(--color-card)] rounded-2xl p-6 space-y-4"
      >
        <Input
          label={t("auth.email")}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <Input
          label={t("auth.password")}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        {challengeId && (
          <Input
            label={t("auth.emailCode")}
            value={verificationCode}
            onChange={(event) => setVerificationCode(event.target.value)}
            placeholder={t("auth.codePlaceholder")}
            required
          />
        )}

        {notice && <p className="text-sm text-green-600">{notice}</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading
              ? t("auth.login.submitting")
              : challengeId
                ? t("auth.confirmCode")
                : t("auth.login.submit")}
          </Button>
          <Button href="/register" variant="secondary" className="flex-1">
            {t("auth.login.register")}
          </Button>
        </div>

        <Button href="/reset-password" variant="secondary" className="w-full">
          {t("auth.login.forgotPassword")}
        </Button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
