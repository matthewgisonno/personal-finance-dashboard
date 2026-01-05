import { cn } from '@/lib/utils';

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const PageContainer = ({ children, className, ...props }: PageContainerProps) => {
  return (
    <div className={cn('px-4 md:px-8 pb-8 space-y-6', className)} {...props}>
      {children}
    </div>
  );
};
