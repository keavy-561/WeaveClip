import { Component, ReactNode } from 'react';
import { Button, Typography } from '@douyinfe/semi-ui';
import { IconRefresh } from '@douyinfe/semi-icons';
// 类组件不能用 useTranslation hook，直接取 i18n 单例（WO5-12 兜底 UI 文案本地化）
import i18n from '@/locales/i18n';
import styles from './ErrorBoundary.module.scss';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const { Title, Paragraph } = Typography;

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className={styles.container}>
          <div className={styles.content}>
            <div className={styles.icon}>
              <IconRefresh size="extra-large" />
            </div>
            <Title heading={4}>{i18n.t('common.errorTitle')}</Title>
            <Paragraph type="secondary">
              {i18n.t('common.errorDescription')}
            </Paragraph>
            {this.state.error && (
              <pre className={styles.errorDetails}>
                {this.state.error.message}
              </pre>
            )}
            <Button
              theme="solid"
              icon={<IconRefresh />}
              onClick={this.handleReset}
              className={styles.button}
            >
              {i18n.t('common.retry')}
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
