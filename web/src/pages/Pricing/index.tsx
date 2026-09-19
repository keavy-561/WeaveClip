import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Modal, Tag, Toast } from '@douyinfe/semi-ui';
import { IconArrowLeft } from '@douyinfe/semi-icons';
import Logo from '@/components/ui/Logo';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import styles from './index.module.scss';

type PlanKey = 'free' | 'pro' | 'team';

const PLANS: Array<{ key: PlanKey; price: string }> = [
  { key: 'free', price: '¥0' },
  { key: 'pro', price: '¥39' },
  { key: 'team', price: '¥129' },
];

const PLAN_STORAGE_KEY = 'weaveclip-plan';

/**
 * 定价页（工单 WO6-05）：三档方案对比 + 升级流转。
 * 支付后端未接入（Phase 外）：升级在本地记录新方案，弹窗内已明示演示语义。
 */
const Pricing: React.FC = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const [currentPlan, setCurrentPlan] = useState<PlanKey>(() => {
    try {
      const saved = localStorage.getItem(PLAN_STORAGE_KEY);
      return saved === 'pro' || saved === 'team' ? saved : 'free';
    } catch {
      return 'free';
    }
  });

  const handleUpgrade = (plan: Exclude<PlanKey, 'free'>) => {
    const planName = t(`pricing.${plan}Name`);
    Modal.confirm({
      title: t('pricing.upgradeConfirmTitle', { plan: planName }),
      content: t('pricing.upgradeConfirmContent'),
      onOk: () => {
        try {
          localStorage.setItem(PLAN_STORAGE_KEY, plan);
        } catch {
          // 持久化失败仅影响刷新后的显示
        }
        setCurrentPlan(plan);
        Toast.success(t('pricing.upgradeSuccess', { plan: planName }));
      },
    });
  };

  return (
    <div className={styles.page}>
      <header className={styles.navbar}>
        <div className={styles.navLeft}>
          <Button
            icon={<IconArrowLeft />}
            theme="borderless"
            className={styles.backBtn}
            onClick={() => navigate('/')}
            aria-label={t('common.back')}
          />
          <Logo size="small" />
        </div>
        <h1 className={styles.pageTitle}>{t('pricing.title')}</h1>
        <div className={styles.navRight} />
      </header>

      <main className={styles.main}>
        <p className={styles.subtitle}>{t('pricing.subtitle')}</p>
        <div className={styles.planGrid}>
          {PLANS.map(({ key, price }) => (
            <Card
              key={key}
              className={`${styles.planCard} ${currentPlan === key ? styles.planCurrent : ''}`}
              title={t(`pricing.${key}Name`)}
            >
              <div className={styles.price}>
                {price}
                <span className={styles.perMonth}>/{t('pricing.perMonth')}</span>
              </div>
              <ul className={styles.features}>
                {[1, 2, 3, 4].map((feature) => (
                  <li key={feature}>{t(`pricing.${key}Feature${feature}`)}</li>
                ))}
              </ul>
              {currentPlan === key ? (
                <Tag color="green" className={styles.planTag}>
                  {t('pricing.currentPlan')}
                </Tag>
              ) : key !== 'free' ? (
                <Button theme="solid" block onClick={() => handleUpgrade(key)}>
                  {t('pricing.upgrade')}
                </Button>
              ) : null}
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Pricing;
