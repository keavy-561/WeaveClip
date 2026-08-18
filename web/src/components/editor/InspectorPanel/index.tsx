import React, { useState } from 'react';
import { Button } from '@douyinfe/semi-ui';
import { IconMore } from '@douyinfe/semi-icons';
import styles from './index.module.scss';

const InspectorPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('adjust');

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
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h4 className={styles.sectionTitle}>White Balance</h4>
            <button className={styles.resetBtn}>Reset</button>
          </div>
          <div className={styles.controlGroup}>
            <div className={styles.controlRow}>
              <span className={styles.controlLabel}>
                <span className={styles.controlIcon}>🌡️</span> Color Temp
              </span>
              <input type="number" className={styles.numberInput} defaultValue={0} />
            </div>
            <div className={styles.sliderRow}>
              <span className={styles.sliderDot} style={{ background: '#60a5fa' }} />
              <input type="range" min="-100" max="100" defaultValue="0" className={styles.range} />
              <span className={styles.sliderDot} style={{ background: '#fb923c' }} />
            </div>
          </div>
          <div className={styles.controlGroup}>
            <div className={styles.controlRow}>
              <span className={styles.controlLabel}>Tint</span>
              <input type="number" className={styles.numberInput} defaultValue={0} />
            </div>
            <div className={styles.sliderRow}>
              <span className={styles.sliderDot} style={{ background: '#4ade80' }} />
              <input type="range" min="-100" max="100" defaultValue="0" className={styles.range} />
              <span className={styles.sliderDot} style={{ background: '#c084fc' }} />
            </div>
          </div>
        </section>

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
            <div className={styles.controlRow}>
              <span className={styles.controlLabel}>Saturation</span>
              <input type="range" min="-100" max="100" defaultValue="0" className={styles.rangeFlex} />
              <input type="number" className={styles.numberInputSm} defaultValue={0} />
            </div>
            <div className={styles.controlRow}>
              <span className={styles.controlLabel}>Exposure</span>
              <input type="range" min="-100" max="100" defaultValue="0" className={styles.rangeFlex} />
              <input type="number" className={styles.numberInputSm} defaultValue={0} />
            </div>
          </div>
        </section>

        <div className={styles.divider} />

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h4 className={styles.sectionTitle}>
              Creative
              <span className={styles.aiBadge}>✨</span>
            </h4>
            <button className={styles.resetBtn}>Reset</button>
          </div>
          <div className={styles.controlGroup}>
            <div className={styles.controlRow}>
              <span className={styles.controlLabel}>Hue</span>
              <input
                type="range"
                min="-100"
                max="100"
                defaultValue="0"
                className={styles.rangeFlex}
                style={{
                  background: 'linear-gradient(to right, red, yellow, green, cyan, blue, magenta, red)',
                  height: '2px',
                }}
              />
              <input type="number" className={styles.numberInputSm} defaultValue={0} />
            </div>
            <div className={styles.controlRow}>
              <span className={styles.controlLabel}>Sharpness</span>
              <input type="range" min="0" max="100" defaultValue="0" className={styles.rangeFlex} />
              <input type="number" className={styles.numberInputSm} defaultValue={0} />
            </div>
            <div className={styles.controlRow}>
              <span className={`${styles.controlLabel} ${styles.activeLabel}`}>Blur</span>
              <div className={styles.sliderWrap}>
                <div className={styles.sliderTrack} style={{ width: '20%' }} />
                <input type="range" min="0" max="100" defaultValue="20" className={styles.rangeActive} />
                <div className={styles.sliderThumb} style={{ left: '20%' }} />
              </div>
              <input type="number" className={`${styles.numberInputSm} ${styles.activeInput}`} defaultValue={20} />
            </div>
          </div>
        </section>

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
      </div>
    </div>
  );
};

export default InspectorPanel;
