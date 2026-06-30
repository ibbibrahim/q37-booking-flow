import { useState, useEffect } from 'react';
import { PX_PER_MIN } from '../types/epg.types';

function getNowMinute(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function useNowLine() {
  const [nowMinute, setNowMinute] = useState(getNowMinute);

  useEffect(() => {
    const tick = () => setNowMinute(getNowMinute());
    // Align to the next full minute
    const msToNextMinute = 60_000 - (Date.now() % 60_000);
    const timeout = setTimeout(() => {
      tick();
      const interval = setInterval(tick, 60_000);
      return () => clearInterval(interval);
    }, msToNextMinute);
    return () => clearTimeout(timeout);
  }, []);

  const nowPx = nowMinute * PX_PER_MIN;

  const formatNowTime = (): string => {
    const h = Math.floor(nowMinute / 60).toString().padStart(2, '0');
    const m = (nowMinute % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  return { nowMinute, nowPx, formatNowTime };
}
