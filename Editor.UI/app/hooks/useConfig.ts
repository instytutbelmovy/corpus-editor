import { useEffect, useState } from 'react';
import { configService, FrontendConfig } from '@/app/services/configService';

// Канфіг з сэрвэра. Пакуль не прыйшоў - null: кампанэнты малююць бяз тых частак, што ад яго залежаць
export const useConfig = (): FrontendConfig | null => {
  const [config, setConfig] = useState<FrontendConfig | null>(null);

  useEffect(() => {
    let alive = true;
    configService.getConfig().then(loaded => {
      if (alive) setConfig(loaded);
    });
    return () => {
      alive = false;
    };
  }, []);

  return config;
};
