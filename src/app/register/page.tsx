"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import Input from "@/components/forms/Input";
import { api } from "@/lib/api";
import { getOrCreateDeviceId } from "@/lib/device";
import { useLocale } from "@/LocaleContext";

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const deviceId = getOrCreateDeviceId();

      if (!challengeId) {
        const challenge = await api.auth.register.start({
          name,
          email,
          password,
          deviceId,
        });
        setChallengeId(challenge.challengeId);
        setNotice(t("auth.register.codeSent"));
        setLoading(false);
        return;
      }

      await api.auth.register.verify({
        email,
        challengeId,
        code: verificationCode,
      });

      const login = await signIn("credentials", {
        email,
        password,
        deviceId,
        redirect: false,
        callbackUrl: "/liga",
      });

      if (!login || login.error) {
        router.push("/login");
        return;
      }

      router.push(login.url ?? "/liga");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("auth.register.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-8 max-w-md mx-auto">
      <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
        {t("auth.register.title")}
      </h1>
      <p className="text-[var(--color-muted)] mb-6">
        {t("auth.register.subtitle")}
      </p>

      <form
        onSubmit={onSubmit}
        className="bg-[var(--color-card)] rounded-2xl p-6 space-y-4"
      >
        <Input
          label={t("auth.register.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          required
        />
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
          autoComplete="new-password"
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
              ? t("auth.waiting")
              : challengeId
                ? t("auth.confirmCode")
                : t("auth.register.submit")}
          </Button>
          <Button href="/login" variant="secondary" className="flex-1">
            {t("auth.register.toLogin")}
          </Button>
        </div>
      </form>
    </div>
  );
}
