import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Wrapper } from '@/utils/test-utils';
import ExportDialog from './index';

/** ExportDialog 冒烟：表单字段渲染（工单 WO4-08）。
 * 渲染链路的进度交互依赖 env 模式与网络层，覆盖在 e2e；此处保证面板结构稳定 */
describe('ExportDialog', () => {
  it('renders export form fields when visible', () => {
    render(<ExportDialog projectId="proj_1" visible onClose={() => {}} />, { wrapper: Wrapper });
    expect(screen.getByText(/导出视频|Export video/i)).toBeTruthy();
    expect(screen.getByText(/格式|Format/i)).toBeTruthy();
    expect(screen.getByText(/分辨率|Resolution/i)).toBeTruthy();
    expect(screen.getByText(/帧率|Frame rate/i)).toBeTruthy();
    expect(screen.getByText(/开始渲染|Start rendering/i)).toBeTruthy();
  });

  it('does not render anything when hidden', () => {
    const { container } = render(
      <ExportDialog projectId="proj_1" visible={false} onClose={() => {}} />,
      { wrapper: Wrapper }
    );
    expect(container.querySelector('.semi-modal')).toBeFalsy();
  });
});
