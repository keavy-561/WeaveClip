import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Select, Slider, Toast } from '@douyinfe/semi-ui';
import { IconPlay, IconPause, IconMute, IconVolume2, IconVideo, IconChevronLeft, IconChevronRight, IconFullScreenStroked } from '@douyinfe/semi-icons';
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
  // 品牌主色 = 字幕默认色（工单 WO6-09）：无显式 style.color 的字幕回退到它
  const brandPrimary = useBrandStore((s) => s.brand.primaryColor);
  const { t } = useAppTranslation();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  // 全屏预览的目标容器（含视频/字幕/水印/控制栏的整体画面）
  const screenRef = useRef<HTMLDivElement | null>(null);
  // 标志位：本次 store currentTime 更新来自 video 的 timeupdate（video → store），
  // 同步 effect 据此跳过回写，避免 video ↔ store 双向回环
  const isLocalUpdateRef = useRef(false);
  // clip 切换后待设置的素材内偏移（loadedmetadata 时消费）
  const pendingSeekRef = useRef<number | null>(null);

  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // 当前字幕（字幕轨命中播放头的片段），预览中真实渲染（工单 WO7-01）
  const activeCaption = useMemo(() => {
    const captionTrack = tracks.find((tr) => tr.type === 'caption');
    if (!captionTrack) return null;
    return (
      captionTrack.clips.find(
        (c) => currentTime >= c.start && currentTime < c.start + c.duration
      ) ?? null
    );
  }, [tracks, currentTime]);

  // 调色/滤镜/效果预览（工单 WO7-02）：映射为 CSS filter 实时作用于 <video>，
  // 最终成片效果以后端渲染管线（B17）编译的 ffmpeg 滤镜为准
  const previewFilter = useMemo(() => {
    if (!activeClip) return undefined;
    const parts: string[] = [];
    const brightness = activeClip.brightness ?? 0;
    const contrast = activeClip.contrast ?? 0;
    if (brightness !== 0) parts.push(`brightness(${(1 + brightness / 100).toFixed(3)})`);
    if (contrast !== 0) parts.push(`contrast(${(1 + contrast / 100).toFixed(3)})`);
    const presetFilter: Record<string, string> = {
      vivid: 'saturate(1.4)',
      charm: 'sepia(0.35) saturate(1.15)',
      sky: 'hue-rotate(18deg) saturate(1.15) brightness(1.05)',
      mono: 'grayscale(1)',
    };
    const preset = activeClip.params?.filter;
    if (typeof preset === 'string' && presetFilter[preset]) {
      parts.push(presetFilter[preset]);
    }
    const effectFilter: Record<string, string> = {
      vivid: 'saturate(1.4)',
      mono: 'grayscale(1)',
      vintage: 'sepia(0.45) contrast(0.95)',
    };
    const effect = activeClip.effectType;
    if (effect && effect !== 'none' && effectFilter[effect]) {
      parts.push(effectFilter[effect]);
    }
    return parts.length > 0 ? parts.join(' ') : undefined;
  }, [activeClip]);

  // 可播放地址：仅视频素材交给 <video>；mock 本地路径不可播，回退 CSS 渐变占位。
  // 图片素材由 <img> 渲染静态画面，播放头由时钟 effect 推进（见下方图片片段时钟）
  const videoSrc = activeAsset?.type === 'video' ? activeAsset.playbackUrl ?? null : null;
  const hasPlayableSource = !!videoSrc;
  // 播放/逐帧按钮的可用性：视频有源即可，图片素材天然可"播放"
  const canPlay = !!activeAsset && (activeAsset.type === 'image' || hasPlayableSource);

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

  // isPlaying → video：驱动真实播放/暂停；图片片段由时钟 effect 推进，<video> 必须停住
  //（否则其 timeupdate 仍按新片段上下文写时钟，与图片时钟双驱动导致播放头飞穿）
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!isPlaying) {
      video.pause();
      return;
    }
    if (!canPlay) {
      // 无可播放素材：立即回滚播放状态，保证 store 与真实能力一致（Space 快捷键同理）
      useTimelineStore.setState({ isPlaying: false });
      return;
    }
    if (!hasPlayableSource) {
      video.pause();
      return;
    }
    video.play().catch(() => {
      // 播放失败（如浏览器自动播放策略拦截）：回滚播放状态
      useTimelineStore.setState({ isPlaying: false });
    });
  }, [isPlaying, canPlay, hasPlayableSource]);

  // video → store：timeupdate 换算为时间轴绝对时间驱动播放头。
  // 仅视频片段有效：切到图片片段后 video 已暂停，残留的 timeupdate 若按新片段
  // 上下文换算会把时钟写成 vT+start，瞬间跳过整个图片段
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || activeAsset?.type !== 'video') return;
    const { start, sourceStart } = clipCtxRef.current;
    const absolute = video.currentTime - sourceStart + start;
    if (Math.abs(absolute - currentTime) < SYNC_EPSILON) return;
    isLocalUpdateRef.current = true;
    setCurrentTime(absolute);
  };

  // 片段播完的统一跳转：视频 ended 与图片时钟共用；有下一片段则跳过去继续播，否则暂停
  const handleClipEnd = (finished: Clip) => {
    const idx = videoTrackClips.findIndex((c) => c.id === finished.id);
    const next = videoTrackClips[idx + 1];
    if (!next) {
      useTimelineStore.setState({ isPlaying: false });
      return;
    }
    isLocalUpdateRef.current = true;
    setCurrentTime(next.start + 0.001);
    // 素材源不变时不会触发 loadedmetadata，挂起的 seek 无人消费：
    // 直接定位到下一片段的素材内位置并恢复播放，否则画面停在已播完的素材末尾（假死）。
    // 素材源变化时 pendingSeek 由 activeClipId effect 挂起、loadedmetadata 消费
    const nextAsset = next.assetId
      ? assets.find((a) => a.id === next.assetId) ??
        mockAssets.find((a) => a.id === next.assetId)
      : null;
    const video = videoRef.current;
    if (nextAsset?.type === 'video' && nextAsset.id === activeAsset?.id && video) {
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
  };

  // 播放到当前片段末尾（video ended 事件入口）
  const handleEnded = () => {
    if (!activeClip) {
      useTimelineStore.setState({ isPlaying: false });
      return;
    }
    handleClipEnd(activeClip);
  };

  // 图片片段时钟：video 元素对图片没有 timeupdate，播放中用真实时钟推进播放头；
  // 每 100ms 读取 store 最新时间再累加，外部 seek（拖拽播放头）在下一拍自然生效。
  // 到片段末尾走与视频 ended 相同的跳转逻辑
  const activeAssetType = activeAsset?.type;
  useEffect(() => {
    if (!isPlaying || !activeClip || activeAssetType !== 'image') return;
    const end = activeClip.start + (activeClip.duration ?? 0);
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const delta = (now - last) / 1000;
      last = now;
      const current = useTimelineStore.getState().currentTime;
      isLocalUpdateRef.current = true;
      if (current + delta >= end) {
        setCurrentTime(end);
        handleClipEnd(activeClip);
      } else {
        setCurrentTime(current + delta);
      }
    }, 100);
    return () => window.clearInterval(timer);
    // handleClipEnd 依赖 activeAsset/videoTrackClips，随 activeClip 变化重建
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, activeClip, activeAssetType, setCurrentTime]);

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

  // 全屏预览：进入/退出由 Fullscreen API 驱动，ESC 退出为浏览器原生行为，
  // 这里只同步按钮状态（部分环境 document.fullscreenElement 不实时，以事件为准）
  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement !== null);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = async () => {
    const el = screenRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        // 旧版 Safari 前缀回退
        const req = el.requestFullscreen?.bind(el) ??
          (el as HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> | void }).webkitRequestFullscreen?.bind(el);
        if (!req) {
          Toast.error(t('editor.videoPlayer.fullscreenUnsupported'));
          return;
        }
        await req();
      }
    } catch {
      Toast.error(t('editor.videoPlayer.fullscreenFailed'));
    }
  };

  return (
    <div className={styles.player}>
      <div className={styles.screen} ref={screenRef}>
        {/* 媒体元素用原生 <video>/<img> 标签（非交互控件），交互控件一律为 Semi 组件；
            图片段时 video 隐藏（其残留海报帧会从图片的 letterbox 透出） */}
        <video
          ref={videoRef}
          className={styles.video}
          style={{
            ...(previewFilter ? { filter: previewFilter } : undefined),
            ...(activeAsset?.type === 'image' ? { visibility: 'hidden' } : undefined),
          }}
          src={videoSrc ?? undefined}
          poster={activeAsset?.thumbnailUrl || undefined}
          preload="metadata"
          playsInline
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
        />
        {/* 图片素材片段：直接渲染图片画面，调色滤镜与视频一致 */}
        {activeAsset?.type === 'image' && (
          <img
            className={styles.video}
            src={activeAsset.playbackUrl ?? undefined}
            alt={activeAsset.fileName}
            style={previewFilter ? { filter: previewFilter } : undefined}
          />
        )}
        {/* 无可播素材且无缩略图时显示渐变占位（外链占位图已移除，WO4-05），
            附说明文案避免"一大块空白"的观感（WO5-02） */}
        {!canPlay && !activeAsset?.thumbnailUrl && (
          <div className={styles.screenPlaceholder}>
            <IconVideo className={styles.placeholderIcon} aria-hidden />
            <p className={styles.placeholderTitle}>{t('editor.videoPlayer.noPreviewTitle')}</p>
            <p className={styles.placeholderHint}>{t('editor.videoPlayer.noPreviewHint')}</p>
          </div>
        )}
        <div className={styles.mockTime}>{formatTime(currentTime)}</div>
        {/* 品牌水印（工单 WO6-09）：品牌面板填写名称后显示，颜色随品牌主色 */}
        {brandName.trim() && (
          <div className={styles.brandWatermark} style={{ color: brandPrimary }}>
            {brandName.trim()}
          </div>
        )}
        {/* 字幕真实渲染（工单 WO7-01）：按片段的颜色/位置/字号叠加显示 */}
        {activeCaption?.text && (
          <div
            className={`${styles.captionOverlay} ${
              styles[`caption${activeCaption.style?.position ?? 'bottom'}`] ?? ''
            }`}
            style={{
              color: activeCaption.style?.color ?? brandPrimary,
              fontSize: `${activeCaption.style?.size ?? 24}px`,
            }}
          >
            {activeCaption.text}
          </div>
        )}

        <div className={styles.overlay}>
          <div className={styles.controls}>
            {/* 逐帧步进（工单 WO9-07）：±1/30s */}
            <Button
              icon={<IconChevronLeft />}
              theme="borderless"
              size="small"
              onClick={() => setCurrentTime(Math.max(0, currentTime - 1 / 30))}
              disabled={!canPlay}
              aria-label={t('editor.videoPlayer.frameBack')}
              className={styles.controlBtn}
            />
            <Button
              icon={isPlaying ? <IconPause /> : <IconPlay />}
              theme="borderless"
              size="small"
              onClick={togglePlay}
              disabled={!canPlay}
              aria-label={isPlaying ? t('editor.videoPlayer.pause') : t('editor.videoPlayer.play')}
              className={styles.controlBtn}
            />
            <Button
              icon={<IconChevronRight />}
              theme="borderless"
              size="small"
              onClick={() => setCurrentTime(Math.min(duration, currentTime + 1 / 30))}
              disabled={!canPlay}
              aria-label={t('editor.videoPlayer.frameForward')}
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
            {/* 全屏预览：对整个画面（视频/字幕/水印/控制栏）进入 Fullscreen */}
            <Button
              icon={<IconFullScreenStroked />}
              theme="borderless"
              size="small"
              onClick={() => void toggleFullscreen()}
              aria-label={isFullscreen ? t('editor.videoPlayer.exitFullscreen') : t('editor.videoPlayer.fullscreen')}
              className={styles.controlBtn}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
