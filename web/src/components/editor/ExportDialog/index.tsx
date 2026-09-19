import React, { useState } from 'react';
import { Modal, Button, Select, InputNumber, Progress, Toast } from '@douyinfe/semi-ui';
import { useRenderProgress } from '@/hooks/useRenderProgress';
import { renderService } from '@/services/generateService';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import styles from './index.module.scss';

interface ExportDialogProps {
  projectId: string;
  visible: boolean;
  onClose: () => void;
}

/** 导出对话框：选参数 → 发起渲染 → WS/轮询进度 → 下载（工单 F10） */
const ExportDialog: React.FC<ExportDialogProps> = ({ projectId, visible, onClose }) => {
  const { t } = useAppTranslation();
  const [format, setFormat] = useState('mp4');
  const [resolution, setResolution] = useState('1080x1920');
  const [fps, setFps] = useState(30);
  const [renderId, setRenderId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const { phase, progress, downloadUrl, error } = useRenderProgress(renderId);

  const handleStart = async () => {
    setStarting(true);
    try {
      const resp = await renderService.start(projectId, { format, resolution, fps }) as { renderId: string };
      setRenderId(resp.renderId);
    } catch (e) {
      const message =
        (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '';
      Toast.error(t('editor.export.startFailed', { reason: message }));
    } finally {
      setStarting(false);
    }
  };

  const handleReset = () => {
    setRenderId(null);
    onClose();
  };

  return (
    <Modal
      title={t('editor.export.title', 'Export video')}
      visible={visible}
      onCancel={handleReset}
      footer={null}
      closeOnEsc
    >
      {renderId == null ? (
        <div className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>{t('editor.export.format', 'Format')}</span>
            <Select
              value={format}
              onChange={(v) => setFormat(v as string)}
              className={styles.control}
              optionList={[
                { label: 'MP4', value: 'mp4' },
              ]}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{t('editor.export.resolution', 'Resolution')}</span>
            <Select
              value={resolution}
              onChange={(v) => setResolution(v as string)}
              className={styles.control}
              optionList={[
                { label: '1080 × 1920', value: '1080x1920' },
                { label: '720 × 1280', value: '720x1280' },
                { label: '1920 × 1080', value: '1920x1080' },
              ]}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{t('editor.export.fps', 'Frame rate')}</span>
            <InputNumber
              value={fps}
              min={15}
              max={60}
              step={15}
              onChange={(v) => setFps(Number(v) || 30)}
              className={styles.control}
            />
          </label>
          <Button theme="solid" size="large" loading={starting} onClick={handleStart} className={styles.cta}>
            {t('editor.export.start', 'Start rendering')}
          </Button>
        </div>
      ) : (
        <div className={styles.progressArea}>
          {phase === 'completed' ? (
            <>
              <p className={styles.doneText}>{t('editor.export.completed', 'Rendering completed!')}</p>
              <Button theme="solid" size="large" onClick={() => window.open(downloadUrl, '_blank')}>
                {t('editor.export.downloadNow', 'Download MP4')}
              </Button>
            </>
          ) : phase === 'failed' ? (
            <>
              <p className={styles.errorText}>
                {t('editor.export.failedHint', { reason: error })}
              </p>
              <Button onClick={() => setRenderId(null)}>{t('editor.export.retry', 'Try again')}</Button>
            </>
          ) : (
            <>
              <p className={styles.progressText}>{t('editor.export.rendering', 'Rendering...')}</p>
              <Progress percent={progress} />
            </>
          )}
        </div>
      )}
    </Modal>
  );
};

export default ExportDialog;
