import React, { useState } from 'react';
import { Button, Form, Toast } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/authService';
import styles from './index.module.scss';

type Mode = 'login' | 'register';

const Login: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: { email: string; password: string; name?: string }) => {
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await authService.login(values.email, values.password);
        localStorage.setItem('weaveclip-token', res.token);
        Toast.success(t('login.success'));
        navigate('/projects');
      } else {
        await authService.register(values.email, values.password, values.name);
        Toast.success(t('login.registerSuccess'));
        setMode('login');
      }
    } catch (e: any) {
      Toast.error(e?.message || t('login.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h2 className={styles.title}>{mode === 'login' ? t('login.title') : t('login.registerTitle')}</h2>
        <Form onSubmit={handleSubmit} labelPosition="top">
          <Form.Input field="email" label={t('login.email')} rules={[{ required: true, message: t('login.emailRequired') }]} />
          <Form.Input field="password" label={t('login.password')} type="password" rules={[{ required: true, message: t('login.passwordRequired') }]} />
          {mode === 'register' && (
            <Form.Input field="name" label={t('login.name')} />
          )}
          <Button htmlType="submit" theme="solid" loading={loading} block>{mode === 'login' ? t('login.submit') : t('login.registerSubmit')}</Button>
        </Form>
        <div className={styles.footer}>
          <span>{mode === 'login' ? t('login.noAccount') : t('login.hasAccount')}</span>
          <Button theme="borderless" type="tertiary" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? t('login.switchRegister') : t('login.switchLogin')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Login;
