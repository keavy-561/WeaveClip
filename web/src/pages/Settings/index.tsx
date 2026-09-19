import React, { useEffect } from 'react';
import { Button, Skeleton, Tag } from '@douyinfe/semi-ui';
import { IconArrowLeft } from '@douyinfe/semi-icons';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { authService, mockAccount } from '@/services/authService';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import styles from './index.module.scss';

const isMockMode = import.meta.env.VITE_API_MODE === 'mock';

// 与 RequireAuth 共用 ['auth','me'] 查询缓存，避免重复请求
const ME_STALE_TIME = 5 * 60 * 1000;

/**
 * 设置页（工单 WO2-04）：
 * 当前工程只有浅色主题（Morandi 重构后未保留主题切换基建），故本页仅提供
 * 语言切换与账号信息展示。
 */
const Settings: React.FC = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();

  // 真实模式：从 /auth/me 读取账号信息（RequireAuth 已验证过 token，此处直接命中缓存）
  const { data: user, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authService.me(),
    enabled: !isMockMode,
    retry: false,
    staleTime: ME_STALE_TIME,
  });

  useEffect(() => {
    document.title = `${t('settings.title')} - ${t('common.appName')}`;
  }, [t]);

  const hasToken = !!localStorage.getItem('weaveclip-token');

  // 账号邮箱：mock 模式显示演示账号；真实模式来自 /auth/me
  const email = isMockMode ? mockAccount.email : user?.email ?? '';

  return (
    <div className={styles.page}>
      <header className={styles.navbar}>
        <div className={styles.navLeft}>
          {/* 显式返回按钮（AGENTS.md 规则 9） */}
          <Button
            icon={<IconArrowLeft />}
            theme="borderless"
            className={styles.backBtn}
            aria-label={t('common.back', 'Back')}
            onClick={() => navigate(-1)}
          />
        </div>
        <div className={styles.navCenter}>
          <h2 className={styles.title}>{t('settings.title')}</h2>
        </div>
      </header>

      <main className={styles.main}>
        {/* 语言设置 */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('settings.language')}</h3>
          <div className={styles.row}>
            <span className={styles.rowLabel}>{t('settings.languageLabel')}</span>
            <LanguageSwitcher />
          </div>
        </section>

        {/* 账号信息 */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('settings.account')}</h3>
          <div className={styles.row}>
            <span className={styles.rowLabel}>{t('settings.email')}</span>
            {isLoading && !isMockMode ? (
              <Skeleton
                loading
                active
                className={styles.emailSkeleton}
                placeholder={<Skeleton.Paragraph rows={1} />}
              />
            ) : (
              <span className={styles.rowValue}>{email || '—'}</span>
            )}
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>{t('settings.loginStatus')}</span>
            {isMockMode || hasToken ? (
              <Tag color="green">{t('settings.loggedIn')}</Tag>
            ) : (
              <Tag color="grey">{t('settings.notLoggedIn')}</Tag>
            )}
          </div>
          {isMockMode && (
            <div className={styles.mockHint}>{t('settings.mockHint')}</div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Settings;
