import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Select, Slider } from '@douyinfe/semi-ui';
import { IconPlay, IconPause, IconMute, IconVolume2 } from '@douyinfe/semi-icons';
import { useTimelineStore } from '@/stores/timelineStore';
import { useAssetsStore } from '@/stores/assetsStore';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { formatTime } from '@/utils/format';
import { mockAssets } from '@/utils/mockData';
import styles from './index.module.scss';

/** 倍速档位 */
const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

/** 占位图：无真实可播放素材时保持原有视觉 */
const PLACEHOLDER_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuB5JApBOE5ibho-CY0MmltucxXxPsymmJ6TbumNUrcbSQzXrrZp5S_P6IIWygvuAlf9vDdLscZo8bsbvzB-hRab_TmD4YficAjetaLisUEdrNMKJDJW0t_wLF4PbeqjVtXPnCRN8UTKyPKzdw8Hy6Hahq5KUDhOW3MzoayX5MYg16-q0WB-KKycLfYgOkPyM_L-YDsIE1eCxZvcal4h9K4m-yMqE6tpqmghg9eEcoA71q8ka_DX_SOF9d9TiL9tvoq4yuQ';

/** 双向同步的容差（秒）：小于该差异视为播放中的正常增量，不触发程序化 seek */
const SYNC_EPSILON = 0.01;

const VideoPlayer: React.FC = () => {
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const currentTime = useTimelineStore((s) => s.currentTime);
  const duration = useTimelineStore((s) => s.duration);
  const setCurrentTime = useTimelineStore((s) => s.setCurrentTime);
  const togglePlay = useTimelineStore((s) => s.togglePlay);
  const tracks = useTimelineStore((s) => s.tracks);
  const assets = useAssetsStore((s) => s.assets);
  const { t } = useAppTranslation();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  // 标志位：本次 store currentTime 更新来自 video 的 timeupdate（video → store），
  // 同步 effect 据此跳过回写，避免 video ↔ store 双向回环
  const isLocalUpdateRef = useRef(false);

  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);

  // 视频源：时间轴视频轨按 start 排序的第一个片段对应的素材
  // （多片段连续切换播放留待后续，当前预览器聚焦第一个素材的真实播放）
  const activeAsset = useMemo(() => {
    const videoTrack = tracks.find((tr) => tr.type === 'video');
    const firstClip = videoTrack
      ? [...videoTrack.clips].sort((a, b) => a.start - b.start)[0]
      : undefined;
    if (!firstClip) return null;
    return (
      assets.find((a) => a.id === firstClip.assetId) ??
      mockAssets.find((a) => a.id === firstClip.assetId) ??
      null
    );
  }, [tracks, assets]);

  // 播放地址取素材的可播放地址（storagePath）。mock 数据是本地假路径（/mock/*），
  // 没有真实可播 URL 时不绑定 src，由 poster 展示现有占位图，但播放器逻辑始终为真实实现
  // 可播放地址：后端预签名 playbackUrl 优先；mock 本地路径不可播，回退占位图
  const videoSrc = activeAsset?.playbackUrl ?? null;
  const hasPlayableSource = !!videoSrc;

  // isPlaying → video：驱动真实播放/暂停
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!isPlaying) {
      video.pause();
      return;
    }
    if (!hasPlayableSource) {
      // 无可播放素材：立即回滚播放状态，保证 store 与真实能力一致（Space 快捷键同理）
      useTimelineStore.setState({ isPlaying: false });
      return;
    }
    video.play().catch(() => {
      // 播放失败（如浏览器自动播放策略拦截）：回滚播放状态
      useTimelineStore.setState({ isPlaying: false });
    });
  }, [isPlaying, hasPlayableSource]);

  // video → store：timeupdate 驱动时间轴播放头
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const time = video.currentTime;
    // 值未变化时不写 store：store 不重渲染会导致标志位悬空无法被消费
    if (time === currentTime) return;
    isLocalUpdateRef.current = true;
    setCurrentTime(time);
  };

  // 播放结束：回写播放状态
  const handleEnded = () => {
    useTimelineStore.setState({ isPlaying: false });
  };

  // store → video：外部 seek（如时间轴标尺点击）同步到 video；
  // 由 timeupdate 引发的更新通过标志位跳过，防止回环
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hasPlayableSource) return;
    if (isLocalUpdateRef.current) {
      isLocalUpdateRef.current = false;
      return;
    }
    if (Math.abs(video.currentTime - currentTime) > SYNC_EPSILON) {
      video.currentTime = currentTime;
    }
  }, [currentTime, hasPlayableSource]);

  // 音量/静音真实作用于 video 元素
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = muted;
  }, [volume, muted]);

  // 倍速真实作用于 video 元素
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = playbackRate;
  }, [playbackRate]);

  return (
    <div className={styles.player}>
      <div className={styles.screen}>
        {/* 媒体元素用原生 <video> 标签（非交互控件），交互控件一律为 Semi 组件 */}
        <video
          ref={videoRef}
          className={styles.video}
          src={hasPlayableSource ? videoSrc ?? undefined : undefined}
          poster={activeAsset?.thumbnailUrl ?? PLACEHOLDER_IMAGE}
          preload="metadata"
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
        />
        <div className={styles.mockTime}>{formatTime(currentTime)}</div>

        <div className={styles.overlay}>
          <div className={styles.controls}>
            <Button
              icon={isPlaying ? <IconPause /> : <IconPlay />}
              theme="borderless"
              size="small"
              onClick={togglePlay}
              aria-label={isPlaying ? t('editor.videoPlayer.pause') : t('editor.videoPlayer.play')}
              className={styles.controlBtn}
            />
            <span className={styles.timeDisplay}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(v) => setVolume(v as number)}
              disabled={muted}
              className={styles.volumeSlider}
              aria-label={t('editor.videoPlayer.volume')}
            />
            <Button
              icon={muted ? <IconMute /> : <IconVolume2 />}
              theme="borderless"
              size="small"
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? t('editor.videoPlayer.unmute') : t('editor.videoPlayer.mute')}
              className={styles.controlBtn}
            />
            <Select
              size="small"
              value={playbackRate}
              onChange={(v) => setPlaybackRate(v as number)}
              optionList={PLAYBACK_RATES.map((rate) => ({
                value: rate,
                label: `${rate}x`,
              }))}
              className={styles.speedSelect}
              aria-label={t('editor.videoPlayer.speed')}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
