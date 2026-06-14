import { useTranslation } from 'react-i18next';
import { Check, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '../../store';

export function SettingsKnowledgeBase() {
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
          knowledgeBaseHttpUrl: settings.knowledgeBaseHttpUrl,
        },
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('[SettingsKnowledgeBase] Failed to save Knowledge Base settings:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-surface/70 p-5 space-y-4">
        <div>
          <h4 className="text-sm font-medium text-text-primary">{t('knowledgeBase.title')}</h4>
          <p className="mt-1 text-sm text-text-muted">{t('knowledgeBase.description')}</p>
        </div>

        <div className="rounded-xl border border-border-subtle bg-background/45 p-4 space-y-4">
          <div>
            <h5 className="text-sm font-medium text-text-primary">
              {t('knowledgeBase.httpGroupTitle')}
            </h5>
            <p className="mt-1 text-xs text-text-muted">{t('knowledgeBase.httpGroupDesc')}</p>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-text-primary">
              {t('knowledgeBase.httpUrl')}
            </span>
            <input
              type="url"
              value={settings.knowledgeBaseHttpUrl}
              onChange={(event) => updateSettings({ knowledgeBaseHttpUrl: event.target.value })}
              placeholder={t('knowledgeBase.httpUrlPlaceholder')}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </label>
        </div>

        <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
          <p className="text-sm text-text-muted">
            {saveStatus === 'saved'
              ? t('knowledgeBase.saveSuccess')
              : saveStatus === 'error'
                ? t('knowledgeBase.saveError')
                : t('knowledgeBase.saveHint')}
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
            {t('knowledgeBase.saveConfig')}
          </button>
        </div>
      </div>
    </div>
  );
}
