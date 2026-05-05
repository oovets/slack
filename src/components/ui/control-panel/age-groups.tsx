import { SetStateAction } from "react";

import { ageGroupsData } from "@/lib/constants";
import { AgeGroupItem } from "@/lib/types";

type AgeGroupsProps = {
  ageGroups: AgeGroupItem[];
  setAgeGroups: (value: SetStateAction<AgeGroupItem[]>) => void;
};

export function AgeGroups({ ageGroups, setAgeGroups }: AgeGroupsProps) {
  return (
    <div className="flex flex-col gap-2">
      {ageGroupsData.map((ageGroup) => {
        const stateItem = ageGroups.find((i) => i.name === ageGroup.name)!;

        return (
          <div
            key={`${ageGroup.name}_${ageGroup.amount}`}
            className="flex flex-1 justify-between gap-1"
          >
            <label className="flex-1">
              <input
                type="checkbox"
                value={stateItem.name}
                checked={stateItem?.visible}
                onChange={(e) => {
                  const name = e.currentTarget.value;
                  const ageGroupsCopy = [...ageGroups];

                  const itemIdx = ageGroups.findIndex((i) => i.name === name);

                  ageGroupsCopy.splice(itemIdx, 1, {
                    ...stateItem,
                    visible: !stateItem.visible,
                  });

                  setAgeGroups(ageGroupsCopy);
                }}
              />
              <span>{ageGroup.name}</span>
            </label>

            <label className="flex-1">
              <input
                className="border"
                value={
                  ageGroups.find((item) => item.name === ageGroup.name)!.amount
                }
                onChange={(e) => {
                  const value = e.currentTarget.value;
                  const ageGroupsCopy = [...ageGroups];

                  const itemIdx = ageGroups.findIndex(
                    (i) => i.name === ageGroup.name,
                  );

                  if (itemIdx !== -1) {
                    ageGroupsCopy.splice(itemIdx, 1, {
                      ...ageGroupsCopy[itemIdx],
                      amount: Number(value),
                    });
                  }

                  setAgeGroups(ageGroupsCopy);
                }}
              />
            </label>
          </div>
        );
      })}
    </div>
  );
}
