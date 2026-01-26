import React from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './index.module.css';

const features = [
  {
    title: 'Always On Top',
    icon: '📌',
    description: 'Stays above all windows. Toggle instantly with Cmd+Shift+D. Your annotations are always one shortcut away.',
  },
  {
    title: 'Drawing Tools',
    icon: '🖊️',
    description: 'Freehand drawing, shapes (rectangle, circle, triangle, line, arrow), configurable colors and pen sizes.',
  },
  {
    title: 'Text & Notes',
    icon: '📝',
    description: 'Multi-note system with text overlays. Paste from clipboard, organize across multiple canvases.',
  },
  {
    title: 'Gestures',
    icon: '🤏',
    description: 'Pinch-to-zoom, two-finger pan, and rotate on trackpad. Natural and fluid canvas navigation.',
  },
  {
    title: 'Shape Manipulation',
    icon: '🔲',
    description: 'Select, resize, rotate, and move shapes interactively. Precise control with drag handles.',
  },
  {
    title: 'Export & Share',
    icon: '📤',
    description: 'Export to PNG, drag-and-drop file support, and persistent local storage for all your notes.',
  },
];

function HeroSection() {
  return (
    <header className={styles.hero}>
      <div className={styles.heroInner}>
        <h1 className={styles.heroTitle}>Floatnote</h1>
        <p className={styles.heroSubtitle}>
          A transparent always-on-top drawing and note-taking overlay for macOS
        </p>
        <p className={styles.heroDescription}>
          Draw, annotate, and take notes on a floating canvas that stays above all your windows.
          Always one keyboard shortcut away.
        </p>
        <div className={styles.heroButtons}>
          <Link className={clsx('button button--lg', styles.heroButtonPrimary)} to="/download">
            Download
          </Link>
          <Link className={clsx('button button--lg', styles.heroButtonSecondary)} to="/docs/getting-started">
            Documentation
          </Link>
        </div>
      </div>
    </header>
  );
}

function FeatureCard({title, icon, description}: {title: string; icon: string; description: string}) {
  return (
    <div className={styles.featureCard}>
      <div className={styles.featureIcon}>{icon}</div>
      <h3 className={styles.featureTitle}>{title}</h3>
      <p className={styles.featureDescription}>{description}</p>
    </div>
  );
}

function FeaturesSection() {
  return (
    <section className={styles.features}>
      <div className={styles.featuresInner}>
        <h2 className={styles.featuresHeading}>Everything you need to annotate your screen</h2>
        <div className={styles.featuresGrid}>
          {features.map((feature, idx) => (
            <FeatureCard key={idx} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home(): JSX.Element {
  return (
    <Layout title="Home" description="A transparent always-on-top drawing and note-taking overlay for macOS">
      <HeroSection />
      <FeaturesSection />
    </Layout>
  );
}
