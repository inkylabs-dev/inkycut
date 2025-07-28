import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightBlog from 'starlight-blog';

import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  site: 'https://inkycut.com',
  trailingSlash: 'always',
  integrations: [
    starlight({
      title: 'InkyCut',
      favicon: '/favicon.ico',
      customCss: ['./src/styles/tailwind.css'],
      description: 'InkyCut Documentation',
      logo: {
        src: '/src/assets/logo.png',
        alt: 'InkyCut',
      },
      head: [
        // Add your script tags here. Below is an example for Google analytics, etc.
        {
          tag: 'script',
          attrs: {
            src: 'https://www.googletagmanager.com/gtag/js?id=G-WC0VHS6FPY',
          },
        },
        {
          tag: 'script',
          content: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
        
          gtag('config', 'G-WC0VHS6FPY');
          `,
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/inkylabs-dev/inkycut/blob/main/blog',
      },
      components: {
        SiteTitle: './src/components/MyHeader.astro',
        ThemeSelect: './src/components/MyThemeSelect.astro',
        Head: './src/components/HeadWithOGImage.astro',
        PageTitle: './src/components/TitleWithBannerImage.astro',
      },
      social: {
        github: 'https://github.com/inkylabs-dev/inkycut',
        twitter: 'https://twitter.com/inkycut',
        discord: 'https://discord.gg/S2BQU89W',
      },
      sidebar: [
        {
          label: 'Start Here',
          items: [
            {
              label: 'Introduction',
              link: '/',
            },
          ],
        },
        {
          label: 'Guides',
          items: [
            {
              label: 'Example Guide',
              link: '/guides/example/',
            },
          ],
        },
        {
          label: 'API',
          items: [
            {
              label: 'API Specification',
              link: '/api/spec/',
            },
          ],
        },
        {
          label: 'General',
          items: [
            {
              label: 'IndexedDB File Storage',
              link: '/general/indexeddb-file-storage-implementation/',
            },
            {
              label: 'Slash Commands',
              link: '/general/slash-commands/',
            },
          ],
        },
        {
          label: 'Contributing',
          items: [
            {
              label: 'Contribution Guide',
              link: '/contribution/',
            },
          ],
        },
      ],
      plugins: [
        starlightBlog({
          title: 'Blog',
          customCss: ['./src/styles/tailwind.css'],
          authors: {
            Dev: {
              name: 'Dev',
              title: 'Dev @ InkyCut',
              picture: '/CRAIG_ROCK.png', // Images in the `public` directory are supported.
              url: 'https://inkycut.com',
            },
          },
        }),
      ],
    }),
    tailwind({ applyBaseStyles: false }),
  ],
});
