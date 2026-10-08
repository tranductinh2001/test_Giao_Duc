'use client';

import { Toaster } from 'react-hot-toast';

export default function ToastProvider() {
  return (
    <Toaster
      position="bottom-center"
      gutter={16}
      containerClassName="!z-[9999]"
      containerStyle={{
        zIndex: 9999,
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
      }}
      toastOptions={{
        duration: 3000,
        style: {
          background: 'var(--color-card)',
          color: 'var(--color-foreground)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '14px 18px',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 8px 16px -4px rgb(0 0 0 / 0.15), 0 4px 6px -2px rgb(0 0 0 / 0.1)',
          marginBottom: '80px', // Space for mobile nav
          position: 'relative',
          zIndex: 9999,
        },
        success: {
          style: {
            background: 'var(--color-success)',
            color: 'var(--color-success-foreground)',
            border: '1px solid var(--color-success)',
          },
          iconTheme: {
            primary: 'var(--color-success-foreground)',
            secondary: 'var(--color-success)',
          },
        },
        error: {
          style: {
            background: 'var(--color-destructive)',
            color: 'var(--color-destructive-foreground)',
            border: '1px solid var(--color-destructive)',
          },
          iconTheme: {
            primary: 'var(--color-destructive-foreground)',
            secondary: 'var(--color-destructive)',
          },
        },
        loading: {
          style: {
            background: 'var(--color-primary)',
            color: 'var(--color-primary-foreground)',
            border: '1px solid var(--color-primary)',
          },
          iconTheme: {
            primary: 'var(--color-primary-foreground)',
            secondary: 'var(--color-primary)',
          },
        },
      }}
    />
  );
}
