import React, { useState } from 'react';
import { Button, Form, Toast } from '@douyinfe/semi-ui';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { useNavigate } from 'react-router-dom';
import { authService, mockAccount } from '@/services/authService';
import styles from './index.module.scss';

type Mode = 'login' | 'register';

interface LoginFormValues {
  email: string;
  password: string;
  name?: string;
}

const Login: React.FC = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [formApi] = Form.useForm<LoginFormValues>();

  const handleSubmit = async (values: LoginFormValues) => {
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
      Toast.error(mapAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  // 后端错误消息（已由 api 拦截器透传）映射为本地化文案，未知错误回退到原始消息便于诊断
  const mapAuthError = (e: any): string => {
    const known: Record<string, string> = {
      'invalid email format': t('login.invalidEmail'),
      'password must be at least 8 characters': t('login.passwordTooShort'),
      'name must be at most 255 characters': t('login.nameTooLong'),
      'email already registered': t('login.emailRegistered'),
      'invalid email or password': t('login.badCredentials'),
    };
    const raw = typeof e?.message === 'string' ? e.message.toLowerCase() : '';
    if (known[raw]) {
      return known[raw];
    }
    if (e?.message && e.message !== 'Request failed with status code 400') {
      return e.message;
    }
    return t('login.error');
  };

  const fillDemoAccount = () => {
    formApi.setValues({
      email: mockAccount.email,
      password: mockAccount.password,
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h2 className={styles.title}>{mode === 'login' ? t('login.title') : t('login.registerTitle')}</h2>
        <Form
          form={formApi}
          onSubmit={handleSubmit}
          labelPosition="top"
        >
          <Form.Input field="email" label={t('login.email')} rules={[{ required: true, message: t('login.emailRequired') }]} />
          <Form.Input field="password" label={t('login.password')} type="password" rules={[{ required: true, message: t('login.passwordRequired') }]} />
          {mode === 'register' && (
            <Form.Input field="name" label={t('login.name')} />
          )}
          <Button htmlType="submit" theme="solid" loading={loading} block>{mode === 'login' ? t('login.submit') : t('login.registerSubmit')}</Button>
        </Form>
        {mode === 'login' && (
          <div className={styles.demoRow}>
            <span className={styles.demoHint}>{t('login.demoHint')}</span>
            <Button theme="borderless" type="tertiary" onClick={fillDemoAccount}>
              {t('login.demoFill')}
            </Button>
          </div>
        )}
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