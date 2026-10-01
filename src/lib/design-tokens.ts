/**
 * Design Token System
 * High-end SaaS aesthetic inspired by Vercel, Linear, Stripe
 *
 * PRINCIPLES:
 * 1. Asymmetry over symmetry
 * 2. Restraint over decoration
 * 3. Hierarchy through scale, not color
 * 4. Purposeful white space
 */

export const designTokens = {
  // SPACING SYSTEM - Purposeful, not mechanical
  spacing: {
    // Micro spacing
    xs: '0.5rem',    // 8px
    sm: '0.75rem',   // 12px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px

    // Section spacing - varied for rhythm
    section: {
      compact: '4rem',      // 64px - dense content
      comfortable: '6rem',  // 96px - standard
      spacious: '8rem',     // 128px - breathing room
      dramatic: '12rem',    // 192px - hero sections
    },

    // Card spacing
    card: {
      tight: '1.5rem',      // 24px
      comfortable: '2rem',  // 32px
      generous: '3rem',     // 48px
    },
  },

  // TYPOGRAPHY SCALE - High contrast
  typography: {
    // Display (hero sections)
    display: {
      xl: {
        size: 'clamp(3.5rem, 8vw, 6rem)',  // 56-96px
        weight: '700',
        lineHeight: '1.1',
        letterSpacing: '-0.03em',
      },
      lg: {
        size: 'clamp(2.5rem, 6vw, 4.5rem)',  // 40-72px
        weight: '700',
        lineHeight: '1.15',
        letterSpacing: '-0.025em',
      },
      md: {
        size: 'clamp(2rem, 5vw, 3.5rem)',    // 32-56px
        weight: '700',
        lineHeight: '1.2',
        letterSpacing: '-0.02em',
      },
    },

    // Headings
    heading: {
      xl: { size: '2.25rem', weight: '700', lineHeight: '1.25' },  // 36px
      lg: { size: '1.875rem', weight: '600', lineHeight: '1.3' },  // 30px
      md: { size: '1.5rem', weight: '600', lineHeight: '1.35' },   // 24px
      sm: { size: '1.25rem', weight: '600', lineHeight: '1.4' },   // 20px
    },

    // Body text
    body: {
      xl: { size: '1.25rem', weight: '400', lineHeight: '1.7' },   // 20px
      lg: { size: '1.125rem', weight: '400', lineHeight: '1.7' },  // 18px
      md: { size: '1rem', weight: '400', lineHeight: '1.65' },     // 16px
      sm: { size: '0.875rem', weight: '500', lineHeight: '1.6' },  // 14px
    },
  },

  // COLOR SYSTEM - Muted, sophisticated
  colors: {
    // Base neutrals
    neutral: {
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#E5E5E5',
      300: '#D4D4D4',
      400: '#A3A3A3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
      950: '#0A0A0A',
    },

    // Primary - muted slate blue (not vibrant)
    primary: {
      50: '#F0F4F8',
      100: '#D9E2EC',
      200: '#BCCCDC',
      300: '#9FB3C8',
      400: '#829AB1',
      500: '#627D98',    // Main primary
      600: '#486581',
      700: '#334E68',
      800: '#243B53',
      900: '#102A43',
    },

    // Accent - use sparingly
    accent: {
      blue: '#3B82F6',
      green: '#10B981',
      red: '#EF4444',
      amber: '#F59E0B',
    },
  },

  // ELEVATION SYSTEM - Subtle shadows, not dramatic
  elevation: {
    flat: 'none',
    subtle: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    elevated: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    floating: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lifted: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  },

  // BORDER RADIUS - Consistent but varied
  radius: {
    sm: '0.375rem',   // 6px
    md: '0.5rem',     // 8px
    lg: '0.75rem',    // 12px
    xl: '1rem',       // 16px
    '2xl': '1.5rem',  // 24px
    full: '9999px',
  },

  // ANIMATION TIMING - Purposeful speeds
  animation: {
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
    slower: '500ms',

    // Easing functions
    easing: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
  },
} as const;

// LAYOUT PATTERNS - Asymmetric compositions
export const layoutPatterns = {
  // Hero layouts
  hero: {
    centered: 'text-center mx-auto max-w-4xl',
    offset: 'grid lg:grid-cols-[1.2fr_1fr] gap-16 items-center',
    stacked: 'flex flex-col gap-12',
  },

  // Grid variations - NOT all symmetric
  grid: {
    // Asymmetric grids
    featured: 'grid md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr] gap-6',
    masonry: 'grid md:grid-cols-2 lg:grid-cols-3 gap-6 [&>*:first-child]:lg:row-span-2',
    sidebar: 'grid lg:grid-cols-[2fr_1fr] gap-8',

    // Symmetric (use sparingly)
    equal2: 'grid md:grid-cols-2 gap-6',
    equal3: 'grid md:grid-cols-2 lg:grid-cols-3 gap-6',
    equal4: 'grid md:grid-cols-2 lg:grid-cols-4 gap-6',
  },

  // Content widths
  width: {
    narrow: 'max-w-2xl',    // 672px
    comfortable: 'max-w-4xl', // 896px
    wide: 'max-w-6xl',       // 1152px
    full: 'max-w-7xl',       // 1280px
  },
};

// COMPONENT VARIANTS - Semantic, not decorative
export const componentVariants = {
  button: {
    primary: 'bg-primary text-primary-foreground hover:brightness-110',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost: 'text-foreground hover:bg-accent',
    link: 'text-primary hover:text-primary/80 underline-offset-4 hover:underline',
  },

  card: {
    flat: 'bg-card border border-border',
    elevated: 'bg-card border border-border shadow-elevated',
    interactive: 'bg-card border border-border hover:border-primary/50 hover:shadow-floating transition-all',
    ghost: 'bg-muted border-none',
  },

  badge: {
    neutral: 'bg-muted text-foreground border border-border',
    primary: 'bg-primary/10 text-primary border border-primary/20',
    success: 'bg-success/10 text-success border border-success/20',
    warning: 'bg-warning/10 text-warning border border-warning/20',
  },
};

export default designTokens;
