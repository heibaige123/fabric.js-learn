import { lazy } from 'react';

export const CONFIG = [
  {
    name: '十字动画',
    component: lazy(() => import('./pages/demo-01')),
  },
  {
    selected: true,
    name: '十字动画-2',
    component: lazy(() => import('./pages/demo-02')),
  },
];

export const DefaultSelectIndex = CONFIG.findIndex((item) => item.selected);

export function getComponentByName(name: string) {
  return CONFIG.find((item) => item.name === name);
}
