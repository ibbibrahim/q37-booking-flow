import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import qbcDark from '@/assets/QBC-dark.png';
import qbcLight from '@/assets/QBC-light.png';
import qbcDarkAr from '@/assets/QBC-dark-ar.png';
import qbcLightAr from '@/assets/QBC-light-ar.png';
import channelLogo from '@/assets/android-chrome-512x512.png';

interface EPGChannelBrandProps {
  variant?: 'header' | 'rail';
}

export const EPGChannelBrand: React.FC<EPGChannelBrandProps> = ({ variant = 'header' }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const logoEn = isDark ? qbcDark : qbcLight;
  const logoAr = isDark ? qbcDarkAr : qbcLightAr;

  if (variant === 'rail') {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 w-full px-1">
        <div className="h-14 w-14 flex items-center justify-center shrink-0">
          <img
            src={channelLogo}
            alt="QBC Channel 1"
            className="h-full w-full object-contain"
          />
        </div>
        <div className="text-center w-full leading-tight">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">EPG</p>
          <p className="text-[10px] font-semibold text-card-foreground">QBC</p>
          <p className="text-[9px] text-muted-foreground">Ch. 1</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-1.5">
      <div className="flex items-center gap-3">
        <div className="h-12 sm:h-14 w-[110px] sm:w-[130px] flex items-center justify-center">
          <img src={logoEn} alt="QBC" className="max-h-full max-w-full object-contain" />
        </div>
        <div className="w-px h-10 bg-border" />
        <div className="h-12 sm:h-14 w-[105px] sm:w-[125px] flex items-center justify-center">
          <img src={logoAr} alt="كيو بي سي" className="max-h-full max-w-full object-contain" />
        </div>
      </div>
      <div className="flex items-center gap-2 text-center">
        <span className="text-xs font-bold uppercase tracking-wider text-primary">EPG</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-xs font-semibold text-card-foreground">QBC</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-xs text-muted-foreground">Channel 1</span>
      </div>
    </div>
  );
};
