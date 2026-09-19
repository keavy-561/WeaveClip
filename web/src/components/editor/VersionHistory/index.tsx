import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Empty, SideSheet, Skeleton, Toast } from '@douyinfe/semi-ui';
import { IconHistory } from '@douyinfe/semi-icons';
import { timelineService } from '@/services/timelineService';
import { useTimelineStore } from '@/stores/timelineStore';
import { backendToFront } from '@/utils/dslAdapter';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import styles from './index.module.scss';

interface VersionHistoryProps {
  projectId: string;
  visible: boolean;
  onClose: () => void;
}

/** 版本历史（工单 WO2-03，Phase 6.1）：
 * 列出时间线全部版本，一键回滚到指定版本（后端 /timeline/versions 已就绪） */
const VersionHistory: React.FC<VersionHistoryProps> = ({ projectId, visible, onClose }) => {
  const { t, i18n } = useAppTranslation();
  const setDSL = useTimelineStore((s) => s.setDSL);
  const queryClient = useQueryClient();

  const versionsQuery = useQuery({
    queryKey: ['timeline-versions', projectId],
    queryFn: () => timelineService.versions(projectId),
    enabled: visible && Boolean(projectId),
  });

  const handleRestore = async (version: number) => {
    try {
      const timeline = await timelineService.getVersion(projectId, version);
      if (timeline?.timelineJson) {
        setDSL(backendToFront(timeline.timelineJson as unknown as Parameters<typeof backendToFront>[0]));
        Toast.success(t('editor.versionHistory.restoreDone', { version }));
        // 回滚即产生新版本：刷新版本列表（工单 WO9-05）
        void queryClient.invalidateQueries({ queryKey: ['timeline-versions', projectId] });
        onClose();
      }
    } catch {
      Toast.error(t('editor.versionHistory.restoreFailed'));
    }
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(i18n.language === 'en' ? 'en-US' : 'zh-CN');
    } catch {
      return iso;
    }
  };

  return (
    <SideSheet
      title={
        <span className={styles.title}>
          <IconHistory className={styles.titleIcon} />
          {t('editor.versionHistory.title')}
        </span>
      }
      visible={visible}
      onCancel={onClose}
      // 小屏自适应：不超过视口宽度（工单 WO9-05）
      width={Math.min(380, Math.max(280, window.innerWidth * 0.9))}
    >
      {versionsQuery.isLoading ? (
        <Skeleton loading active placeholder={<Skeleton.Paragraph rows={4} />} />
      ) : !versionsQuery.data || versionsQuery.data.length === 0 ? (
        <Empty description={t('editor.versionHistory.empty')} />
      ) : (
        <div className={styles.list}>
          {versionsQuery.data.map((v) => (
            <div key={v.id} className={styles.item}>
              <div className={styles.meta}>
                <span className={styles.version}>v{v.version}</span>
                <span className={styles.label}>{v.label || t('editor.versionHistory.unlabeled')}</span>
                <span className={styles.time}>{formatTime(v.createdAt)}</span>
              </div>
              <Button size="small" onClick={() => handleRestore(v.version)}>
                {t('editor.versionHistory.restore')}
              </Button>
            </div>
          ))}
        </div>
      )}
    </SideSheet>
  );
};

export default VersionHistory;
