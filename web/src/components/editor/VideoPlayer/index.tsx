import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Select, Slider } from '@douyinfe/semi-ui';
import { IconPlay, IconPause, IconMute, IconVolume2, IconVideo } from '@douyinfe/semi-icons';
import { useTimelineStore } from '@/stores/timelineStore';
import { useAssetsStore } from '@/stores/assetsStore';
import { useBrandStore } from '@/stores/brandStore';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { formatTime } from '@/utils/format';
import { mockAssets } from '@/utils/mockData';
import type { Clip } from '@/types/timeline';
import type { Asset } from '@/types/asset';
import styles from './index.module.scss';

/** 倍速档位 */
const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

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
  const brandName = useBrandStore((s) => s.brand.name);
  const { t } = useAppTranslation();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  // 标志位：本次 store currentTime 更新来自 video 的 timeupdate（video → store），
  // 同步 effect 据此跳过回写，避免 video ↔ store 双向回环
  const isLocalUpdateRef = useRef(false);
  // clip 切换后待设置的素材内偏移（loadedmetadata 时消费）
  const pendingSeekRef = useRef<number | null>(null);

  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);

  const videoTrackClips = useMemo(() => {
    const videoTrack = tracks.find((tr) => tr.type === 'video');
    if (!videoTrack) return [] as Clip[];
    return [...videoTrack.clips].sort((a, b) => a.start - b.start);
  }, [tracks]);

  // 当前应播的 clip：start <= currentTime < start+duration；找不到（片间空隙）沿用最后一个
  const activeClip = useMemo(() => {
    if (videoTrackClips.length === 0) return null;
    return (
      videoTrackClips.find(
        (c) => currentTime >= c.start && currentTime < c.start + (c.duration ?? 0)
      ) ?? videoTrackClips[videoTrackClips.length - 1]
    );
  }, [videoTrackClips, currentTime]);

  const activeAsset: Asset | null = useMemo(() => {
    if (!activeClip?.assetId) return null;
    return (
      assets.find((a) => a.id === activeClip.assetId) ??
      mockAssets.find((a) => a.id === activeClip.assetId) ??
      null
    );
  }, [activeClip, assets]);

  // 可播放地址：后端预签名 playbackUrl 优先；mock 本地路径不可播，回退 CSS 渐变占位
  const videoSrc = activeAsset?.playbackUrl ?? null;
  const hasPlayableSource = !!videoSrc;

  // 当前 clip 的素材内偏移与时间轴起点（timeupdate 换算绝对时间用，ref 防闭包过期）
  const clipCtxRef = useRef({ start: 0, sourceStart: 0 });
  useEffect(() => {
    clipCtxRef.current = {
      start: activeClip?.start ?? 0,
      sourceStart: activeClip?.sourceStart ?? 0,
    };
  }, [activeClip]);

  // clip 切换（素材源变化）：挂起待 seek 的素材内位置
  const activeClipId = activeClip?.id ?? null;
  useEffect(() => {
    if (!activeClip || !hasPlayableSource) return;
    pendingSeekRef.current = currentTime - activeClip.start + (activeClip.sourceStart ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClipId, videoSrc]);

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    if (pendingSeekRef.current != null) {
      video.currentTime = Math.max(0, pendingSeekRef.current);
      pendingSeekRef.current = null;
    }
    if (isPlaying) {
      video.play().catch(() => {
        useTimelineStore.setState({ isPlaying: false });
      });
    }
  };

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

  // video → store：timeupdate 换算为时间轴绝对时间驱动播放头
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const { start, sourceStart } = clipCtxRef.current;
    const absolute = video.currentTime - sourceStart + start;
    if (Math.abs(absolute - currentTime) < SYNC_EPSILON) return;
    isLocalUpdateRef.current = true;
    setCurrentTime(absolute);
  };

  // 播放到当前片段末尾：有下一片段则跳过去继续播，否则暂停
  const handleEnded = () => {
    if (!activeClip) {
      useTimelineStore.setState({ isPlaying: false });
      return;
    }
    const idx = videoTrackClips.findIndex((c) => c.id === activeClip.id);
    const next = videoTrackClips[idx + 1];
    if (next) {
      isLocalUpdateRef.current = true;
      setCurrentTime(next.start + 0.001);
      // 素材源不变时不会触发 loadedmetadata，挂起的 seek 无人消费：
      // 直接定位到下一片段的素材内位置并恢复播放，否则画面停在已播完的素材末尾（假死）
      const video = videoRef.current;
      if (video && hasPlayableSource) {
        const target = (next.sourceStart ?? 0) + 0.001;
        pendingSeekRef.current = null;
        if (Math.abs(video.currentTime - target) > SYNC_EPSILON) {
          video.currentTime = target;
        }
        if (video.paused) {
          video.play().catch(() => {
            useTimelineStore.setState({ isPlaying: false });
          });
        }
      }
      if (!isPlaying) {
        useTimelineStore.setState({ isPlaying: true });
      }
    } else {
      useTimelineStore.setState({ isPlaying: false });
    }
  };

  // store → video：外部 seek（如时间轴标尺点击）换算为素材内时间同步到 video；
  // 由 timeupdate 引发的更新通过标志位跳过，防止回环
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hasPlayableSource) return;
    if (isLocalUpdateRef.current) {
      isLocalUpdateRef.current = false;
      return;
    }
    const { start, sourceStart } = clipCtxRef.current;
    const materialTime = currentTime - start + sourceStart;
    if (materialTime >= 0 && Math.abs(video.currentTime - materialTime) > SYNC_EPSILON) {
      video.currentTime = materialTime;
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
          poster={activeAsset?.thumbnailUrl || undefined}
          preload="metadata"
          playsInline
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
        />
        {/* 无可播源且无缩略图时显示渐变占位（外链占位图已移除，WO4-05），
            附说明文案避免"一大块空白"的观感（WO5-02） */}
        {!hasPlayableSource && !activeAsset?.thumbnailUrl && (
          <div className={styles.screenPlaceholder}>
            <IconVideo className={styles.placeholderIcon} aria-hidden />
            <p className={styles.placeholderTitle}>{t('editor.videoPlayer.noPreviewTitle')}</p>
            <p className={styles.placeholderHint}>{t('editor.videoPlayer.noPreviewHint')}</p>
          </div>
        )}
        <div className={styles.mockTime}>{formatTime(currentTime)}</div>
        {/* 品牌水印（工单 WO6-09）：品牌面板填写名称后显示 */}
        {brandName.trim() && <div className={styles.brandWatermark}>{brandName.trim()}</div>}

        <div className={styles.overlay}>
          <div className={styles.controls}>
            <Button
              icon={isPlaying ? <IconPause /> : <IconPlay />}
              theme="borderless"
              size="small"
              onClick={togglePlay}
              disabled={!hasPlayableSource}
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
