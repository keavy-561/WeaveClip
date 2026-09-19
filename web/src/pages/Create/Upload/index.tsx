import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Toast, Progress } from '@douyinfe/semi-ui';
import { IconArrowLeft } from '@douyinfe/semi-icons';
import Logo from '@/components/ui/Logo';
import UploadStep from '@/components/create/UploadStep';
import type { FileItemData } from '@/components/create/FileList';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { projectService } from '@/services/projectService';
import { assetService } from '@/services/assetService';
import { addMockProject } from '@/utils/mockData';
import styles from './index.module.scss';

const isMockMode = import.meta.env.VITE_API_MODE === 'mock';

const Upload: React.FC = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  // 真实上传状态（F02 + WO9-02）：项目创建后逐文件 presign → PUT → confirm。
  // 上传中保留步骤区（禁点）、展示进度面板，支持取消与失败文件重试
  const [uploadState, setUploadState] = useState<{
    active: boolean;
    done: number;
    total: number;
    pct: number;
    projectId: string | null;
    failed: FileItemData[];
  }>({ active: false, done: 0, total: 0, pct: 0, projectId: null, failed: [] });
  const cancelRef = useRef(false);

  const handleContinue = (files: FileItemData[]) => {
    const totalDuration = files.reduce((sum, f) => sum + (f.duration ?? 0), 0);
    const payload = {
      name: files[0]?.fileName ?? 'Untitled Project',
      duration: totalDuration > 0 ? Math.round(totalDuration) : undefined,
      aspectRatio: '9:16',
      style: 'energetic',
    };

    // mock 模式：本地创建项目后进分析页（本地模拟进度）
    if (isMockMode) {
      const projectId = `proj_${Date.now()}`;
      addMockProject({
        id: projectId,
        name: payload.name,
        status: 'analyzing',
        duration: payload.duration ?? null,
        aspectRatio: payload.aspectRatio,
        style: payload.style,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      navigate(`/projects/new/analyze?projectId=${projectId}`);
      return;
    }

    // 真实模式：创建项目 → 逐文件 presign 直传 → confirm 触发处理管线（工单 B06/B07）
    void uploadAll(payload, files);
  };

  const uploadAll = async (
    payload: { name: string; duration?: number; aspectRatio?: string; style?: string },
    files: FileItemData[],
    existingProjectId?: string | null
  ) => {
    cancelRef.current = false;
    setUploadState((prev) => ({
      ...prev,
      active: true,
      done: 0,
      total: files.length,
      pct: 0,
      failed: [],
      projectId: existingProjectId ?? null,
    }));
    try {
      let projectId = existingProjectId ?? null;
      if (!projectId) {
        const project = await projectService.create(payload);
        projectId = project.id;
        setUploadState((prev) => ({ ...prev, projectId }));
      }
      const failed: FileItemData[] = [];
      let done = 0;
      for (let i = 0; i < files.length; i++) {
        // 取消：停止剩余文件，已上传的保留
        if (cancelRef.current) break;
        const item = files[i];
        try {
          if (!item.raw) {
            throw new Error(`missing raw file for ${item.fileName}`);
          }
          const contentType = item.raw.type || 'application/octet-stream';
          const { uploadUrl, assetId } = await assetService.presign(projectId, {
            type: item.type,
            fileName: item.fileName,
            fileSize: item.fileSize ?? 0,
          });
          await assetService.uploadToPresigned(uploadUrl, item.raw, contentType, (pct) => {
            setUploadState((prev) => ({
              ...prev,
              pct: Math.round(((i + pct / 100) / files.length) * 100),
            }));
          });
          await assetService.confirm(projectId, assetId);
          done += 1;
          setUploadState((prev) => ({ ...prev, done }));
        } catch (fileError) {
          // 单文件失败不中断整批：记录后继续，结束后提供重试（工单 WO9-02）
          failed.push(item);
          setUploadState((prev) => ({ ...prev, failed: [...prev.failed, item] }));
        }
      }
      if (cancelRef.current) {
        Toast.info(t('create.upload.cancelled'));
        return;
      }
      if (failed.length > 0) {
        Toast.error(t('create.upload.partialFailed', { count: failed.length }));
        return;
      }
      navigate(`/projects/new/analyze?projectId=${projectId}`);
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } }).response?.data?.message ??
        (error as Error).message;
      Toast.error(t('create.upload.uploadFailed', { reason: message ?? '' }));
    } finally {
      setUploadState((prev) => ({ ...prev, active: false }));
    }
  };

  const handleCancelUpload = () => {
    cancelRef.current = true;
  };

  const handleRetryFailed = () => {
    if (!uploadState.projectId || uploadState.failed.length === 0) return;
    // 重试只传失败文件，复用已创建的项目
    void uploadAll({ name: '' }, uploadState.failed, uploadState.projectId);
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
        <div className={styles.navRight} />
      </header>

      <main className={styles.main}>
        <h1 className={styles.title}>{t('create.upload.title', 'Create new video')}</h1>
        {(uploadState.active || uploadState.failed.length > 0) && (
          <div className={styles.uploadingOverlay}>
            <span>
              {t('create.upload.uploadingProgress', { done: uploadState.done, total: uploadState.total, pct: uploadState.pct })}
            </span>
            <div className={styles.uploadingBar}>
              <Progress percent={uploadState.pct} />
            </div>
            {uploadState.active ? (
              <Button size="small" theme="borderless" onClick={handleCancelUpload}>
                {t('create.upload.cancel')}
              </Button>
            ) : uploadState.failed.length > 0 ? (
              <>
                <span className={styles.failedList}>
                  {t('create.upload.failedList', { names: uploadState.failed.map((f) => f.fileName).join(', ') })}
                </span>
                <Button size="small" theme="solid" onClick={handleRetryFailed}>
                  {t('create.upload.retry')}
                </Button>
              </>
            ) : null}
          </div>
        )}
        {/* 上传中保留步骤区（禁点）而不是整体替换，用户仍能看到文件列表（工单 WO9-02） */}
        <div className={uploadState.active ? styles.stepDisabled : undefined}>
          <UploadStep onContinue={handleContinue} simulateProgress={isMockMode} />
        </div>
      </main>
    </div>
  );
};

export default Upload;
