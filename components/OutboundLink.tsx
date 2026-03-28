'use client';

import { trackClientActivity } from '@/lib/activity-client';

interface OutboundLinkProps {
  href: string;
  label: string;
  type?: 'social' | 'partner' | 'resource' | 'affiliate';
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}

export default function OutboundLink({ href, label, type = 'resource', children, className, ...props }: OutboundLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => trackClientActivity('outbound_click', { destination: href, label, type })}
      {...props}
    >
      {children}
    </a>
  );
}
