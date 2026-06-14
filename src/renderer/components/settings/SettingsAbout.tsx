import { useTranslation } from 'react-i18next';
import disstLogoSrc from '../../../../resources/disstlogo.png';

export function SettingsAbout() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-surface/70 p-6">
        <div className="flex flex-col items-center text-center">
          <img
            src={disstLogoSrc}
            alt={t('about.logoAlt')}
            className="w-28 h-28 rounded-[1.4rem] object-contain border border-border-subtle bg-background/60 p-2 shadow-soft"
          />
          <h4 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-text-primary">
            {t('about.productName')}
          </h4>
          <p className="mt-2 text-sm text-text-muted">{t('about.copyright')}</p>
        </div>
      </div>
    </div>
  );
}
