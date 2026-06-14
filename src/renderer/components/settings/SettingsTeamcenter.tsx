import { useTranslation } from 'react-i18next';
import { Check, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '../../store';

export function SettingsTeamcenter() {
  const { t } = useTranslation();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'error' | null>(null);

  async function saveConfig() {
    if (typeof window === 'undefined' || !window.electronAPI) return;

    setIsSaving(true);
    setSaveStatus(null);
    try {
      await window.electronAPI.invoke({
        type: 'settings.update',
        payload: {
          teamcenterWebTierUrl: settings.teamcenterWebTierUrl,
          teamcenterRichClientMicroserviceUrl: settings.teamcenterRichClientMicroserviceUrl,
          teamcenterAccount: settings.teamcenterAccount,
          teamcenterPassword: settings.teamcenterPassword,
        },
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('[SettingsTeamcenter] Failed to save Teamcenter settings:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-surface/70 p-5 space-y-4">
        <div>
          <h4 className="text-sm font-medium text-text-primary">{t('teamcenter.title')}</h4>
          <p className="mt-1 text-sm text-text-muted">{t('teamcenter.description')}</p>
        </div>

        <div className="rounded-xl border border-border-subtle bg-background/45 p-4 space-y-4">
          <div>
            <h5 className="text-sm font-medium text-text-primary">
              {t('teamcenter.webTierGroupTitle')}
            </h5>
            <p className="mt-1 text-xs text-text-muted">{t('teamcenter.webTierGroupDesc')}</p>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-text-primary">
              {t('teamcenter.webTierUrl')}
            </span>
            <input
              type="url"
              value={settings.teamcenterWebTierUrl}
              onChange={(event) => updateSettings({ teamcenterWebTierUrl: event.target.value })}
              placeholder={t('teamcenter.webTierUrlPlaceholder')}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-text-primary">{t('teamcenter.account')}</span>
            <input
              type="text"
              value={settings.teamcenterAccount}
              onChange={(event) => updateSettings({ teamcenterAccount: event.target.value })}
              placeholder={t('teamcenter.accountPlaceholder')}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-text-primary">
              {t('teamcenter.password')}
            </span>
            <input
              type="password"
              value={settings.teamcenterPassword}
              onChange={(event) => updateSettings({ teamcenterPassword: event.target.value })}
              placeholder={t('teamcenter.passwordPlaceholder')}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </label>
        </div>

        <div className="rounded-xl border border-border-subtle bg-background/45 p-4 space-y-4">
          <div>
            <h5 className="text-sm font-medium text-text-primary">
              {t('teamcenter.richClientMicroserviceGroupTitle')}
            </h5>
            <p className="mt-1 text-xs text-text-muted">
              {t('teamcenter.richClientMicroserviceGroupDesc')}
            </p>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-text-primary">
              {t('teamcenter.richClientMicroserviceUrl')}
            </span>
            <input
              type="url"
              value={settings.teamcenterRichClientMicroserviceUrl}
              onChange={(event) =>
                updateSettings({ teamcenterRichClientMicroserviceUrl: event.target.value })
              }
              placeholder={t('teamcenter.richClientMicroserviceUrlPlaceholder')}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </label>
        </div>

        <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
          <p className="text-sm text-text-muted">
            {saveStatus === 'saved'
              ? t('teamcenter.saveSuccess')
              : saveStatus === 'error'
                ? t('teamcenter.saveError')
                : t('teamcenter.saveHint')}
          </p>
          <button
            onClick={saveConfig}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-accent hover:bg-accent/90 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {t('teamcenter.saveConfig')}
          </button>
        </div>
      </div>
    </div>
  );
}
