import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface SectionCardProps {
  icon: LucideIcon;
  iconColor: string;
  title: string;
  subtitle: string;
  badge?: string;
  onExpand?: () => void;
  expanded?: boolean;
  expandLabel?: string;
  children: ReactNode;
}

const SectionCard = ({
  icon: Icon,
  iconColor,
  title,
  subtitle,
  badge,
  onExpand,
  expanded,
  expandLabel,
  children,
}: SectionCardProps) => {
  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-4">
        <div className={`section-icon ${iconColor}`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
        <div className="flex-grow">
          <div className="flex items-center gap-3">
            <h3 className="text-xl md:text-2xl font-semibold text-foreground">
              {title}
            </h3>
            {badge && (
              <span className="badge badge-primary">
                {badge}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {onExpand && expandLabel && (
          <button
            onClick={onExpand}
            className="btn-secondary text-xs md:text-sm py-2 px-4"
          >
            {expanded ? 'Recolher' : expandLabel}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
        {children}
      </div>
    </div>
  );
};

export default SectionCard;
