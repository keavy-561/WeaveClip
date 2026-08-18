import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Toast } from '@douyinfe/semi-ui';
import { IconArrowLeft } from '@douyinfe/semi-icons';
import Logo from '@/components/ui/Logo';
import ThemeToggle from '@/components/ui/ThemeToggle';
import UploadZone from '@/components/create/UploadZone';
import FileList from '@/components/create/FileList';
import type { FileItemData } from '@/components/create/FileList';
import { useTranslation } from 'react-i18next';
import styles from './index.module.scss';

const Upload: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileItemData[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputId = 'upload-file-input';

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

    // Simulate upload progress for each file
    newFiles.forEach((file) => {
      setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, status: 'uploading' } : f)));

      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 25 + 10;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
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

    const draft = {
      files: uploaded,
      totalDuration: uploaded.reduce((sum, f) => sum + (f.duration ?? 0), 0),
      createdAt: new Date().toISOString(),
    };

    navigate('/projects/new/describe', { state: draft });
  }, [files, navigate, t]);

  return (
    <div className={styles.page}>
      <header className={styles.navbar}>
        <div className={styles.navLeft}>
          <Button
            icon={<IconArrowLeft />}
            theme="borderless"
            onClick={() => navigate('/')}
            style={{ color: 'var(--semi-color-text-1)' }}
          />
          <Logo size="small" />
        </div>
        <div className={styles.steps}>
          <span className={`${styles.step} ${styles.active}`}>1 {t('create.upload.step', 'Upload')}</span>
          <span className={styles.stepDivider}>—</span>
          <span className={styles.step}>2 {t('create.describe.step', 'Describe')}</span>
          <span className={styles.stepDivider}>—</span>
          <span className={styles.step}>3 {t('create.generate.step', 'Generate')}</span>
        </div>
        <div className={styles.navRight}>
          <ThemeToggle />
        </div>
      </header>

      <main className={styles.main}>
        <h1 className={styles.title}>{t('create.upload.title', 'Create new video')}</h1>

        <UploadZone
          isDragOver={isDragOver}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onFileSelect={handleFiles}
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
      </main>
    </div>
  );
};

export default Upload;
