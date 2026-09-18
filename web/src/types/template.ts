export interface Template {
  id: string;
  /** i18n key：模板标题 */
  titleKey: string;
  /** i18n key：模板标签（如「电影感」） */
  tagKey: string;
  /** i18n key：点击模板后预填到 Describe 的 prompt */
  promptKey: string;
  /** 卡片缩略图与标签的 Morandi 色调 */
  tone: 'slate' | 'rose' | 'sage' | 'steel';
}