import React from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import styles from './download.module.css';

export default function Download(): JSX.Element {
  return (
    <Layout title="Download" description="Download Floatnote for macOS">
      <main className={styles.downloadPage}>
        <div className={styles.container}>
          <h1 className={styles.title}>Download Floatnote</h1>
          <p className={styles.subtitle}>
            Get the latest version of Floatnote for macOS
          </p>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>macOS</h2>
            <div className={styles.downloadGrid}>
              <a
                href="https://github.com/josmanvis/floatnote/releases/latest"
                className={styles.downloadCard}
              >
                <div className={styles.downloadIcon}>&#63743;</div>
                <div className={styles.downloadInfo}>
                  <h3>Apple Silicon</h3>
                  <p>For Mac with M1, M2, M3, or M4 chip</p>
                  <span className={styles.downloadBadge}>arm64 DMG</span>
                </div>
              </a>
              <a
                href="https://github.com/josmanvis/floatnote/releases/latest"
                className={styles.downloadCard}
              >
                <div className={styles.downloadIcon}>&#63743;</div>
                <div className={styles.downloadInfo}>
                  <h3>Intel</h3>
                  <p>For Mac with Intel processor</p>
                  <span className={styles.downloadBadge}>x64 DMG</span>
                </div>
              </a>
            </div>
            <p className={styles.releaseNote}>
              Or download the latest from{' '}
              <a href="https://github.com/josmanvis/floatnote/releases/latest">
                GitHub Releases
              </a>
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Installation Instructions</h2>
            <p className={styles.instructions}>
              After downloading and opening the DMG, drag the Floatnote app to your Applications folder.
            </p>
            <p className={styles.instructions}>
              If you see a message that the app is damaged or can't be opened, run the following command in your terminal:
            </p>
            <div className={styles.codeBlock}>
              <code>xattr -cr /Applications/Floatnote.app</code>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Install via npm</h2>
            <div className={styles.codeBlock}>
              <code>npm install -g floatnote && floatnote</code>
            </div>
            <p className={styles.npmNote}>
              The npm package provides a CLI that downloads and installs the latest release
              automatically. No need to manually download DMG files.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>System Requirements</h2>
            <ul className={styles.requirements}>
              <li>macOS 10.15 (Catalina) or later</li>
              <li>Node.js 16+ (for npm install method only)</li>
              <li>Approximately 150 MB disk space</li>
            </ul>
          </section>
        </div>
      </main>
    </Layout>
  );
}
