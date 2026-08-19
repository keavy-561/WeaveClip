import React, { useCallback } from 'react';
import { IconUpload } from '@douyinfe/semi-icons';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import styles from './index.module.scss';

export interface UploadZoneProps {
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onFileSelect: (files: FileList | File[]) => void;
  inputId: string;
}

const ACCEPTED_TYPES = ['video/mp4', 'video/quicktime', 'image/jpeg', 'image/png'];
const ACCEPTED_EXTS = ['.mp4', '.mov', '.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

const UploadZone: React.FC<UploadZoneProps> = ({
  isDragOver,
  onDragOver,
  onDragLeave,
  onFileSelect,
  inputId,
}) => {
  const { t } = useAppTranslation();

  const validateFiles = useCallback(
    (fileList: FileList | File[]) => {
      const valid: File[] = [];
      const invalid: { name: string; reason: string }[] = [];

      Array.from(fileList).forEach((file) => {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        const typeOk = ACCEPTED_TYPES.includes(file.type) || ACCEPTED_EXTS.includes(ext);
        const sizeOk = file.size <= MAX_FILE_SIZE;

        if (typeOk && sizeOk) {
          valid.push(file);
        } else {
          const reasons: string[] = [];
          if (!typeOk) reasons.push('unsupported format');
          if (!sizeOk) reasons.push('exceeds 500MB');
          invalid.push({ name: file.name, reason: reasons.join(', ') });
        }
      });

      if (invalid.length > 0) {
        import('@douyinfe/semi-ui').then(({ Toast }) => {
          Toast.error(
            `${invalid.length} file(s) rejected: ${invalid.map((i) => `${i.name} (${i.reason})`).join('; ')}`
          );
        });
      }

      if (valid.length > 0) {
        onFileSelect(valid);
      }
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      onDragLeave();
      if (e.dataTransfer.files.length > 0) {
        validateFiles(e.dataTransfer.files);
      }
    },
    [onDragLeave, validateFiles]
  );

  return (
    <div
      className={`${styles.dropzone} ${isDragOver ? styles.dragOver : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={handleDrop}
    >
      <label htmlFor={inputId} className={styles.labelWrapper}>
        <IconUpload size="extra-large" className={styles.uploadIcon} />
        <p className={styles.dropzoneTitle}>{t('create.upload.dropTitle', 'Drop your footage here')}</p>
        <p className={styles.dropzoneHint}>{t('create.upload.dropHint', 'or click to upload')}</p>
        <p className={styles.dropzoneFormats}>{t('create.upload.formats', 'MP4 / MOV / JPG / PNG')}</p>
      </label>
      <input
        id={inputId}
        type="file"
        multiple
        accept="video/mp4,video/quicktime,image/jpeg,image/png"
        className={styles.hiddenInput}
        onChange={(e) => e.target.files && validateFiles(e.target.files)}
      />
    </div>
  );
};

export default UploadZone;
