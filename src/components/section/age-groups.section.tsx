import { AgeGroupItem } from "@/lib/types";
import { PercentageGroup } from "../ui/percentage-group";

type AgeGroupsSectionProps = {
  ageGroups: AgeGroupItem[];
};

export function AgeGroupsSection({ ageGroups }: AgeGroupsSectionProps) {
  return (
    <div className="flex flex-col gap-5">
      {ageGroups.map((ageGroup, idx) => (
        <PercentageGroup
          key={idx}
          index={idx}
          visible={ageGroup.visible}
          title={ageGroup.name}
          groupAmount={ageGroup.amount}
        />
      ))}
    </div>
  );
}
