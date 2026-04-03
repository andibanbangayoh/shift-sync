import { Badge } from '../components/ui/badge';
import { getSkillById, type Skill } from '../data/mockData';

type SkillBadgeProps = {
  skillId: string;
  variant?: 'default' | 'outline';
};

export function SkillBadge({ skillId, variant = 'default' }: SkillBadgeProps) {
  const skill = getSkillById(skillId);
  
  if (!skill) return null;

  return (
    <Badge
      variant={variant}
      className="text-white border-0"
      style={{ backgroundColor: skill.color }}
    >
      {skill.name}
    </Badge>
  );
}
