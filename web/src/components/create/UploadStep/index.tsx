import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Button, Toast } from '@douyinfe/semi-ui';
import UploadZone from '../UploadZone';
import FileList from '../FileList';
import type { FileItemData } from '../FileList';
import { useTranslation } from 'react-i18next';
import styles from './index.module.scss';

export interface UploadStepProps {
  onContinue: (files: FileItemData[]) => void;
}

const UploadStep: React.FC<UploadStepProps> = ({ onContinue }) => {
  const { t } = useTranslation();
  const [files, setFiles] = useState<FileItemData[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputId = 'upload-file-input';
  const intervalsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    return () => {
      intervalsRef.current.forEach((id) => clearInterval(id));
      intervalsRef.current.clear();
    };
  }, []);

  const handleFiles = useCallback((fileList: FileList | File[]) => {
    const newFiles: FileItemData[] = Array.from(fileList).map((f, i) => ({
      id: `local_${Date.now()}_${i}`,
      projectId: 'draft',
      type: f.type.startsWith('video') ? 'video' : f.type.startsWith('audio') ? 'audio' : f.type.startsWith('image') ? 'image' : 'video',
      storagePath: '',
      fileName: f.name,
      fileSize: f.size,
      duration: null,
      width: null,
      height: null,
      thumbnailUrl: null,
      fps: null,
      codec: null,
      transcript: null,
      metadata: null,
      analysis: null,
      createdAt: new Date().toISOString(),
      progress: 0,
      status: 'pending' as const,
    }));

    setFiles((prev) => [...prev, ...newFiles]);

    newFiles.forEach((file) => {
      setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, status: 'uploading' } : f)));

      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 25 + 10;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          intervalsRef.current.delete(file.id);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === file.id ? { ...f, progress: 100, status: 'done' } : f
            )
          );
        } else {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === file.id ? { ...f, progress: Math.min(progress, 99) } : f
            )
          );
        }
      }, 300);
      intervalsRef.current.set(file.id, interval);
    });
  }, []);

  const handleRemove = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleContinue = useCallback(() => {
    const uploaded = files.filter((f) => f.status === 'done');
    if (uploaded.length === 0) {
      Toast.warning(t('create.upload.noFiles', 'Please upload at least one file'));
      return;
    }
    onContinue(uploaded);
  }, [files, onContinue, t]);

  const handleFileSelect = useCallback((fileList: FileList | File[]) => {
    handleFiles(fileList);
  }, [handleFiles]);

  return (
    <div className={styles.uploadStep}>
      <UploadZone
        isDragOver={isDragOver}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onFileSelect={handleFileSelect}
        inputId={inputId}
      />

      <FileList files={files} onRemove={handleRemove} />

      {files.length > 0 && (
        <div className={styles.actions}>
          <Button
            theme="solid"
            size="large"
            disabled={files.some((f) => f.status !== 'done')}
            onClick={handleContinue}
            className={styles.continueBtn}
          >
            {t('create.upload.continue', 'Continue')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default UploadStep;
