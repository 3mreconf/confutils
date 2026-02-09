import { useMemo } from 'react';
import { Layers, Shield, Sparkles, Sliders, AlertTriangle } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import tweaksRaw from '../data/toolbox_tweaks.json';
import presetsRaw from '../data/toolbox_presets.json';
import AdvancedTweaks from './AdvancedTweaks';
import Presets from './Presets';

interface TweaksProps {
  showToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
  externalQuery?: string;
}

type TweakItem = {
  category?: string;
};

const getRiskLevel = (category?: string) => {
  const label = (category || '').toLowerCase();
  if (label.includes('caution') || label.includes('danger') || label.includes('advanced') || label.includes('z__advanced')) {
    return 'high';
  }
  if (label.includes('privacy') || label.includes('debloat') || label.includes('performance')) {
    return 'medium';
  }
  return 'low';
};

export default function Tweaks({ showToast, externalQuery }: TweaksProps) {
  const { t } = useI18n();

  const summary = useMemo(() => {
    const items = Object.values(tweaksRaw as Record<string, TweakItem>);
    const categories = new Set(items.map((item) => item.category || 'Other'));
    const risk = { high: 0, medium: 0, low: 0 };
    items.forEach((item) => {
      const level = getRiskLevel(item.category);
      risk[level] += 1;
    });
    return {
      total: items.length,
      categories: categories.size,
      high: risk.high,
      medium: risk.medium,
      low: risk.low,
      presets: Object.keys(presetsRaw as Record<string, string[]>).length
    };
  }, []);

  return (
    <div className="tweaks-page">
      <div className="tweaks-hero">
        <div className="tweaks-hero-card">
          <div className="tweaks-hero-title">
            <div className="tweaks-hero-icon">
              <Sliders size={22} />
            </div>
            <div>
              <h2 className="tweaks-title">{t('tweaks_title' as any)}</h2>
              <p className="text-muted mt-sm">{t('tweaks_subtitle' as any)}</p>
            </div>
          </div>
          <div className="tweaks-pill-row">
            <span className="tweaks-pill">
              <Shield size={14} />
              {t('tweaks_hint_rollback' as any)}
            </span>
            <span className="tweaks-pill">
              <AlertTriangle size={14} />
              {t('tweaks_hint_risk' as any)}
            </span>
            <span className="tweaks-pill">
              <Sparkles size={14} />
              {t('tweaks_hint_filters' as any)}
            </span>
          </div>
        </div>

        <div className="tweaks-metrics">
          <div className="tweaks-metric-card">
            <span className="tweaks-metric-label">{t('tweaks_total' as any)}</span>
            <span className="tweaks-metric-value">{summary.total}</span>
          </div>
          <div className="tweaks-metric-card">
            <span className="tweaks-metric-label">{t('tweaks_categories' as any)}</span>
            <span className="tweaks-metric-value">{summary.categories}</span>
          </div>
          <div className="tweaks-metric-card warning">
            <span className="tweaks-metric-label">{t('tweaks_high_risk' as any)}</span>
            <span className="tweaks-metric-value">{summary.high}</span>
          </div>
          <div className="tweaks-metric-card">
            <span className="tweaks-metric-label">{t('tweaks_presets' as any)}</span>
            <span className="tweaks-metric-value">{summary.presets}</span>
          </div>
        </div>
      </div>

      <div className="tweaks-section">
        <div className="tweaks-section-header">
          <div className="tweaks-section-title">
            <Layers size={18} />
            <h3>{t('tweaks_presets_title' as any)}</h3>
          </div>
          <p className="text-muted">{t('tweaks_presets_subtitle' as any)}</p>
        </div>
        <Presets showToast={showToast} compact />
      </div>

      <div className="tweaks-section">
        <div className="tweaks-section-header">
          <div className="tweaks-section-title">
            <Sparkles size={18} />
            <h3>{t('tweaks_all_title' as any)}</h3>
          </div>
          <p className="text-muted">{t('tweaks_all_subtitle' as any)}</p>
        </div>
        <AdvancedTweaks showToast={showToast} compact externalQuery={externalQuery} />
      </div>
    </div>
  );
}
