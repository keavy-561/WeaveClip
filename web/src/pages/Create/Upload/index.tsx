import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Toast } from '@douyinfe/semi-ui';
import { IconArrowLeft } from '@douyinfe/semi-icons';
import Logo from '@/components/ui/Logo';
import ThemeToggle from '@/components/ui/ThemeToggle';
import UploadStep from '@/components/create/UploadStep';
import type { FileItemData } from '@/components/create/FileList';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { useMutation } from '@tanstack/react-query';
import { projectService } from '@/services/projectService';
import styles from './index.module.scss';

const Upload: React.FC = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; duration?: number; aspectRatio?: string; style?: string }) =>
      projectService.create(payload),
    onSuccess: (project) => {
      navigate(`/editor/${project.id}`);
    },
    onError: () => {
      Toast.error(t('create.upload.error', 'Failed to create project'));
    },
  });

  const handleContinue = (files: FileItemData[]) => {
    const totalDuration = files.reduce((sum, f) => sum + (f.duration ?? 0), 0);
    createMutation.mutate({
      name: files[0]?.fileName ?? 'Untitled Project',
      duration: totalDuration > 0 ? Math.round(totalDuration) : undefined,
      aspectRatio: '9:16',
      style: 'energetic',
    });
  };

  return (
    <div className={styles.page}>
      <header className={styles.navbar}>
        <div className={styles.navLeft}>
          <Button
            icon={<IconArrowLeft />}
            theme="borderless"
            className={styles.backBtn}
            onClick={() => navigate('/')}
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
        <UploadStep onContinue={handleContinue} />
      </main>
    </div>
  );
};

export default Upload;
