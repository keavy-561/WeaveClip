import React, { useState } from 'react';
import { Button } from '@douyinfe/semi-ui';
import { IconMore } from '@douyinfe/semi-icons';
import { useTimelineStore } from '@/stores/timelineStore';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import styles from './index.module.scss';

type Tab = 'adjust' | 'filters';

interface RangeRowProps {
  label: string;
  min?: number;
  max?: number;
  defaultValue?: number;
  /** 彩虹渐变轨道（Hue） */
  rainbow?: boolean;
  /** 激活高亮（Blur） */
  active?: boolean;
}

const RangeRow: React.FC<RangeRowProps> = ({
  label,
  min = -100,
  max = 100,
  defaultValue = 0,
  rainbow = false,
  active = false,
}) => {
  const [value, setValue] = useState(defaultValue);
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className={styles.controlRow}>
      <span className={`${styles.controlLabel} ${active ? styles.activeLabel : ''}`}>{label}</span>
      {active ? (
        <div className={styles.sliderWrap}>
          <div className={styles.sliderTrack} style={{ width: `${pct}%` }} />
          <input
            type="range"
            className={styles.rangeActive}
            min={min}
            max={max}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
          />
          <div className={styles.sliderThumb} style={{ left: `${pct}%` }} />
        </div>
      ) : (
        <input
          type="range"
          className={`${styles.rangeFlex} ${rainbow ? styles.rainbowTrack : ''}`}
          min={min}
          max={max}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
        />
      )}
      <input
        type="number"
        className={`${styles.numberInputSm} ${active ? styles.activeInput : ''}`}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
      />
    </div>
  );
};

/** 白平衡：色温/色调（带色点标注，对齐设计稿 280px Inspector） */
const WhiteBalanceSection: React.FC = () => {
  const { t } = useAppTranslation();
  const [colorTemp, setColorTemp] = useState(0);
  const [tint, setTint] = useState(0);

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h4 className={styles.sectionTitle}>{t('editor.inspector.whiteBalance')}</h4>
        <Button theme="borderless" size="small" className={styles.resetBtn}>
          {t('common.reset')}
        </Button>
      </div>
      <div className={styles.controlGroup}>
        <div className={styles.wbRow}>
          <span className={styles.wbLabel}>{t('editor.inspector.colorTemp')}</span>
          <input type="number" className={styles.wbInput} value={colorTemp} onChange={(e) => setColorTemp(Number(e.target.value))} />
        </div>
        <div className={styles.balanceRow}>
          <span className={`${styles.sliderDot} ${styles.dotCool}`} />
          <input type="range" min="-100" max="100" value={colorTemp} onChange={(e) => setColorTemp(Number(e.target.value))} className={styles.range} />
          <span className={`${styles.sliderDot} ${styles.dotWarm}`} />
        </div>
        <div className={styles.wbRow}>
          <span className={styles.wbLabel}>{t('editor.inspector.tint')}</span>
          <input type="number" className={styles.wbInput} value={tint} onChange={(e) => setTint(Number(e.target.value))} />
        </div>
        <div className={styles.balanceRow}>
          <span className={`${styles.sliderDot} ${styles.dotGreen}`} />
          <input type="range" min="-100" max="100" value={tint} onChange={(e) => setTint(Number(e.target.value))} className={styles.range} />
          <span className={`${styles.sliderDot} ${styles.dotPurple}`} />
        </div>
      </div>
    </section>
  );
};

const InspectorPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('adjust');
  const [activeFilter, setActiveFilter] = useState<string>('none');
  const { tracks, selectedClipId, updateClip } = useTimelineStore();
  const { t } = useAppTranslation();

  const selectedClip = selectedClipId
    ? tracks.flatMap((tr) => tr.clips).find((c) => c.id === selectedClipId) ?? null
    : null;

  const selectedType = tracks.find((tr) => tr.clips.some((c) => c.id === selectedClipId))?.type;

  const toneRows = [
    { label: t('editor.inspector.brightness') },
    { label: t('editor.inspector.contrast') },
    { label: t('editor.inspector.saturation') },
    { label: t('editor.inspector.exposure') },
  ];

  const creativeRows = [
    { label: t('editor.inspector.hue'), rainbow: true },
    { label: t('editor.inspector.sharpness'), min: 0 },
    { label: t('editor.inspector.blur'), min: 0, defaultValue: 20, active: true },
  ];

  const filters = [
    { key: 'none', name: t('editor.inspector.none'), preview: 'previewNone' },
    { key: 'vivid', name: t('editor.inspector.vivid'), preview: 'previewVivid' },
    { key: 'charm', name: t('editor.inspector.charm'), preview: 'previewCharm' },
    { key: 'sky', name: t('editor.inspector.sky'), preview: 'previewSky' },
  ];

  const renderVideoSections = () => (
    <>
      <WhiteBalanceSection />
      <div className={styles.divider} />
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h4 className={styles.sectionTitle}>{t('editor.inspector.tone')}</h4>
          <Button theme="borderless" size="small" className={styles.resetBtn}>
            {t('common.reset')}
          </Button>
        </div>
        <div className={styles.controlGroup}>
          {toneRows.map((row) => (
            <RangeRow key={row.label} label={row.label} />
          ))}
        </div>
      </section>
      <div className={styles.divider} />
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h4 className={styles.sectionTitle}>
            {t('editor.inspector.creative')}
            <span className={styles.aiBadge}>✦</span>
          </h4>
          <Button theme="borderless" size="small" className={styles.resetBtn}>
            {t('common.reset')}
          </Button>
        </div>
        <div className={styles.controlGroup}>
          {creativeRows.map((row) => (
            <RangeRow
              key={row.label}
              label={row.label}
              min={row.min}
              defaultValue={row.defaultValue}
              rainbow={row.rainbow}
              active={row.active}
            />
          ))}
        </div>
      </section>
      <div className={styles.divider} />
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h4 className={styles.sectionTitle}>{t('editor.inspector.quickFilters')}</h4>
          <Button theme="borderless" size="small" className={styles.resetBtn}>
            {t('common.seeAll')}
          </Button>
        </div>
        <div className={styles.filterGrid}>
          {filters.map((filter) => (
            <Button
              key={filter.key}
              theme="borderless"
              className={`${styles.filterItem} ${activeFilter === filter.key ? styles.filterItemActive : ''}`}
              onClick={() => setActiveFilter(filter.key)}
            >
              <span className={`${styles.filterPreview} ${styles[filter.preview as keyof typeof styles]}`}>
                <span className={styles.filterPlaceholder} />
              </span>
              <span className={styles.filterName}>{filter.name}</span>
            </Button>
          ))}
        </div>
      </section>
    </>
  );

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.tabs}>
          <Button
            theme="borderless"
            className={`${styles.tab} ${activeTab === 'adjust' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('adjust')}
          >
            {t('editor.inspector.adjustColors')}
          </Button>
          <Button
            theme="borderless"
            className={`${styles.tab} ${activeTab === 'filters' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('filters')}
          >
            {t('editor.inspector.filters')}
          </Button>
        </div>
        <Button icon={<IconMore />} theme="borderless" size="small" className={styles.moreBtn} />
      </div>

      <div className={styles.content}>
        {!selectedClip ? (
          <div className={styles.empty}>{t('editor.inspector.selectClip')}</div>
        ) : (
          <>
            {selectedType === 'caption' && (
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h4 className={styles.sectionTitle}>{t('editor.inspector.text')}</h4>
                </div>
                <input
                  type="text"
                  className={styles.textInput}
                  defaultValue={selectedClip.text ?? ''}
                  onBlur={(e) => updateClip(selectedClip.id, { text: e.target.value })}
                  placeholder={t('editor.inspector.selectClip')}
                />
              </section>
            )}

            {selectedType === 'audio' && (
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h4 className={styles.sectionTitle}>{t('editor.inspector.volume')}</h4>
                  <Button theme="borderless" size="small" className={styles.resetBtn}>
                    {t('common.reset')}
                  </Button>
                </div>
                <RangeRow
                  label={t('editor.inspector.volume')}
                  min={0}
                  max={100}
                  defaultValue={Math.round((selectedClip.volume ?? 1) * 100)}
                />
              </section>
            )}

            {selectedType === 'video' && renderVideoSections()}
          </>
        )}
      </div>
    </div>
  );
};

export default InspectorPanel;