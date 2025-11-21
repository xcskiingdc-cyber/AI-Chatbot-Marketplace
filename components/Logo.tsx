
import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  textColor?: string;
  logoUrl?: string | null;
  [key: string]: any;
}

export const Logo: React.FC<LogoProps> = ({ className, showText = true, textColor = "#E0DCD9", logoUrl, ...props }) => {
  if (logoUrl) {
      return (
         <img src={logoUrl} alt="Site Logo" className={className} {...props} />
      );
  }

  return (
    <svg className={className} viewBox={showText ? "0 0 280 80" : "0 0 80 80"} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      {/* Circle Background - Sun/Moon */}
      <circle cx="40" cy="40" r="36" fill="#B08968" />
      
      {/* Castle/Building Silhouette */}
      <path d="M15 76V30H25V50C25 50 32 40 40 45C48 40 55 50 55 50V30H65V76H15Z" fill="#242221" opacity="0.9"/>
      <rect x="28" y="35" width="4" height="8" rx="2" fill="#B08968" opacity="0.5" />
      <rect x="48" y="35" width="4" height="8" rx="2" fill="#B08968" opacity="0.5" />

      {/* Person Silhouette */}
      <g transform="translate(38, 52)">
        {/* Body/Cloak */}
        <path d="M4 24L1 8L3 4L5 4L7 8L5 24H4Z" fill="black" />
        {/* Head */}
        <circle cx="4" cy="3" r="2" fill="black" />
      </g>

      {/* Text */}
      {showText && (
        <text x="88" y="52" fontFamily="'Playfair Display', serif" fontSize="34" fontWeight="bold" fill={textColor} style={{ letterSpacing: '0.02em' }}>
          HereHaven
        </text>
      )}
    </svg>
  );
};

export default Logo;
