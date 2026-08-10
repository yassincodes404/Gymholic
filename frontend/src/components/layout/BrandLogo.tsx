import React from 'react';
import { Link } from 'react-router-dom';
import gymholicWhiteLogo from '../../assets/gymholic white logo.png';

interface BrandLogoProps {
  to?: string;
  title?: string;
  subtitle?: string;
  className?: string;
  logoClassName?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  to = '/',
  title = 'Gymholic',
  subtitle,
  className = '',
  logoClassName = 'h-8 w-auto sm:h-9',
}) => {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-3 rounded-xl text-left transition-opacity hover:opacity-90 ${className}`.trim()}
      aria-label={title}
    >
      <span className="inline-flex items-center justify-center rounded-xl bg-primary px-3 py-2 shadow-sm">
        <img
          src={gymholicWhiteLogo}
          alt={title}
          className={logoClassName}
          loading="eager"
        />
      </span>
      <span className="min-w-0">
        <span className="block text-base font-semibold leading-tight text-foreground sm:text-lg">
          {title}
        </span>
        {subtitle ? (
          <span className="block text-xs text-muted-foreground sm:text-sm">
            {subtitle}
          </span>
        ) : null}
      </span>
    </Link>
  );
};
