import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ConfidenceBadgeProps {
  confidence: number;
  className?: string;
}

export function ConfidenceBadge({ confidence, className }: ConfidenceBadgeProps) {
  const color =
    confidence >= 85
      ? 'bg-green-100 text-green-800 hover:bg-green-100'
      : confidence >= 60
      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
      : 'bg-red-100 text-red-800 hover:bg-red-100';

  return (
    <Badge className={cn(color, className)}>
      {confidence.toFixed(0)}%
    </Badge>
  );
}
