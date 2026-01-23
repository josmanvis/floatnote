import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Floatnote',
  tagline: 'A transparent always-on-top drawing and note-taking overlay for macOS',
  favicon: 'img/favicon.ico',

  url: 'https://josmanvis.github.io',
  baseUrl: '/floatnote/',

  organizationName: 'josmanvis',
  projectName: 'floatnote',
  trailingSlash: true,

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Floatnote',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/download',
          label: 'Download',
          position: 'left',
        },
        {
          to: '/docs/faq',
          label: 'FAQ',
          position: 'left',
        },
        {
          href: 'https://github.com/josmanvis/floatnote',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/getting-started',
            },
            {
              label: 'Features',
              to: '/docs/features',
            },
            {
              label: 'Shortcuts',
              to: '/docs/shortcuts',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/josmanvis/floatnote',
            },
            {
              label: 'Issues',
              href: 'https://github.com/josmanvis/floatnote/issues',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Download',
              to: '/download',
            },
            {
              label: 'Releases',
              href: 'https://github.com/josmanvis/floatnote/releases',
            },
          ],
        },
      ],
      copyright: `Copyright ${new Date().getFullYear()} Floatnote. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
