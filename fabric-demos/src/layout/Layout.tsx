import {
  Sidebar,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '../components/ui/sidebar';
import { CONFIG, DefaultSelectIndex, getComponentByName } from '../config';
import { Suspense, useState } from 'react';
import style from './Layout.scss.module.scss';
import { Check } from 'lucide-react';

export default function Layout() {
  const [activeKey, setActiveKey] = useState<string>(
    CONFIG[DefaultSelectIndex]?.name,
  );
  const ActiveComponent = activeKey
    ? getComponentByName(activeKey)?.component
    : undefined;

  function handleMenuItemClick(key: string) {
    setActiveKey(key);
  }

  return (
    <div className="flex w-screen h-screen">
      <SidebarProvider className="w-(--sidebar-width) flex-none">
        <Sidebar>
          <SidebarMenu className="p-2">
            {CONFIG.map((config, index) => {
              return (
                <SidebarMenuItem key={index}>
                  <SidebarMenuButton
                    className={[
                      'bg-zinc-100 cursor-pointer hover:bg-neutral-200',
                      'flex gap-2',
                      config.name === activeKey
                        ? 'bg-neutral-200 shadow-inner'
                        : '',
                    ].join(' ')}
                    onClick={() => handleMenuItemClick(config.name!)}
                  >
                    <div className="flex-1 line-clamp-1">{config.name}</div>
                    {config.name === activeKey ? (
                      <Check className="flex-none" />
                    ) : null}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
      <div className="flex-1 overflow-auto">
        {ActiveComponent ? (
          <Suspense
            fallback={
              <div className="size-full">
                <div className={style.loader}></div>
              </div>
            }
          >
            <div className="flex justify-center items-center shadow-sm mb-10 w-full h-15">
              <div className="font-mono font-bold text-gray-500 text-2xl antialiased">
                {activeKey}
              </div>
            </div>
            <div className="p-2">
              <ActiveComponent />
            </div>
          </Suspense>
        ) : (
          <div className="p-4 text-muted-foreground text-sm">
            Select an example from the sidebar to preview it here.
          </div>
        )}
      </div>
    </div>
  );
}
