// Edit this file to configure your quire.wiki profile.
// This appears in the sidebar and is the "identity" of your garden.

export const profile = {
  name: 'your name',
  handle: 'yourhandle',
  initials: 'YN',
  avatarUrl: '',         // set to an image URL, or leave blank to use initials
  bio: 'networked thinker',
  links: [
    { label: 'github',   url: 'https://github.com/yourusername',   icon: 'github'   },
    { label: 'twitter',  url: 'https://twitter.com/yourhandle',    icon: 'twitter'  },
    { label: 'website',  url: 'https://yourwebsite.com',           icon: 'globe'    },
    { label: 'email',    url: 'mailto:you@email.com',              icon: 'mail'     },
  ] as { label: string; url: string; icon: 'github' | 'twitter' | 'globe' | 'mail' | 'linkedin' }[]
}
