"use client"

import { useState, useEffect } from "react"
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts"
import { HalfPieInnerData } from "./half-pie-inner-data"
import { ContactsByGender } from "@/lib/types"

type HalfPieChartProps = {
  values: ContactsByGender
  layout?: "portrait" | "landscape"
}

export function HalfPieChart({ values, layout = "portrait" }: HalfPieChartProps) {
  const [delayPassed, setDelayPassed] = useState(false)
  const leftSubtitle = values.left.title;
  const rightSubtitle = values.right.title;
  const gap = 3;

  const sum = values.left.number + values.right.number;
  const targetLeftValue = sum > 0 ? Math.round((values.left.number / sum) * 100) : 0;
  const targetRightValue = sum > 0 ? 100 - targetLeftValue : 0;

  // When both counts are 0: show 0/0 in numbers, but 50/50 visually
  const chartLeftValue = sum > 0 ? targetLeftValue : 50;
  const chartRightValue = sum > 0 ? targetRightValue : 50;
  const displayLeftValue = targetLeftValue;
  const displayRightValue = targetRightValue;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDelayPassed(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const leftValue = delayPassed ? chartLeftValue : 0;
  const rightValue = delayPassed ? chartRightValue : 0;

  const data = [
    { value: leftValue, fill: "#6BABA4" },
    { value: rightValue, fill: "#DF754F" },
  ];

  if (layout === "portrait") {
    return (
      <div className="relative top-[-25px] h-[300px] w-full">
        <div className="pointer-events-none relative">
          <ResponsiveContainer className="absolute left-0 top-0" height={600}>
            <PieChart>
              <Pie
                dataKey="value"
                startAngle={180}
                endAngle={0}
                data={data}
                cx={600}
                cy="51%"
                outerRadius={300}
                innerRadius={260}
                paddingAngle={gap}
              >
                {data.map((datum, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={datum.fill}
                    fillOpacity="10%"
                    stroke="clear"
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <ResponsiveContainer className="absolute left-0 top-0" height={600}>
            <PieChart>
              <Pie
                dataKey="value"
                startAngle={180}
                endAngle={0}
                data={data}
                cx={600}
                cy="51%"
                outerRadius={300}
                innerRadius={296}
                paddingAngle={gap}
              >
                {data.map((datum, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    stroke={datum.fill}
                    fill={datum.fill}
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <HalfPieInnerData
          leftValue={displayLeftValue}
          rightValue={displayRightValue}
          rightSubtitle={rightSubtitle}
          leftSubtitle={leftSubtitle}
          layout="portrait"
        />
      </div>
    );
  }

  return (
    // w-full h-[300] top-[-25]
    <div className="relative">
      <div className="relative pointer-events-none ">
      
        <ResponsiveContainer className="absolute top-0 bottom-0 " height={670}>
          <PieChart>
            <Pie
              dataKey="value"
              startAngle={180}
              endAngle={0}
              data={data}
              cx={380}
              cy={'85%'}
              outerRadius={300}
              innerRadius={260}
              paddingAngle={gap}
            >
              {data.map((datum, idx) => (
                <Cell
                  key={`cell-${idx}`}
                  fill={'#F5F2ED'}
                  fillOpacity={"100%"}
                  stroke='clear'
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <ResponsiveContainer className="absolute top-0 left-0" height={670}>
          <PieChart>
            <Pie
              dataKey="value"
              startAngle={180}
              endAngle={0}
              data={data}
              cx={380}
              cy={'85%'}
              outerRadius={300}
              innerRadius={296}
              paddingAngle={gap}
            >
              {data.map((datum, idx) => (
                <Cell
                  key={`cell-${idx}`}
                  stroke={'#000'}
                  fill={'#000'}
                  strokeLinejoin="round"
                  strokeWidth={0}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <HalfPieInnerData
        leftValue={displayLeftValue}
        rightValue={displayRightValue}
        rightSubtitle={rightSubtitle}
        leftSubtitle={leftSubtitle}
        layout="landscape"
      />
    </div>
  );
}
