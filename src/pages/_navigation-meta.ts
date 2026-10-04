export const navigationItems = {
  home: { label: 'layout.components.navigation.tabs.home', path: '/' },
  proxies: {
    label: 'layout.components.navigation.tabs.proxies',
    path: '/proxies',
  },
  profiles: {
    label: 'layout.components.navigation.tabs.profiles',
    path: '/profile',
  },
  connections: {
    label: 'layout.components.navigation.tabs.connections',
    path: '/connections',
  },
  processTraffic: {
    label: 'layout.components.navigation.tabs.processTraffic',
    path: '/process-traffic',
  },
  rules: { label: 'layout.components.navigation.tabs.rules', path: '/rules' },
  logs: { label: 'layout.components.navigation.tabs.logs', path: '/logs' },
  unlock: {
    label: 'layout.components.navigation.tabs.unlock',
    path: '/unlock',
  },
  settings: {
    label: 'layout.components.navigation.tabs.settings',
    path: '/settings',
  },
} as const
