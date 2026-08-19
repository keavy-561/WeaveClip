import React from 'react';
import { Button, Progress } from '@douyinfe/semi-ui';
import { IconVideo, IconImage, IconMusic, IconFile, IconClose } from '@douyinfe/semi-icons';
import type { Asset } from '@/types/asset';
import { formatFileSize, formatDuration } from '@/utils/format';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import styles from './index.module.scss';

export interface FileItemData extends Asset {
  progress?: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
}

interface FileListProps {
  files: FileItemData[];
  onRemove: (id: string) => void;
}

const FileList: React.FC<FileListProps> = ({ files, onRemove }) => {
  const { t } = useAppTranslation();
  const fileIcon = (type: string) => {
    if (type === 'video') return <IconVideo />;
    if (type === 'image') return <IconImage />;
    if (type === 'audio') return <IconMusic />;
    return <IconFile />;
  };

  if (files.length === 0) return null;

  return (
    <div className={styles.fileSection}>
      <div className={styles.fileSummary}>
        <span className={styles.summaryCount}>
          {files.length} {t('create.fileList.count', files.length === 1 ? 'file' : 'files')}
        </span>
        {files.some((f) => f.duration) && (
          <span className={styles.summaryDuration}>
            {t('create.fileList.totalDuration', 'Total duration:')} {formatDuration(files.reduce((sum, f) => sum + (f.duration ?? 0), 0))}
          </span>
        )}
      </div>
      <div className={styles.fileList}>
        {files.map((f) => (
          <div key={f.id} className={styles.fileItem}>
            <span className={styles.fileIcon}>{fileIcon(f.type)}</span>
            <span className={styles.fileName}>{f.fileName}</span>
            <span className={styles.fileSize}>{formatFileSize(f.fileSize)}</span>
            {f.status === 'uploading' && (
              <div className={styles.progressWrapper}>
                <Progress percent={f.progress ?? 0} size="small" className={styles.progress} />
              </div>
            )}
            <Button
              size="small"
              theme="borderless"
              icon={<IconClose />}
              disabled={f.status === 'uploading'}
              onClick={() => onRemove(f.id)}
              className={styles.removeBtn}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileList;
