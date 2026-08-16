import React, { useState } from 'react';
import { Tabs, TabPane, Button } from '@douyinfe/semi-ui';
import { IconPlus } from '@douyinfe/semi-icons';
import AssetCard from '../AssetCard';
import type { Asset } from '@/types/asset';
import styles from './index.module.scss';

interface AssetPanelProps {
  assets: Asset[];
}

const AssetPanel: React.FC<AssetPanelProps> = ({ assets }) => {
  const [tab, setTab] = useState<string>('clips');

  const clips = assets.filter((a) => a.type === 'video');
  const audio = assets.filter((a) => a.type === 'audio');
  const images = assets.filter((a) => a.type === 'image');

  const listByTab =
    tab === 'clips' ? clips : tab === 'audio' ? audio : images;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Assets</span>
        <Button
          size="small"
          theme="borderless"
          icon={<IconPlus />}
          aria-label="Import asset"
        />
      </div>

      <Tabs
        activeKey={tab}
        onChange={(k) => setTab(k)}
        type="card"
        className={styles.tabs}
      >
        <TabPane tab="Clips" itemKey="clips" />
        <TabPane tab="Audio" itemKey="audio" />
        <TabPane tab="Images" itemKey="images" />
      </Tabs>

      <div className={styles.list}>
        {listByTab.length === 0 ? (
          <p className={styles.empty}>No {tab} yet</p>
        ) : (
          listByTab.map((asset) => (
            <AssetCard key={asset.id} asset={asset} />
          ))
        )}
      </div>
    </div>
  );
};

export default AssetPanel;
