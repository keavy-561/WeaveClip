import React from 'react';
import { Button, Empty, Input, Select, Slider } from '@douyinfe/semi-ui';
import { IconChevronRight } from '@douyinfe/semi-icons';
import { useTimelineStore } from '@/stores/timelineStore';
import { useEditorUIStore, type InspectorTab } from '@/stores/editorUIStore';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import type { Clip } from '@/types/timeline';
import styles from './index.module.scss';

interface TabItem {
  key: InspectorTab;
  label: string;
}

interface ParamSliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** 数值后缀（如速度的 ×） */
  suffix?: string;
  onChange: (value: number) => void;
}

/** 参数滑杆行：Semi Slider + 数值显示，受控绑定到选中片段字段 */
const ParamSliderRow: React.FC<ParamSliderRowProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}) => (
  <div className={styles.controlRow}>
    <span className={styles.controlLabel}>{label}</span>
    <Slider
      className={styles.paramSlider}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(v) => onChange(v as number)}
    />
    <span className={styles.valueText}>{suffix ? `${value}${suffix}` : Math.round(value)}</span>
  </div>
);

const InspectorPanel: React.FC = () => {
  const activeTab = useEditorUIStore((s) => s.activeInspectorTab);
  const setInspectorTab = useEditorUIStore((s) => s.setInspectorTab);
  const toggleInspectorCollapsed = useEditorUIStore((s) => s.toggleInspectorCollapsed);
  const { tracks, selectedClipId, updateClip } = useTimelineStore();
  const { t } = useAppTranslation();

  const selectedClip = selectedClipId
    ? tracks.flatMap((tr) => tr.clips).find((c) => c.id === selectedClipId) ?? null
    : null;

  const selectedType = tracks.find((tr) => tr.clips.some((c) => c.id === selectedClipId))?.type;

  // tab 列表（调色/滤镜/调整/效果/字幕/速度，与 ToolSidebar 快捷按钮共用状态）
  const tabs: TabItem[] = [
    { key: 'color', label: t('editor.inspector.adjustColors') },
    { key: 'filter', label: t('editor.inspector.filters') },
    { key: 'adjust', label: t('editor.sidebar.adjustments') },
    { key: 'effect', label: t('editor.sidebar.effects') },
    { key: 'caption', label: t('editor.sidebar.captions') },
    { key: 'speed', label: t('editor.sidebar.speed') },
  ];

  // 选中片段的受控参数（缺省值与设计稿一致）
  const brightness = selectedClip?.brightness ?? 0;
  const contrast = selectedClip?.contrast ?? 0;
  const volumePercent = Math.round((selectedClip?.volume ?? 1) * 100);
  const speed = selectedClip?.speed ?? 1;
  const filterParam = selectedClip?.params?.filter;
  const filterValue = typeof filterParam === 'string' ? filterParam : 'none';
  const effectValue = selectedClip?.effectType ?? 'none';

  const filters = [
    { key: 'none', name: t('editor.inspector.none'), preview: 'previewNone' },
    { key: 'vivid', name: t('editor.inspector.vivid'), preview: 'previewVivid' },
    { key: 'charm', name: t('editor.inspector.charm'), preview: 'previewCharm' },
    { key: 'sky', name: t('editor.inspector.sky'), preview: 'previewSky' },
  ];

  const effectOptions = [
    { value: 'none', label: t('editor.inspector.effectNone') },
    { value: 'vivid', label: t('editor.inspector.vivid') },
    { value: 'mono', label: t('editor.inspector.mono') },
    { value: 'vintage', label: t('editor.inspector.vintage') },
  ];

  const filterOptions = filters.map((f) => ({ value: f.key, label: f.name }));

  /** 更新选中片段的顶层字段 */
  const patchClip = (updates: Partial<Clip>) => {
    if (selectedClip) updateClip(selectedClip.id, updates);
  };

  /** 更新选中片段的 params（如滤镜） */
  const patchParams = (patch: Record<string, unknown>) => {
    if (selectedClip)
      updateClip(selectedClip.id, { params: { ...(selectedClip.params ?? {}), ...patch } });
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.tabs}>
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              theme="borderless"
              className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
              aria-pressed={activeTab === tab.key}
              onClick={() => setInspectorTab(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        {/* 收起检查器（WO5-05 右侧面板可收起）：替代原先无功能的 IconMore 死按钮 */}
        <Button
          icon={<IconChevronRight />}
          theme="borderless"
          size="small"
          className={styles.moreBtn}
          onClick={toggleInspectorCollapsed}
          aria-label={t('common.collapse')}
        />
      </div>

      <div className={styles.content}>
        {!selectedClip ? (
          <div className={styles.empty}>
            <Empty description={t('editor.inspector.selectClip')} />
          </div>
        ) : (
          <>
            {activeTab === 'color' && (
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h4 className={styles.sectionTitle}>{t('editor.inspector.adjustColors')}</h4>
                  <Button
                    theme="borderless"
                    size="small"
                    className={styles.resetBtn}
                    onClick={() => patchClip({ brightness: 0, contrast: 0 })}
                  >
                    {t('common.reset')}
                  </Button>
                </div>
                <div className={styles.controlGroup}>
                  <ParamSliderRow
                    label={t('editor.inspector.brightness')}
                    value={brightness}
                    min={-100}
                    max={100}
                    onChange={(v) => patchClip({ brightness: v })}
                  />
                  <ParamSliderRow
                    label={t('editor.inspector.contrast')}
                    value={contrast}
                    min={-100}
                    max={100}
                    onChange={(v) => patchClip({ contrast: v })}
                  />
                </div>
              </section>
            )}

            {activeTab === 'filter' && (
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h4 className={styles.sectionTitle}>{t('editor.inspector.filters')}</h4>
                  <Button
                    theme="borderless"
                    size="small"
                    className={styles.resetBtn}
                    onClick={() => patchParams({ filter: 'none' })}
                  >
                    {t('common.reset')}
                  </Button>
                </div>
                <div className={styles.paramSelectWrap}>
                  <Select
                    className={styles.paramSelect}
                    value={filterValue}
                    optionList={filterOptions}
                    onChange={(v) => patchParams({ filter: v as string })}
                  />
                </div>
                <div className={styles.filterGrid}>
                  {filters.map((filter) => (
                    <Button
                      key={filter.key}
                      theme="borderless"
                      className={`${styles.filterItem} ${filterValue === filter.key ? styles.filterItemActive : ''}`}
                      onClick={() => patchParams({ filter: filter.key })}
                    >
                      <span className={`${styles.filterPreview} ${styles[filter.preview as keyof typeof styles]}`}>
                        <span className={styles.filterPlaceholder} />
                      </span>
                      <span className={styles.filterName}>{filter.name}</span>
                    </Button>
                  ))}
                </div>
              </section>
            )}

            {activeTab === 'adjust' && (
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h4 className={styles.sectionTitle}>{t('editor.sidebar.adjustments')}</h4>
                  <Button
                    theme="borderless"
                    size="small"
                    className={styles.resetBtn}
                    onClick={() => patchClip({ volume: 1 })}
                  >
                    {t('common.reset')}
                  </Button>
                </div>
                <div className={styles.controlGroup}>
                  <ParamSliderRow
                    label={t('editor.inspector.volume')}
                    value={volumePercent}
                    min={0}
                    max={100}
                    onChange={(v) => patchClip({ volume: v / 100 })}
                  />
                </div>
              </section>
            )}

            {activeTab === 'effect' && (
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h4 className={styles.sectionTitle}>{t('editor.inspector.effectType')}</h4>
                  <Button
                    theme="borderless"
                    size="small"
                    className={styles.resetBtn}
                    onClick={() => patchClip({ effectType: 'none' })}
                  >
                    {t('common.reset')}
                  </Button>
                </div>
                <div className={styles.paramSelectWrap}>
                  <Select
                    className={styles.paramSelect}
                    value={effectValue}
                    optionList={effectOptions}
                    onChange={(v) => patchClip({ effectType: v as string })}
                  />
                </div>
              </section>
            )}

            {activeTab === 'caption' && (
              selectedType === 'caption' ? (
                <section className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <h4 className={styles.sectionTitle}>{t('editor.inspector.text')}</h4>
                  </div>
                  <div className={styles.captionInputWrap}>
                    <Input
                      key={selectedClip.id}
                      className={styles.captionInput}
                      defaultValue={selectedClip.text ?? ''}
                      onBlur={(e) => updateClip(selectedClip.id, { text: e.target.value })}
                      placeholder={t('editor.inspector.text')}
                    />
                  </div>
                </section>
              ) : (
                <div className={styles.empty}>{t('editor.inspector.captionOnly')}</div>
              )
            )}

            {activeTab === 'speed' && (
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h4 className={styles.sectionTitle}>{t('editor.sidebar.speed')}</h4>
                  <Button
                    theme="borderless"
                    size="small"
                    className={styles.resetBtn}
                    onClick={() => patchClip({ speed: 1 })}
                  >
                    {t('common.reset')}
                  </Button>
                </div>
                <div className={styles.controlGroup}>
                  <ParamSliderRow
                    label={t('editor.sidebar.speed')}
                    value={speed}
                    min={0.25}
                    max={4}
                    step={0.25}
                    suffix="×"
                    onChange={(v) => patchClip({ speed: v })}
                  />
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default InspectorPanel;
