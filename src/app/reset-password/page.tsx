"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import Input from "@/components/forms/Input";
import { api } from "@/lib/api";
import { useLocale } from "@/LocaleContext";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!challengeId) {
        const challenge = await api.auth.password.reset.request({ email });
        if (!challenge.challengeId) {
          setNotice(t("auth.resetPassword.codeSentNotice"));
          return;
        }

        setChallengeId(challenge.challengeId);
        setNotice(t("auth.resetPassword.enterCodeNotice"));
        return;
      }

      await api.auth.password.reset.confirm({
        email,
        challengeId,
        code,
        newPassword,
      });

      setNotice(t("auth.resetPassword.updated"));
      router.push("/login");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : t("auth.resetPassword.failed"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-8 max-w-md mx-auto">
      <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
        {t("auth.resetPassword.title")}
      </h1>
      <p className="text-[var(--color-muted)] mb-6">
        {t("auth.resetPassword.subtitle")}
      </p>

      <form
        onSubmit={onSubmit}
        className="bg-[var(--color-card)] rounded-2xl p-6 space-y-4"
      >
        <Input
          label={t("auth.email")}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />

        {challengeId && (
          <>
            <Input
              label={t("auth.emailCode")}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder={t("auth.codePlaceholder")}
              required
            />
            <Input
              label={t("auth.resetPassword.newPassword")}
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
          </>
        )}

        {notice && <p className="text-sm text-green-600">{notice}</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading
              ? t("auth.waiting")
              : challengeId
                ? t("auth.resetPassword.setPassword")
                : t("auth.resetPassword.sendCode")}
          </Button>
          <Button href="/login" variant="secondary" className="flex-1">
            {t("auth.register.toLogin")}
          </Button>
        </div>
      </form>
    </div>
  );
}
