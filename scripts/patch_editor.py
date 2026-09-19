# -*- coding: utf-8 -*-
"""Editor 页接线补丁：时间线加载/自动保存 + 快捷键 + assetsStore + 重试 + 导出"""
import io

def patch(path, pairs):
    s = io.open(path, encoding='utf-8').read()
    for old, new in pairs:
        if old not in s:
            raise SystemExit('NOT FOUND in %s:\n%s' % (path, old[:150]))
        s = s.replace(old, new, 1)
    io.open(path, 'w', encoding='utf-8', newline='\n').write(s)
    print('patched', path)

p = 'web/src/pages/Editor/[projectId]/index.tsx'
patch(p, [
    ("import React, { useEffect } from 'react';",
     "import React, { useEffect, useRef, useState } from 'react';"),
    ("""import { projectService } from '@/services/projectService';
import { assetService } from '@/services/assetService';""",
     """import { projectService } from '@/services/projectService';
import { assetService } from '@/services/assetService';
import { timelineService } from '@/services/timelineService';
import { useAssetsStore } from '@/stores/assetsStore';
import { useEditorShortcuts } from '@/hooks/useEditorShortcuts';
import { backendToFront, frontToBackend } from '@/utils/dslAdapter';
import ExportDialog from '@/components/editor/ExportDialog';"""),
    ("""const Editor: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { t } = useAppTranslation();

  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  const setDSL = useTimelineStore((s) => s.setDSL);""",
     """const Editor: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { t } = useAppTranslation();
  const [exportOpen, setExportOpen] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  // 自动保存：时间线水合完成后才允许写回，避免“加载即保存”
  const hydratedRef = useRef(false);
  const lastSavedRef = useRef('');

  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  const setDSL = useTimelineStore((s) => s.setDSL);
  const setAssets = useAssetsStore((s) => s.setAssets);"""),
    ("""    queryKey: ['project', projectId],
    queryFn: () => projectService.get(projectId!),
    enabled: !!projectId && !isMockMode,
    retry: false,
  });""",
     """    queryKey: ['project', projectId, retryKey],
    queryFn: () => projectService.get(projectId!),
    enabled: !!projectId && !isMockMode,
    retry: false,
  });"""),
    ("""    queryKey: ['assets', projectId],
    queryFn: () => assetService.list(projectId!),
    enabled: !!projectId && !isMockMode,
    retry: false,
  });""",
     """    queryKey: ['assets', projectId, retryKey],
    queryFn: () => assetService.list(projectId!),
    enabled: !!projectId && !isMockMode,
    retry: false,
  });"""),
    ("""    if (project) {
      setCurrentProject({
        id: project.id,
        name: project.name,
        status: project.status,
        duration: project.duration,
        aspectRatio: project.aspectRatio,
        style: project.style,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        thumbnailUrl: project.thumbnailUrl,
      });
      setDSL(mockTimelineDSL);
      clearMessages();
      mockChatMessages.forEach((m) => addMessage(m));
    }
  }, [projectId, project, isMockMode]);""",
     """    if (project) {
      setCurrentProject({
        id: project.id,
        name: project.name,
        status: project.status,
        duration: project.duration,
        aspectRatio: project.aspectRatio,
        style: project.style,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        thumbnailUrl: project.thumbnailUrl,
      });
    }
  }, [projectId, project, isMockMode]);

  // 真实模式：加载持久化的时间线（工单 F06；后端 B09 版本化端点）
  useEffect(() => {
    if (isMockMode || !projectId || !project) return;
    void timelineService.get(projectId)
      .then((timeline) => {
        hydratedRef.current = true;
        if (timeline?.timelineJson) {
          setDSL(backendToFront(timeline.timelineJson as Parameters<typeof backendToFront>[0]));
        }
      })
      .catch(() => {
        hydratedRef.current = true;
      });
  }, [projectId, project, isMockMode]);"""),
    ("""  const currentProject = useProjectStore((s) => s.currentProject);

  const displayAssets =""",
     """  const currentProject = useProjectStore((s) => s.currentProject);
  const tracks = useTimelineStore((s) => s.tracks);
  const timelineDuration = useTimelineStore((s) => s.duration);

  // 素材注入全局 store：Clip/MediaPanel 由此读取真实素材信息
  useEffect(() => {
    setAssets(displayAssets);
  }, [displayAssets, setAssets]);

  // 防抖自动保存（真实模式，工单 F06）
  useEffect(() => {
    if (isMockMode || !hydratedRef.current || !projectId) return;
    const payload = frontToBackend({
      version: '1.0',
      fps: 30,
      duration: timelineDuration,
      width: 1080,
      height: 1920,
      tracks,
    });
    const json = JSON.stringify(payload);
    if (json === lastSavedRef.current || !tracks.length) return;
    const timer = window.setTimeout(() => {
      void timelineService.save(projectId, payload, 'editor autosave')
        .then(() => { lastSavedRef.current = json; })
        .catch(() => {
          /* 静默失败：下次变更会再次尝试 */
        });
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [tracks, timelineDuration, projectId]);

  // 键盘快捷键：Space/Delete/Ctrl+Z/Ctrl+Shift+Z（工单 F11）
  useEditorShortcuts();

  const displayAssets ="""),
    ("""                <Button theme="solid" onClick={() => navigate('/projects')}>
                  {t('common.back')}
                </Button>""",
     """                <div className={styles.errorActions}>
                  <Button theme="solid" onClick={() => setRetryKey((key) => key + 1)}>
                    {t('common.retry', 'Retry')}
                  </Button>
                  <Button theme="light" onClick={() => navigate('/projects')}>
                    {t('common.back')}
                  </Button>
                </div>"""),
    ("""          <Button icon={<IconDownload />} theme="solid" size="small" className={styles.exportBtn}>
            {t('common.exportVideo')}
          </Button>""",
     """          <Button
            icon={<IconDownload />}
            theme="solid"
            size="small"
            className={styles.exportBtn}
            onClick={() => setExportOpen(true)}
          >
            {t('common.exportVideo')}
          </Button>"""),
    ("""        <InspectorPanel />
        <ToolSidebar />
      </div>
    </div>
  );
};""",
     """        <InspectorPanel />
        <ToolSidebar />
      </div>

      <ExportDialog projectId={projectId ?? ''} visible={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
};"""),
])

print('ALL OK')
