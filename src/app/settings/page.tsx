"use client";

import { useState } from "react";
import { CheckCircle, Check } from "lucide-react";
import Button from "@/components/Button";
import { useLocale } from "@/LocaleContext";
import { locales, localeNames, type Locale } from "@/i18n";

export default function SettingsPage() {
  const { locale, setLocale, t } = useLocale();
  const [selectedLanguage, setSelectedLanguage] = useState<Locale>(locale);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleLanguageChange = (newLocale: Locale) => {
    setSelectedLanguage(newLocale);
  };

  const handleSave = () => {
    if (selectedLanguage !== locale) {
      setLocale(selectedLanguage);
    }

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  if (showSuccess) {
    return (
      <div className="py-8 max-w-2xl mx-auto text-center">
        <div className="bg-[var(--color-card)] rounded-2xl p-8">
          <div className="mb-4 flex justify-center">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
            <span suppressHydrationWarning>{t("settings.saved")}</span>
          </h1>
          <p className="text-[var(--color-muted)] mb-6">
            <span suppressHydrationWarning>{t("settings.savedMessage")}</span>
          </p>
          <Button onClick={() => setShowSuccess(false)}>
            <span suppressHydrationWarning>{t("common.back")}</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Button href="/" variant="secondary" size="sm" className="mb-4">
          ← <span suppressHydrationWarning>{t("common.back")}</span>
        </Button>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">
          <span suppressHydrationWarning>{t("settings.title")}</span>
        </h1>
        <p className="text-[var(--color-muted)] mt-1">
          <span suppressHydrationWarning>{t("settings.subtitle")}</span>
        </p>
      </div>

      {/* Language Settings */}
      <div className="bg-[var(--color-card)] rounded-2xl p-6 mb-6">
        <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">
          <span suppressHydrationWarning>{t("settings.language.title")}</span>
        </h2>
        <p className="text-[var(--color-muted)] mb-4 text-sm">
          <span suppressHydrationWarning>
            {t("settings.language.description")}
          </span>
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              <span suppressHydrationWarning>
                {t("settings.language.current")}
              </span>
            </label>
            <div className="grid gap-3">
              {locales.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => handleLanguageChange(loc)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selectedLanguage === loc
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                      : "border-[var(--color-border)] hover:border-[var(--color-accent)]/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-[var(--foreground)]">
                        {localeNames[loc]}
                      </div>
                      <div className="text-sm text-[var(--color-muted)] mt-1">
                        {loc === "de" ? "German" : "English"}
                      </div>
                    </div>
                    {selectedLanguage === loc && (
                      <Check className="w-6 h-6 text-[var(--color-accent)]" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Appearance Settings (Placeholder) */}
      <div className="bg-[var(--color-card)] rounded-2xl p-6 mb-6 opacity-50">
        <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">
          <span suppressHydrationWarning>{t("settings.appearance.title")}</span>
        </h2>
        <p className="text-[var(--color-muted)] mb-4 text-sm">
          <span suppressHydrationWarning>
            {t("settings.appearance.description")}
          </span>
        </p>
      </div>

      {/* Save Button */}
      <div className="flex gap-4">
        <Button href="/" variant="secondary" className="flex-1">
          <span suppressHydrationWarning>{t("common.cancel")}</span>
        </Button>
        <Button onClick={handleSave} className="flex-1">
          <span suppressHydrationWarning>{t("settings.save")}</span>
        </Button>
      </div>
    </div>
  );
}
