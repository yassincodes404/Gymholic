import React from 'react';
import { Link } from 'react-router-dom';
import gymholicWhiteLogo from '../../assets/gymholic white logo.png';

interface BrandLogoProps {
  to?: string;
  title?: string;
  subtitle?: string;
  className?: string;
  logoClassName?: string;
  badgeClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  to = '/',
  title = 'Gymholic',
  subtitle,
  className = '',
  logoClassName = 'h-9 w-auto object-contain sm:h-10',
  badgeClassName = 'rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-primary px-4 py-3 shadow-[0_10px_28px_-16px_rgba(15,23,42,0.7)] ring-1 ring-slate-200/10',
  titleClassName = 'text-base font-semibold leading-tight text-foreground sm:text-lg',
  subtitleClassName = 'text-xs text-muted-foreground sm:text-sm',
}) => {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-3.5 rounded-xl text-left transition-opacity hover:opacity-90 ${className}`.trim()}
      aria-label={title}
    >
      <span className={`inline-flex items-center justify-center ${badgeClassName}`.trim()}>
        <img
          src={gymholicWhiteLogo}
          alt={title}
          className={logoClassName}
          loading="eager"
        />
      </span>
      <span className="min-w-0">
        <span className={`block ${titleClassName}`.trim()}>
          {title}
        </span>
        {subtitle ? (
          <span className={`block ${subtitleClassName}`.trim()}>
            {subtitle}
          </span>
        ) : null}
      </span>
    </Link>
  );
};
