/** 认证相关工具（工单 WO4-02） */

/** 退出登录：清除本地 token（跳转由调用方处理） */
export function logout(): void {
  localStorage.removeItem('weaveclip-token');
}
