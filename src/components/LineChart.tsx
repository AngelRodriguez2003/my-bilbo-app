import { useState } from 'react';
import { Text as RNText, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeContext';

export interface ChartPoint {
  x: number; // session index
  y: number; // reps or weight
}

const PADDING = { top: 16, right: 12, bottom: 28, left: 36 };
const HEIGHT = 200;

/** Minimal line chart: grid, line, dots and axis labels. No external chart lib. */
export function LineChart({
  points,
  targetY,
  yLabel,
}: {
  points: ChartPoint[];
  /** Optional horizontal reference line (e.g. 15-rep cycle end). */
  targetY?: number;
  yLabel?: string;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);

  if (points.length === 0) return null;

  const innerW = Math.max(width - PADDING.left - PADDING.right, 1);
  const innerH = HEIGHT - PADDING.top - PADDING.bottom;

  const ys = points.map((p) => p.y);
  const yValues = targetY !== undefined ? [...ys, targetY] : ys;
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const ySpan = maxY - minY || 1;
  const minX = points[0].x;
  const maxX = points[points.length - 1].x;
  const xSpan = maxX - minX || 1;

  const toX = (x: number) => PADDING.left + ((x - minX) / xSpan) * innerW;
  const toY = (y: number) => PADDING.top + (1 - (y - minY) / ySpan) * innerH;

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.x).toFixed(1)} ${toY(p.y).toFixed(1)}`)
    .join(' ');

  // ~4 horizontal grid lines at round values
  const gridLines: number[] = [];
  const stepRaw = ySpan / 4;
  const magnitude = 10 ** Math.floor(Math.log10(stepRaw));
  const step = Math.max(Math.ceil(stepRaw / magnitude) * magnitude, 1);
  for (let v = Math.ceil(minY / step) * step; v <= maxY; v += step) gridLines.push(v);

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {yLabel ? (
        <RNText style={{ color: colors.textMuted, fontSize: 11, marginBottom: 4 }}>{yLabel}</RNText>
      ) : null}
      {width > 0 && (
        <Svg width={width} height={HEIGHT}>
          {gridLines.map((v) => (
            <Line
              key={v}
              x1={PADDING.left}
              x2={width - PADDING.right}
              y1={toY(v)}
              y2={toY(v)}
              stroke={colors.chartGrid}
              strokeWidth={1}
            />
          ))}
          {gridLines.map((v) => (
            <SvgText
              key={`label-${v}`}
              x={PADDING.left - 6}
              y={toY(v) + 4}
              fontSize={10}
              fill={colors.textMuted}
              textAnchor="end">
              {v}
            </SvgText>
          ))}
          {targetY !== undefined && (
            <Line
              x1={PADDING.left}
              x2={width - PADDING.right}
              y1={toY(targetY)}
              y2={toY(targetY)}
              stroke={colors.warning}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          )}
          <Path d={path} stroke={colors.chartLine} strokeWidth={2} fill="none" />
          {points.map((p) => (
            <Circle
              key={p.x}
              cx={toX(p.x)}
              cy={toY(p.y)}
              r={4}
              fill={colors.chartLine}
              stroke={colors.surface}
              strokeWidth={1.5}
            />
          ))}
          {points.map((p) => (
            <SvgText
              key={`x-${p.x}`}
              x={toX(p.x)}
              y={HEIGHT - 8}
              fontSize={10}
              fill={colors.textMuted}
              textAnchor="middle">
              {p.x}
            </SvgText>
          ))}
        </Svg>
      )}
    </View>
  );
}
