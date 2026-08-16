import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Progress, Tag } from '@douyinfe/semi-ui';
import { IconArrowLeft, IconUpload, IconFile, IconVideo, IconImage, IconMusic } from '@douyinfe/semi-icons';
import Logo from '@/components/ui/Logo';
import ThemeToggle from '@/components/ui/ThemeToggle';
import AnalyzeProgress from '@/components/create/AnalyzeProgress';
import { formatFileSize, formatDuration } from '@/utils/format';
import type { Asset } from '@/types/asset';
import styles from './index.module.scss';

type UploadStage = 'upload' | 'analyzing' | 'done';

const ACCEPTED_TYPES = ['video/mp4', 'video/quicktime', 'image/jpeg', 'image/png'];
const ACCEPTED_EXTS = ['.mp4', '.mov', '.jpg', '.jpeg', '.png'];

const Upload: React.FC = () => {
  const navigate = useNavigate();
  const [stage, setStage] = useState<UploadStage>('upload');
  const [files, setFiles] = useState<Asset[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const totalDuration = files.reduce((sum, f) => sum + (f.duration ?? 0), 0);

  const handleFiles = useCallback((fileList: FileList | File[]) => {
    const valid: Asset[] = Array.from(fileList)
      .filter((f) => {
        const ext = '.' + f.name.split('.').pop()?.toLowerCase();
        return ACCEPTED_TYPES.includes(f.type) || ACCEPTED_EXTS.includes(ext);
      })
      .map((f, i) => ({
        id: `local_${Date.now()}_${i}`,
        projectId: 'draft',
        type: f.type.startsWith('video')
          ? 'video'
          : f.type.startsWith('audio')
            ? 'audio'
            : f.type.startsWith('image')
              ? 'image'
              : 'video',
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
      }));
    setFiles((prev) => [...prev, ...valid]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const fileIcon = (type: string) => {
    if (type === 'video') return <IconVideo />;
    if (type === 'image') return <IconImage />;
    if (type === 'audio') return <IconMusic />;
    return <IconFile />;
  };

  // 阶段 2：分析完成 → 进入 Describe
  const handleAnalyzeDone = () => {
    setStage('done');
    setTimeout(() => navigate('/projects/new/describe'), 600);
  };

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
          <span className={`${styles.step} ${styles.active}`}>1 Upload</span>
          <span className={styles.stepDivider}>—</span>
          <span className={styles.step}>2 Describe</span>
          <span className={styles.stepDivider}>—</span>
          <span className={styles.step}>3 Generate</span>
        </div>
        <div className={styles.navRight}>
          <ThemeToggle />
        </div>
      </header>

      <main className={styles.main}>
        {stage === 'upload' && (
          <>
            <h1 className={styles.title}>Create new video</h1>

            <div
              className={`${styles.dropzone} ${isDragOver ? styles.dragOver : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <IconUpload size="extra-large" className={styles.uploadIcon} />
              <p className={styles.dropzoneTitle}>Drop your footage</p>
              <p className={styles.dropzoneHint}>or click to upload</p>
              <p className={styles.dropzoneFormats}>MP4 / MOV / JPG / PNG</p>
              <input
                id="file-input"
                type="file"
                multiple
                accept="video/mp4,video/quicktime,image/jpeg,image/png"
                className={styles.hiddenInput}
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
              />
            </div>

            {files.length > 0 && (
              <div className={styles.fileSection}>
                <div className={styles.fileSummary}>
                  <Tag color="purple" size="large">
                    {files.length} files
                  </Tag>
                  {totalDuration > 0 && (
                    <span className={styles.summaryText}>
                      {formatDuration(totalDuration)}
                    </span>
                  )}
                </div>
                <div className={styles.fileList}>
                  {files.map((f) => (
                    <div key={f.id} className={styles.fileItem}>
                      <span className={styles.fileIcon}>{fileIcon(f.type)}</span>
                      <span className={styles.fileName}>{f.fileName}</span>
                      <span className={styles.fileSize}>
                        {formatFileSize(f.fileSize)}
                      </span>
                      <Button
                        size="small"
                        theme="borderless"
                        type="danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFiles((prev) => prev.filter((x) => x.id !== f.id));
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>

                <div className={styles.actions}>
                  <Button
                    theme="solid"
                    size="large"
                    disabled={files.length === 0}
                    onClick={() => setStage('analyzing')}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {stage === 'analyzing' && (
          <AnalyzeProgress onComplete={handleAnalyzeDone} />
        )}

        {stage === 'done' && (
          <div className={styles.doneSection}>
            <Progress percent={100} type="circle" />
            <p className={styles.doneText}>Your footage is ready.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Upload;
