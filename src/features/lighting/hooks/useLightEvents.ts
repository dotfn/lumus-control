import { useEffect } from 'react';
import { useDeviceStore } from '../../devices/store/deviceStore';
import { useLightingStore } from '../store/lightingStore';

export const useLightEvents = () => {
  const selectedMac = useDeviceStore((state) => state.selectedMac);
  const refreshState = useLightingStore((state) => state.refreshState);

  useEffect(() => {
    if (!selectedMac) return;
    // Resolve IP at call time — avoids re-running on every macToIp update
    const ip = useDeviceStore.getState().macToIp[selectedMac];
    if (!ip) return;
    refreshState(ip);
  }, [selectedMac, refreshState]);
};
