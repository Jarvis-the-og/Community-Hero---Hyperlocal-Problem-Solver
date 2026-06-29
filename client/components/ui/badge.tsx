import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'critical' | 'medium' | 'low' | 'success' | 'info';
}

const variants = {
  default: 'bg-white/10 text-foreground border-white/10',
  critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  medium: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  low: 'bg-green-500/10 text-green-400 border-green-500/20',
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
