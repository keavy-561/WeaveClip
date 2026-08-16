import React from 'react';
import styles from './index.module.scss';

const Logo: React.FC<{ size?: 'normal' | 'small' }> = ({ size = 'normal' }) => {
  return (
    <div className={`${styles.logo} ${styles[size]}`}>
      <svg viewBox="0 0 28 28" className={styles.icon} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="28" height="28" rx="6" fill="var(--semi-color-primary)" />
        <path
          d="M8 10h4v8H8V10zm6-2h4v12h-4V8zm6 4h4v8h-4v-8z"
          fill="white"
          opacity="0.9"
        />
      </svg>
      <span className={styles.name}>CutPilot</span>
    </div>
  );
};

export default Logo;
