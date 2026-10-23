import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'default' | 'outline' | 'ghost' | 'secondary';
type Size = 'default' | 'sm';

const variants: Record<Variant, string> = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  outline: 'border border-input bg-background hover:bg-secondary',
  ghost: 'hover:bg-secondary',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
};

const sizes: Record<Size, string> = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 px-3',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', ...props }, ref) => (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
