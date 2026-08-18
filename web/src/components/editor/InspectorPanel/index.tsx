import React, { useState } from 'react';
import { Button } from '@douyinfe/semi-ui';
import { IconMore } from '@douyinfe/semi-icons';
import { useTimelineStore } from '@/stores/timelineStore';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import styles from './index.module.scss';

type Tab = 'adjust' | 'filters';

const InspectorPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('adjust');
  const { tracks, selectedClipId, updateClip } = useTimelineStore();
  const { t } = useAppTranslation();

  const selectedClip = selectedClipId
    ? tracks.flatMap((t) => t.clips).find((c) => c.id === selectedClipId) ?? null
    : null;

  const isVideo = selectedClip && tracks.some((t) => t.clips.some((c) => c.id === selectedClipId && t.type === 'video'));
  const isAudio = selectedClip && tracks.some((t) => t.clips.some((c) => c.id === selectedClipId && t.type === 'audio'));
  const isCaption = selectedClip && tracks.some((t) => t.clips.some((c) => c.id === selectedClipId && t.type === 'caption'));

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'adjust' ? styles.active : ''}`}
            onClick={() => setActiveTab('adjust')}
          >
            {t('editor.inspector.adjustColors')}
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'filters' ? styles.active : ''}`}
            onClick={() => setActiveTab('filters')}
          >
            {t('editor.inspector.filters')}
          </button>
        </div>
        <Button icon={<IconMore />} theme="borderless" size="small" className={styles.moreBtn} />
      </div>

      <div className={styles.content}>
        {!selectedClip ? (
          <div className={styles.empty}>{t('editor.inspector.selectClip')}</div>
        ) : (
          <>
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h4 className={styles.sectionTitle}>{t('editor.inspector.clipInfo')}</h4>
                <button className={styles.resetBtn}>{t('common.reset')}</button>
              </div>
              <div className={styles.controlGroup}>
                <div className={styles.controlRow}>
                  <span className={styles.controlLabel}>{t('editor.inspector.start')}</span>
                  <span className={styles.valueText}>{selectedClip.start.toFixed(2)}s</span>
                </div>
                <div className={styles.controlRow}>
                  <span className={styles.controlLabel}>{t('editor.inspector.durationLabel')}</span>
                  <span className={styles.valueText}>{selectedClip.duration.toFixed(2)}s</span>
                </div>
                {isCaption && (
                  <div className={styles.controlRow}>
                    <span className={styles.controlLabel}>{t('editor.inspector.text')}</span>
                    <input
                      type="text"
                      className={styles.textInput}
                      value={selectedClip.text ?? ''}
                      onChange={(e) => updateClip(selectedClip.id, { text: e.target.value })}
                    />
                  </div>
                )}
              </div>
            </section>

            {isVideo && (
              <>
                <div className={styles.divider} />
                <section className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <h4 className={styles.sectionTitle}>{t('editor.inspector.tone')}</h4>
                    <button className={styles.resetBtn}>{t('common.reset')}</button>
                  </div>
                  <div className={styles.controlGroup}>
                    <div className={styles.controlRow}>
                      <span className={styles.controlLabel}>{t('editor.inspector.brightness')}</span>
                      <input type="range" min="-100" max="100" defaultValue="0" className={styles.rangeFlex} />
                      <input type="number" className={styles.numberInputSm} defaultValue={0} />
                    </div>
                    <div className={styles.controlRow}>
                      <span className={styles.controlLabel}>{t('editor.inspector.contrast')}</span>
                      <input type="range" min="-100" max="100" defaultValue="0" className={styles.rangeFlex} />
                      <input type="number" className={styles.numberInputSm} defaultValue={0} />
                    </div>
                  </div>
                </section>
              </>
            )}

            {isAudio && (
              <>
                <div className={styles.divider} />
                <section className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <h4 className={styles.sectionTitle}>{t('editor.inspector.volume')}</h4>
                    <button className={styles.resetBtn}>{t('common.reset')}</button>
                  </div>
                  <div className={styles.controlGroup}>
                    <div className={styles.controlRow}>
                      <span className={styles.controlLabel}>{t('editor.inspector.volume')}</span>
                      <input type="range" min="0" max="100" defaultValue={Math.round((selectedClip.volume ?? 1) * 100)} className={styles.rangeFlex} />
                      <input type="number" className={styles.numberInputSm} defaultValue={Math.round((selectedClip.volume ?? 1) * 100)} />
                    </div>
                  </div>
                </section>
              </>
            )}

            <div className={styles.divider} />

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h4 className={styles.sectionTitle}>{t('editor.inspector.quickFilters')}</h4>
                <button className={styles.resetBtn}>{t('common.seeAll')}</button>
              </div>
              <div className={styles.filterGrid}>
                {[
                  { name: t('editor.inspector.none'), active: true },
                  { name: t('editor.inspector.vivid'), active: false },
                  { name: t('editor.inspector.charm'), active: false },
                  { name: t('editor.inspector.sky'), active: false },
                ].map((filter) => (
                  <div key={filter.name} className={`${styles.filterItem} ${filter.active ? styles.active : ''}`}>
                    <div className={styles.filterPreview}>
                      <div className={styles.filterPlaceholder} />
                    </div>
                    <span className={styles.filterName}>{filter.name}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default InspectorPanel;
