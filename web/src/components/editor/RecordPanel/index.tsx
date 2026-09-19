import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Toast } from '@douyinfe/semi-ui';
import { IconMicrophone, IconPause } from '@douyinfe/semi-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { useAssetsStore } from '@/stores/assetsStore';
import { assetService } from '@/services/assetService';
import { formatTime } from '@/utils/format';
import type { Asset } from '@/types/asset';
import styles from './index.module.scss';

const isMockMode = import.meta.env.VITE_API_MODE === 'mock';

/**
 * 录制面板（工单 WO6-07）：摄像头/麦克风录制 → 生成视频素材。
 * 任何模式都先落「本地 blob 素材」（playbackUrl 为对象 URL，播放器可直接预览）；
 * 真实模式同时走 presign 直传上传云端持久化。
 */
const RecordPanel: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { t } = useAppTranslation();
  const queryClient = useQueryClient();
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const secondsRef = useRef(0);
  const streamTracksRef = useRef<MediaStreamTrack[]>([]);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [saving, setSaving] = useState(false);

  // 卸载时释放摄像头与计时器，避免占用设备
  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      streamTracksRef.current.forEach((track) => track.stop());
    },
    []
  );

  /** 录制完成：blob → 本地素材（必做）+ 云端上传（真实模式） */
  const handleRecordingComplete = async (blob: Blob, duration: number) => {
    const fileName = `record_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.webm`;
    const localAsset: Asset = {
      id: `local_${Date.now()}`,
      projectId: projectId ?? 'local',
      type: 'video',
      storagePath: '',
      fileName,
      fileSize: blob.size,
      duration,
      width: null,
      height: null,
      thumbnailUrl: null,
      fps: null,
      codec: 'webm',
      playbackUrl: URL.createObjectURL(blob),
      transcript: null,
      metadata: null,
      analysis: null,
      createdAt: new Date().toISOString(),
    };
    useAssetsStore.getState().setAssets([...useAssetsStore.getState().assets, localAsset]);

    if (!isMockMode) {
      setSaving(true);
      try {
        const { uploadUrl, assetId } = await assetService.presign(projectId ?? '', {
          type: 'video',
          fileName,
          fileSize: blob.size,
        });
        await assetService.uploadToPresigned(
          uploadUrl,
          new File([blob], fileName, { type: 'video/webm' }),
          'video/webm'
        );
        await assetService.confirm(projectId ?? '', assetId);
        void queryClient.invalidateQueries({ queryKey: ['assets'] });
      } catch {
        Toast.error(t('editor.record.uploadFailed'));
      }
      setSaving(false);
    }
    Toast.success(t('editor.record.savedToLibrary'));
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      Toast.error(t('editor.record.unsupported'));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamTracksRef.current = stream.getTracks();
      if (previewRef.current) {
        previewRef.current.srcObject = stream;
      }
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' });
        void handleRecordingComplete(blob, secondsRef.current);
        streamTracksRef.current.forEach((track) => track.stop());
        streamTracksRef.current = [];
        if (previewRef.current) previewRef.current.srcObject = null;
      };
      recorder.start();
      recorderRef.current = recorder;
      secondsRef.current = 0;
      setSeconds(0);
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        secondsRef.current += 1;
        setSeconds(secondsRef.current);
      }, 1000);
    } catch {
      Toast.error(t('editor.record.permissionDenied'));
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.previewWrap}>
        {/* 实时取景用原生 <video>（非交互控件）；muted 防止外放回声 */}
        <video ref={previewRef} className={styles.preview} autoPlay muted playsInline />
        {!recording && (
          <div className={styles.previewHint}>{t('editor.record.previewHint')}</div>
        )}
      </div>
      <div className={styles.controls}>
        {recording ? (
          <Button theme="solid" type="danger" icon={<IconPause />} onClick={stopRecording}>
            {t('editor.record.stop')} · {formatTime(seconds)}
          </Button>
        ) : (
          <Button
            theme="solid"
            icon={<IconMicrophone />}
            loading={saving}
            onClick={() => void startRecording()}
          >
            {t('editor.record.start')}
          </Button>
        )}
      </div>
      <p className={styles.note}>{t('editor.record.note')}</p>
    </div>
  );
};

export default RecordPanel;
