import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  IconUndo,
  IconRedo,
  IconScissors,
  IconDelete,
  IconImage,
} from '@douyinfe/semi-icons';
import { Button, Empty } from '@douyinfe/semi-ui';
import { useTimelineStore } from '@/stores/timelineStore';
import { useEditorUIStore } from '@/stores/editorUIStore';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { formatTime } from '@/utils/format';
import Track from './Track';
import Ruler from './Ruler';
import Playhead from './Playhead';
import styles from './index.module.scss';

// 每秒对应的像素数（zoom = 1 时）
const PX_PER_SEC = 24;

// 播放头跟随滚动时与视口边缘保持的像素距离：不贴边，留出可视余量
const PLAYHEAD_EDGE_MARGIN = 48;

const Timeline: React.FC = () => {
  const {
    tracks,
    duration,
    zoom,
    currentTime,
    selectedClipId,
    selectClip,
    setCurrentTime,
    setZoom,
    deleteClip,
    splitClip,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useTimelineStore();
  const setActiveTool = useEditorUIStore((s) => s.setActiveTool);
  const { t } = useAppTranslation();

  const pxPerSec = PX_PER_SEC * zoom;
  const totalWidth = Math.max(duration * pxPerSec + 120, 600);
  // 空时间轴判定：所有轨道片段数为 0 时渲染引导空态（WO5-08）
  const totalClips = tracks.reduce((sum, track) => sum + track.clips.length, 0);

  // 视口窗口（秒）：Track 只渲染与窗口相交的片段，滚动动态换入换出（工单 WO9-08）
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });
  const updateVisibleRange = useCallback(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    setVisibleRange({
      start: el.scrollLeft / pxPerSec,
      end: (el.scrollLeft + el.clientWidth) / pxPerSec,
    });
  }, [pxPerSec]);
  useEffect(() => {
    updateVisibleRange();
  }, [updateVisibleRange]);

  // 播放头跟随：currentTime 变化（拖拽指针 / 键盘微调 / 转写跳转 / 播放推进）时，
  // 播放头越出视口左缘或右缘则将滚动区滚动到使其保持可见。
  // 只滚动越界的那一小段，拖拽出界后指针会持续贴在边缘滑动而非跳变。
  // 手动滚轮 / 滚动条滚动不改变 currentTime，effect 不触发，两者不冲突。
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const x = currentTime * pxPerSec;
    if (x < el.scrollLeft + PLAYHEAD_EDGE_MARGIN) {
      el.scrollLeft = Math.max(0, x - PLAYHEAD_EDGE_MARGIN);
    } else if (x > el.scrollLeft + el.clientWidth - PLAYHEAD_EDGE_MARGIN) {
      el.scrollLeft = x - el.clientWidth + PLAYHEAD_EDGE_MARGIN;
    }
  }, [currentTime, pxPerSec]);

  const handleDelete = () => {
    if (selectedClipId) deleteClip(selectedClipId);
  };

  const handleSplit = () => {
    if (!selectedClipId) return;
    const splitPoint = currentTime;
    // 只在选中片段时间范围内切分
    for (const track of tracks) {
      const clip = track.clips.find((c) => c.id === selectedClipId);
      if (!clip) continue;
      if (splitPoint <= clip.start || splitPoint >= clip.start + clip.duration) return;
      splitClip(selectedClipId, splitPoint);
      return;
    }
  };

  return (
    <div className={styles.timeline}>
      {/* 工具头 */}
      <div className={styles.toolHeader}>
        <div className={styles.toolHeaderLeft}>
          <Button
            icon={<IconUndo />}
            theme="borderless"
            size="small"
            className={styles.iconBtn}
            disabled={!canUndo}
            onClick={undo}
            aria-label={t('common.undo')}
          />
          <Button
            icon={<IconRedo />}
            theme="borderless"
            size="small"
            className={styles.iconBtn}
            disabled={!canRedo}
            onClick={redo}
            aria-label={t('common.redo')}
          />
          <span className={styles.divider} />
          <Button
            icon={<IconScissors />}
            theme="borderless"
            size="small"
            className={styles.iconBtn}
            disabled={!selectedClipId}
            onClick={handleSplit}
            aria-label={t('editor.timeline.split')}
          />
          <Button
            icon={<IconDelete />}
            theme="borderless"
            size="small"
            className={styles.iconBtn}
            disabled={!selectedClipId}
            onClick={handleDelete}
            aria-label={t('editor.timeline.deleteClip')}
          />
          {/* 打开左侧媒体面板（与 SideNavBar 共用 editorUIStore 状态） */}
          <Button
            icon={<IconImage />}
            theme="borderless"
            size="small"
            className={styles.iconBtn}
            onClick={() => setActiveTool('media')}
            aria-label={t('editor.timeline.addMedia')}
          />
        </div>
        <div className={styles.toolHeaderCenter}>
          <span className={styles.timecodeMain}>{formatTime(currentTime)}</span>
          <span className={styles.timecodeSub}>/ {formatTime(duration)}</span>
        </div>
        <div className={styles.toolHeaderRight}>
          <div className={styles.zoomControls}>
            <Button
              theme="borderless"
              size="small"
              className={styles.iconBtn}
              onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
              aria-label={t('editor.timeline.zoomOut')}
            >
              −
            </Button>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.25"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className={styles.zoomSlider}
            />
            <Button
              theme="borderless"
              size="small"
              className={styles.iconBtn}
              onClick={() => setZoom(Math.min(3, zoom + 0.25))}
              aria-label={t('editor.timeline.zoomIn')}
            >
              +
            </Button>
          </div>
          <span className={styles.divider} />
        </div>
      </div>

{/* 左侧轨道标签列 + 右侧时间轴滚动区域：同一行 */}
      <div className={styles.bodyRow}>
        <div className={styles.trackLabels}>
          <div className={styles.rulerSpacer} />
          {tracks.map((track) => (
            <div key={track.id} className={styles.trackLabel}>
              {track.type === 'video' && <span className={`${styles.trackLabelCode} ${styles.video}`}>V1</span>}
              {track.type === 'audio' && <span className={`${styles.trackLabelCode} ${styles.audio}`}>A1</span>}
              <span className={styles.trackDot} />
              <span className={styles.trackLabelText}>
                {track.type === 'video'
                  ? t('editor.timeline.videoTrack')
                  : track.type === 'caption'
                    ? t('editor.timeline.captionTrack')
                    : track.type === 'audio'
                      ? t('editor.timeline.audioTrack')
                      : t('editor.timeline.effectTrack')}
              </span>
            </div>
          ))}
        </div>

        {/* 右侧时间轴滚动区域 */}
        <div
          className={styles.scrollArea}
          ref={scrollAreaRef}
          onScroll={updateVisibleRange}
          onClick={(e) => {
            if (e.target === e.currentTarget) selectClip(null);
          }}
        >
          <div ref={canvasRef} className={styles.canvas} style={{ width: totalWidth }}>
            <Ruler duration={duration} pxPerSec={pxPerSec} onSeek={setCurrentTime} />

            {tracks.map((track) => (
              <Track
                key={track.id}
                track={track}
                pxPerSec={pxPerSec}
                selectedClipId={selectedClipId}
                onSelectClip={selectClip}
                visibleRange={visibleRange}
              />
            ))}

            <Playhead pxPerSec={pxPerSec} canvasRef={canvasRef} />

            {/* 空时间轴引导：pointer-events:none，不拦截素材拖入（WO5-08） */}
            {totalClips === 0 && (
              <div className={styles.emptyOverlay}>
                <Empty description={t('editor.timeline.emptyHint')} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
