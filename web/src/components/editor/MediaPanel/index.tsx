import React, { useState } from 'react';
import { Tabs, TabPane, Button, Switch } from '@douyinfe/semi-ui';
import { IconPlus, IconSearch, IconArrowRight } from '@douyinfe/semi-icons';
import type { Asset } from '@/types/asset';
import styles from './index.module.scss';

interface MediaPanelProps {
  assets: Asset[];
}

const MediaPanel: React.FC<MediaPanelProps> = ({ assets }) => {
  const [tab, setTab] = useState<string>('library');

  const videos = assets.filter((a) => a.type === 'video');

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Media</span>
        <Button size="small" theme="borderless" icon={<IconPlus />} aria-label="Import media" />
      </div>

      <Tabs activeKey={tab} onChange={(k) => setTab(k)} type="card" className={styles.tabs}>
        <TabPane tab="Library" itemKey="library" />
        <TabPane tab="Media" itemKey="media" />
      </Tabs>

      <div className={styles.search}>
        <IconSearch className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search Templates"
          readOnly
        />
      </div>

      <div className={styles.content}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Recent Assets</h3>
            <IconArrowRight className={styles.sectionArrow} />
          </div>
          <div className={styles.assetGrid}>
            {videos.slice(0, 4).map((asset) => (
              <div key={asset.id} className={styles.assetCard}>
                <div className={styles.assetImage}>
                  <div className={styles.assetPlaceholder} />
                  <div className={styles.assetOverlay}>
                    <IconPlus />
                  </div>
                  {asset.duration && (
                    <span className={styles.durationBadge}>
                      {Math.floor(asset.duration / 60)}:{String(Math.floor(asset.duration % 60)).padStart(2, '0')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Landscape Video</h3>
            <IconArrowRight className={styles.sectionArrow} />
          </div>
          <div className={styles.horizontalList}>
            {videos.slice(0, 4).map((asset) => (
              <div key={asset.id} className={styles.horizontalCard}>
                <div className={styles.horizontalImage}>
                  <div className={styles.assetPlaceholder} />
                  <div className={styles.horizontalOverlay}>
                    <span className={styles.horizontalLabel}>Floral</span>
                  </div>
                  {asset.duration && (
                    <span className={styles.durationBadge}>
                      4K {Math.floor(asset.duration / 60)}:{String(Math.floor(asset.duration % 60)).padStart(2, '0')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>AI Enhancements</h3>
          <div className={styles.aiSection}>
            <div className={styles.aiRow}>
              <span className={styles.aiLabel}>Style Transfer</span>
              <Button size="small" theme="borderless">Select Style</Button>
            </div>
            <div className={styles.aiRow}>
              <span className={styles.aiLabel}>Auto-Captions</span>
              <Switch size="small" checked={true} />
            </div>
            <div className={styles.aiRow}>
              <span className={styles.aiLabel}>Noise Reduction</span>
              <div className={styles.sliderRow}>
                <input type="range" min="0" max="100" defaultValue="40" className={styles.range} />
                <span className={styles.sliderValue}>40%</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default MediaPanel;
