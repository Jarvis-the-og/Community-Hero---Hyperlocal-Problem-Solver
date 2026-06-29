import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'flex h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm',
        'placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'flex min-h-[100px] w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm',
        'placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50',
        'disabled:cursor-not-allowed disabled:opacity-50 resize-none',
        className
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn('text-sm font-medium text-foreground/80', className)} {...props} />
  );
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'flex h-10 w-full rounded-lg border border-white/10 bg-secondary px-3 py-2 text-sm text-foreground',
        'focus:outline-none focus:ring-2 focus:ring-primary/50',
        '[&>option]:bg-[#1e1e2e] [&>option]:text-foreground',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
