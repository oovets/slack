import { SetStateAction } from "react";

import { metricItemsData } from "@/lib/constants";
import { MetricItem } from "@/lib/types";

type MetricsProps = {
  metricItems: MetricItem[];
  setMetricItems: (value: SetStateAction<MetricItem[]>) => void;
};

export function Metrics({ metricItems, setMetricItems }: MetricsProps) {
  return (
    <div className="flex flex-col gap-2">
      {metricItemsData.map((metricItem) => {
        const stateItem = metricItems.find((i) => i.name === metricItem.name);

        return (
          <div
            key={`${metricItem.name}_${metricItem.amount}`}
            className="flex flex-1 justify-between gap-1"
          >
            <label className="flex-1">
              <input
                type="checkbox"
                value={metricItem.name}
                checked={stateItem?.visible}
                onChange={(e) => {
                  const name = e.currentTarget.value;
                  const metricItemsCopy = [...metricItems];

                  const item = metricItems.find(
                    (i) => i.name === metricItem.name,
                  )!;
                  const itemIdx = metricItems.findIndex((i) => i.name === name);

                  metricItemsCopy.splice(itemIdx, 1, {
                    ...item,
                    visible: !item.visible,
                  });

                  setMetricItems(metricItemsCopy);
                }}
              />
              <span>{metricItem.name}</span>
            </label>

            <label className="flex-1">
              <input
                className="border"
                type="number"
                value={stateItem?.amount}
                onChange={(e) => {
                  const value = e.currentTarget.value;
                  const metricItemsCopy = [...metricItems];

                  const itemIdx = metricItems.findIndex(
                    (i) => i.name === metricItem.name,
                  );

                  if (itemIdx !== -1) {
                    metricItemsCopy.splice(itemIdx, 1, {
                      ...metricItemsCopy[itemIdx],
                      amount: Number(value),
                    });
                  }

                  setMetricItems(metricItemsCopy);
                }}
              />
            </label>
          </div>
        );
      })}
    </div>
  );
}
