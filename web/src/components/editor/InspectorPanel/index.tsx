import React, { useState } from 'react';
import { Button } from '@douyinfe/semi-ui';
import { IconMore } from '@douyinfe/semi-icons';
import { useTimelineStore } from '@/stores/timelineStore';
import styles from './index.module.scss';

type Tab = 'adjust' | 'filters';

const InspectorPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('adjust');
  const { tracks, selectedClipId, updateClip } = useTimelineStore();

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
            Adjust Colors
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'filters' ? styles.active : ''}`}
            onClick={() => setActiveTab('filters')}
          >
            Filters
          </button>
        </div>
        <Button icon={<IconMore />} theme="borderless" size="small" className={styles.moreBtn} />
      </div>

      <div className={styles.content}>
        {!selectedClip ? (
          <div className={styles.empty}>Select a clip to inspect</div>
        ) : (
          <>
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h4 className={styles.sectionTitle}>Clip Info</h4>
                <button className={styles.resetBtn}>Reset</button>
              </div>
              <div className={styles.controlGroup}>
                <div className={styles.controlRow}>
                  <span className={styles.controlLabel}>Start</span>
                  <span className={styles.valueText}>{selectedClip.start.toFixed(2)}s</span>
                </div>
                <div className={styles.controlRow}>
                  <span className={styles.controlLabel}>Duration</span>
                  <span className={styles.valueText}>{selectedClip.duration.toFixed(2)}s</span>
                </div>
                {isCaption && (
                  <div className={styles.controlRow}>
                    <span className={styles.controlLabel}>Text</span>
                    <input
                      type="text"
                      className={styles.textInput}
                      value={(selectedClip as any).text ?? ''}
                      onChange={(e) => updateClip(selectedClip.id, { text: e.target.value } as any)}
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
                    <h4 className={styles.sectionTitle}>Tone</h4>
                    <button className={styles.resetBtn}>Reset</button>
                  </div>
                  <div className={styles.controlGroup}>
                    <div className={styles.controlRow}>
                      <span className={styles.controlLabel}>Brightness</span>
                      <input type="range" min="-100" max="100" defaultValue="0" className={styles.rangeFlex} />
                      <input type="number" className={styles.numberInputSm} defaultValue={0} />
                    </div>
                    <div className={styles.controlRow}>
                      <span className={styles.controlLabel}>Contrast</span>
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
                    <h4 className={styles.sectionTitle}>Audio</h4>
                    <button className={styles.resetBtn}>Reset</button>
                  </div>
                  <div className={styles.controlGroup}>
                    <div className={styles.controlRow}>
                      <span className={styles.controlLabel}>Volume</span>
                      <input type="range" min="0" max="100" defaultValue={Math.round(((selectedClip as any).volume ?? 1) * 100)} className={styles.rangeFlex} />
                      <input type="number" className={styles.numberInputSm} defaultValue={Math.round(((selectedClip as any).volume ?? 1) * 100)} />
                    </div>
                  </div>
                </section>
              </>
            )}

            <div className={styles.divider} />

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h4 className={styles.sectionTitle}>Quick Filters</h4>
                <button className={styles.resetBtn}>See All</button>
              </div>
              <div className={styles.filterGrid}>
                {[
                  { name: 'None', active: true },
                  { name: 'Vivid', active: false },
                  { name: 'Charm', active: false },
                  { name: 'Sky', active: false },
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
