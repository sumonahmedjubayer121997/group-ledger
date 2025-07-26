// components/CurrencyLoader.tsx

import { useEffect } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';

interface CurrencyLoaderProps {
  group: { id: string } | null;
}

const CurrencyLoader = ({ group }: CurrencyLoaderProps) => {
  const loadCurrencyFromGroupId = useSettingsStore((state) => state.loadCurrencyFromGroupId);

  useEffect(() => {
    if (group?.id) {
      loadCurrencyFromGroupId(group.id);
    }
  }, [group?.id]);

  return null;
};

export default CurrencyLoader;
