import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  value: number | string;
  label: string;
  iconClass?: string;
}

const StatCard = ({ icon: Icon, value, label, iconClass = "text-primary" }: StatCardProps) => {
  return (
    <div className="stat-card group">
      <Icon className={`w-5 h-5 md:w-6 md:h-6 mx-auto mb-2 ${iconClass} transition-transform group-hover:scale-110`} />
      <p className="text-xl md:text-2xl font-bold text-foreground mb-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
};

export default StatCard;
