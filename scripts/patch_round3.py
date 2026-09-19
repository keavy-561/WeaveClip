# -*- coding: utf-8 -*-
"""第三轮走查修复补丁（P1×3 + P2×4 + WO2 残留核对）"""
import io, json

def patch(path, pairs, must=True):
    s = io.open(path, encoding='utf-8').read()
    for old, new in pairs:
        if old not in s:
            if must:
                raise SystemExit('NOT FOUND in %s:\n%s' % (path, old[:150]))
            continue
        s = s.replace(old, new, 1)
    io.open(path, 'w', encoding='utf-8', newline='\n').write(s)
    print('patched', path)

# ---------- A. 时间轴片段点击防御性修复（P1：element center is obscured） ----------
p = 'web/src/components/editor/Timeline/Clip/index.module.scss'
patch(p, [
    (""".clip {
  position: absolute;
  top: 4px;
  bottom: 4px;""",
     """.clip {
  position: absolute;
  /* 片段提层：确保任何轨道背景/播放头层都不会盖住片段的命中区域 */
  z-index: 1;
  top: 4px;
  bottom: 4px;"""),
])
# 装饰子层全部禁用指针事件（事件统一由片段根元素接收）
s = io.open(p, encoding='utf-8').read()
for cls in ['.filmstrip', '.filmstripFrame', '.filmstripImg', '.waveform',
            '.waveformBar', '.pillContent', '.pillIcon', '.pillText',
            '.pillTitle', '.pillSub', '.clipIcon', '.clipLabel']:
    # 在对应类块的开头插一行 pointer-events: none;
    idx = s.find(cls + ' {')
    if idx < 0:
        raise SystemExit('class not found: ' + cls)
    insert_at = s.find('{', idx) + 1
    s = s[:insert_at] + '\n  pointer-events: none;' + s[insert_at:]
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('clip children pointer-events ok')

# ---------- B. 编辑器顶部“模板”按钮响应（P1） ----------
p = 'web/src/pages/Editor/[projectId]/index.tsx'
patch(p, [
    ("""            <Button theme="borderless" className={styles.navLink} size="small">
              {t('editor.header.templates')}
            </Button>""",
     """            <Button
              theme="borderless"
              className={styles.navLink}
              size="small"
              onClick={() => Toast.warning(t('editor.header.templatesSoon'))}
            >
              {t('editor.header.templates')}
            </Button>"""),
    ("import { Button, Empty, Skeleton } from '@douyinfe/semi-ui';",
     "import { Button, Empty, Skeleton, Toast } from '@douyinfe/semi-ui';"),
])

# ---------- C. 删除项目二次确认（P1） ----------
p = 'web/src/pages/Projects/index.tsx'
patch(p, [
    ("""                          <Button
                            theme="borderless"
                            size="small"
                            icon={<IconDelete />}
                            className={styles.popoverItem}
                            onClick={() => confirmDelete(project.id)}
                          >
                            {t('projects.delete', 'Delete')}
                          </Button>""",
     """                          <Popconfirm
                            title={t('projects.deleteConfirmTitle')}
                            onConfirm={() => confirmDelete(project.id)}
                          >
                            <Button
                              theme="borderless"
                              size="small"
                              icon={<IconDelete />}
                              className={styles.popoverItem}
                            >
                              {t('projects.delete', 'Delete')}
                            </Button>
                          </Popconfirm>"""),
])
# 补 Popconfirm import（贴合现有 semi import 行）
s = io.open(p, encoding='utf-8').read()
if "Popconfirm" not in s.split("@douyinfe/semi-ui'")[0] and 'from \'@douyinfe/semi-ui\'' in s:
    import re
    m = re.search(r"import \{([^}]+)\} from '@douyinfe/semi-ui';", s)
    names = [n.strip() for n in m.group(1).split(',')]
    if 'Popconfirm' not in names:
        names.insert(0, 'Popconfirm')
        s = s.replace(m.group(0), "import { %s } from '@douyinfe/semi-ui';" % ', '.join(names))
    io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('projects popconfirm ok')

# ---------- D. MediaPanel：去掉设计稿假图与“花卉”标签（P2） ----------
p = 'web/src/components/editor/MediaPanel/index.tsx'
s = io.open(p, encoding='utf-8').read()
# 删除 ASSET_IMAGES 常量（设计稿外链花卉图）
import re
s = re.sub(r"const ASSET_IMAGES: Record<string, string> = \{.*?\};\n\n", "", s, flags=re.S)
# 两处 img 回退：无真实缩略图时渲染中性占位块，而非空 src / 假图
s = s.replace("""                  <img
                    className={styles.assetImg}
                    src={asset.thumbnailUrl ?? ASSET_IMAGES[asset.id] ?? ''}
                    alt={asset.fileName}
                    loading="lazy"
                  />""",
"""                  {asset.thumbnailUrl ? (
                    <img
                      className={styles.assetImg}
                      src={asset.thumbnailUrl}
                      alt={asset.fileName}
                      loading="lazy"
                    />
                  ) : (
                    <div className={styles.assetPlaceholder} aria-hidden="true" />
                  )}""")
s = s.replace("""                  <img
                    className={styles.horizontalImg}
                    src={asset.thumbnailUrl ?? ASSET_IMAGES[asset.id] ?? ''}
                    alt={asset.fileName}
                    loading="lazy"
                  />""",
"""                  {asset.thumbnailUrl ? (
                    <img
                      className={styles.horizontalImg}
                      src={asset.thumbnailUrl}
                      alt={asset.fileName}
                      loading="lazy"
                    />
                  ) : (
                    <div className={styles.assetPlaceholder} aria-hidden="true" />
                  )}""")
# 横版卡片上的“花卉”设计稿标签 → 显示真实文件名
s = s.replace("""                    <span className={styles.horizontalLabel}>{t('editor.mediaPanel.horizontalLabel')}</span>""",
"""                    <span className={styles.horizontalLabel}>{asset.fileName}</span>""")
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('mediapanel ok')

# 占位块样式
p = 'web/src/components/editor/MediaPanel/index.module.scss'
s = io.open(p, encoding='utf-8').read()
if '.assetPlaceholder' not in s:
    s += """
.assetPlaceholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, var(--semi-color-fill-1), var(--semi-color-fill-0));
}
"""
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
# 横版标签加省略号
s = io.open(p, encoding='utf-8').read()
if 'text-overflow' not in s.split('.horizontalLabel {')[1].split('}')[0] if '.horizontalLabel {' in s else True:
    idx = s.find('.horizontalLabel {')
    if idx >= 0:
        brace = s.find('{', idx) + 1
        s = s[:brace] + '\n  max-width: 90%;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;' + s[brace:]
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('mediapanel scss ok')

# ---------- E. 导出对话框 mock 模拟（P2：mock 模式无后端，WS/渲染接口不可达） ----------
p = 'web/src/components/editor/ExportDialog/index.tsx'
patch(p, [
    ("import { useRenderProgress } from '@/hooks/useRenderProgress';",
     "import { useRenderProgress } from '@/hooks/useRenderProgress';\n\nconst isMockMode = import.meta.env.VITE_API_MODE === 'mock';"),
    ("""  const [renderId, setRenderId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const { phase, progress, downloadUrl, error } = useRenderProgress(renderId);""",
     """  const [renderId, setRenderId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  // mock 模式：后端渲染链路不可达，用本地定时器模拟进度（真实模式走 WS/轮询）
  const [mockPhase, setMockPhase] = useState<'idle' | 'rendering' | 'completed'>('idle');
  const [mockProgress, setMockProgress] = useState(0);
  const { phase, progress, downloadUrl, error } = useRenderProgress(renderId);"""),
    ("""  const handleStart = async () => {
    setStarting(true);
    try {
      const resp = await renderService.start(projectId, { format, resolution, fps }) as { renderId: string };
      setRenderId(resp.renderId);
    } catch (e) {""",
     """  const handleStart = async () => {
    if (isMockMode) {
      setMockPhase('rendering');
      setMockProgress(0);
      const timer = window.setInterval(() => {
        setMockProgress((prev) => {
          const next = Math.min(prev + 8, 100);
          if (next >= 100) {
            window.clearInterval(timer);
            setMockPhase('completed');
          }
          return next;
        });
      }, 250);
      return;
    }
    setStarting(true);
    try {
      const resp = await renderService.start(projectId, { format, resolution, fps }) as { renderId: string };
      setRenderId(resp.renderId);
    } catch (e) {"""),
    ("""      {renderId == null ? (""",
     """      {isMockMode && mockPhase !== 'idle' ? (
        <div className={styles.progressArea}>
          {mockPhase === 'completed' ? (
            <p className={styles.doneText}>{t('editor.export.completed', 'Rendering completed!')}</p>
          ) : (
            <>
              <p className={styles.progressText}>{t('editor.export.rendering', 'Rendering...')}</p>
              <Progress percent={mockProgress} />
            </>
          )}
        </div>
      ) : renderId == null ? ("""),
])

# ---------- F. index.html：移除 Google Fonts（P2 国内超时，字体栈已有系统回退） ----------
p = 'web/index.html'
patch(p, [
    ("""    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
""",
     ""),
])
s = io.open(p, encoding='utf-8').read()
import re
s = re.sub(r'\s*<link[^>]*fonts\.googleapis\.com[^>]*/>', '', s)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('fonts ok')

# ---------- G. main.tsx：Router v7 flags + 移除 StrictMode（P2 findDOMNode） ----------
p = 'web/src/main.tsx'
patch(p, [
    ("""ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <I18nProvider>
          <App />
        </I18nProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);""",
     """// 说明：Semi Design 内部使用 findDOMNode，React.StrictMode 会触发弃用警告（走查 P2），
// 在 Semi 适配 Concurrent 渲染前暂不启用 StrictMode。
// BrowserRouter 预启 React Router v7 future flags，消除控制台升级提示。
ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <I18nProvider>
        <App />
      </I18nProvider>
    </BrowserRouter>
  </QueryClientProvider>
);"""),
])

# ---------- H. i18n keys ----------
for lang, texts in (
    ('zh', {
        'templatesSoon': '模板中心开发中，敬请期待',
        'deleteConfirmTitle': '确定删除该项目吗？删除后不可恢复。',
    }),
    ('en', {
        'templatesSoon': 'Template center is coming soon',
        'deleteConfirmTitle': 'Delete this project? This cannot be undone.',
    }),
):
    p = 'web/src/locales/%s.json' % lang
    data = json.load(io.open(p, encoding='utf-8'))
    data.setdefault('editor', {}).setdefault('header', {})['templatesSoon'] = texts['templatesSoon']
    data.setdefault('projects', {})['deleteConfirmTitle'] = texts['deleteConfirmTitle']
    io.open(p, 'w', encoding='utf-8', newline='\n').write(
        json.dumps(data, ensure_ascii=False, indent=2) + '\n')
print('i18n ok')

print('ALL OK')
