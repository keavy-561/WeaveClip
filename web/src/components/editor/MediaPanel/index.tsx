import React, { useState } from 'react';
import { Button, Switch } from '@douyinfe/semi-ui';
import { IconPlus, IconSearch, IconArrowRight } from '@douyinfe/semi-icons';
import type { Asset } from '@/types/asset';
import styles from './index.module.scss';

const ASSET_IMAGES: Record<string, string> = {
  asset_01: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD5t2CMfKsH5ke_RmKFLCqdOHPnI6M8Zn-U1hNep4ehXBzfPdebI2P_ty6oBddArLpHMVSWdxQNjrfLMZwxKr2-INNOU8OHHztNAVmHXsv1c7FNNZruoDHtUtHLoTCCKXzLG754ZS7wRao2jvEPIDQo66VCyf55Ipt_qi8L3UuQpNjDu0NYyNli6oPgL3soui-qoqM17VYGSknDdpIseFBR-ilcETv0isAoGU5MaX5VruxRiaBlZI-c_g',
  asset_02: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCC7qJIQ1KQOs8_H0eY8vdsK55JlBwMB5BpLHREjyLE6MZMjxwSCBUBWa8eVuomkWrlEn-xp0QY6Pj3CmjGZNrYFfHQz2wXi0sC5GJFyZYRJ4d8jyUoL1qL64lzdMUVWHiRZM2NxN73PbIWZDqMVxZ2m2JoFYJ8Jq7eLCdjoRPp-tbYu_TnYuzMF0C0Dff7-yJ-BCn_6uH2bE_RGca_G5BD0UTaGd1JnzjScesPyy9mX2sEeY0Cf4gw1w',
  asset_03: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDJ2zMKwMFws3IuXEdm7iG4rVF1bcj66rog5fF8_njEt33ONfeCb0XiyWp6Hyv5x18QGQGRZCzER1pNM5Ywg_E0eY42xE3uGIxbGyah8dmt5WCR_kMUXwlB04pE149OjZMZKu7bvpeoU8CamPVWKvQB9KZY1YkIJ4T-0WJQoJ-KBsbcJKdNkTk3WEFvLgdHUD0U0heQZYBoixp9uyrkAEBjoIwafTqfI_AzP-94AGFLZhzSdmgnacng3w',
  asset_04: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDXpyJ05fJFVnRUe2X3XLDyAWZTHwWPTLBglUUazIkhQPXx-6lty2Q2lUx3eIqMxgAIoMO9YuvP9OKdIHIQQMcOWQrGlO2juOxxGkaYVBYQlIWotvwDLbHFXwhJoTdKiGC9t-0rdv9MShl2QGgiiYucA97dsP4UMb25jSCjYi9qml_oT77Pi2GjBr7BtBnK20OWhPALc_MZi8mWwfvvBbwEuf4phkLRB61b-vnqfmp7F1DOeIImycNfg',
  asset_05: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDrRUynQrsKtloYqXPqHJ66v4aX7Wx4e4ZRARDS_f0cZjDMKve_KjyVdUmfN_mCV16KaphvR24Ra6hito-9v3HjHlphizj3EpkD3UweWxQ40N5pYieHpSYLM_QN3zWCaZigytPGpsZpUD0EovYKiEh_S8iuzFTLzqN98qtWy-bRBvyDiHMNys1R_QY8YyeeBot_MZHyLfMxClO_Q7OgJCEiTlO-orI5ZZH2WQ0axS7NkxGcuXKrbDO-Tw',
};

interface MediaPanelProps {
  assets: Asset[];
}

const MediaPanel: React.FC<MediaPanelProps> = ({ assets }) => {
  const [tab, setTab] = useState<string>('library');
  const [query, setQuery] = useState<string>('');

  const videos = assets.filter((a) => a.type === 'video');
  const filtered = videos.filter((a) =>
    a.fileName.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Media</span>
        <Button size="small" theme="borderless" icon={<IconPlus />} aria-label="Import media" />
      </div>

      <div className={styles.tabBar}>
        <button
          className={`${styles.segment} ${tab === 'library' ? styles.segmentActive : ''}`}
          onClick={() => setTab('library')}
        >
          Library
        </button>
        <button
          className={`${styles.segment} ${tab === 'media' ? styles.segmentActive : ''}`}
          onClick={() => setTab('media')}
        >
          Media
        </button>
      </div>

      <div className={styles.search}>
        <IconSearch className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search Templates"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className={styles.content}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Recent Assets</h3>
            <IconArrowRight className={styles.sectionArrow} />
          </div>
          <div className={styles.assetGrid}>
            {filtered.slice(0, 4).map((asset) => (
              <div key={asset.id} className={styles.assetCard}>
                <div className={styles.assetImage}>
                  <img
                    className={styles.assetImg}
                    src={ASSET_IMAGES[asset.id] ?? ''}
                    alt={asset.fileName}
                    loading="lazy"
                  />
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
            {filtered.slice(0, 4).map((asset) => (
              <div key={asset.id} className={styles.horizontalCard}>
                <div className={styles.horizontalImage}>
                  <img
                    className={styles.horizontalImg}
                    src={ASSET_IMAGES[asset.id] ?? ''}
                    alt={asset.fileName}
                    loading="lazy"
                  />
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
