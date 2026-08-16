import React from 'react';
import { IconVideo, IconImage, IconMusic } from '@douyinfe/semi-icons';
import type { Asset } from '@/types/asset';
import { formatDuration, formatFileSize } from '@/utils/format';
import styles from './index.module.scss';

interface AssetCardProps {
  asset: Asset;
}

const AssetCard: React.FC<AssetCardProps> = ({ asset }) => {
  const typeIcon =
    asset.type === 'video' ? (
      <IconVideo />
    ) : asset.type === 'image' ? (
      <IconImage />
    ) : (
      <IconMusic />
    );

  return (
    <div
      className={styles.card}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/x-asset-id', asset.id);
      }}
    >
      <div className={styles.thumbnail}>
        {asset.thumbnailUrl ? (
          <img src={asset.thumbnailUrl} alt={asset.fileName} />
        ) : (
          <div className={styles.placeholder}>{typeIcon}</div>
        )}
        {asset.duration != null && (
          <span className={styles.durationBadge}>
            {formatDuration(asset.duration)}
          </span>
        )}
      </div>
      <div className={styles.info}>
        <span className={styles.name} title={asset.fileName}>
          {asset.fileName}
        </span>
        <span className={styles.meta}>{formatFileSize(asset.fileSize)}</span>
      </div>
    </div>
  );
};

export default AssetCard;
