import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Line,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { FontFamily } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

export interface ChartPoint {
  x: number; // session index
  y: number; // reps or weight
}

const PADDING = { top: 20, right: 14, bottom: 30, left: 38 };
const HEIGHT = 210;
/** Como mucho estas etiquetas en el eje X; con más se pisan unas a otras. */
const MAX_X_LABELS = 6;

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Largo de la polilínea, para animar el trazo con strokeDashoffset. */
function polylineLength(coords: Array<{ x: number; y: number }>): number {
  let total = 0;
  for (let i = 1; i < coords.length; i += 1) {
    total += Math.hypot(coords[i].x - coords[i - 1].x, coords[i].y - coords[i - 1].y);
  }
  return total;
}

/**
 * Gráfica de líneas propia: rejilla, área degradada, línea que se dibuja sola
 * al entrar y último punto destacado. Sin librería de gráficos.
 */
export function LineChart({
  points,
  targetY,
  targetLabel,
}: {
  points: ChartPoint[];
  /** Línea de referencia horizontal (p. ej. las 15 reps de fin de ciclo). */
  targetY?: number;
  targetLabel?: string;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);

  const innerW = Math.max(width - PADDING.left - PADDING.right, 1);
  const innerH = HEIGHT - PADDING.top - PADDING.bottom;

  const geometry = useMemo(() => {
    if (points.length === 0) return null;

    const ys = points.map((p) => p.y);
    const yValues = targetY !== undefined ? [...ys, targetY] : ys;
    const minRaw = Math.min(...yValues);
    const maxRaw = Math.max(...yValues);
    // Un pelín de aire arriba y abajo: la línea no debe tocar los bordes.
    const pad = (maxRaw - minRaw || Math.max(maxRaw * 0.1, 1)) * 0.12;
    const minY = minRaw - pad;
    const maxY = maxRaw + pad;
    const ySpan = maxY - minY || 1;

    const minX = points[0].x;
    const maxX = points[points.length - 1].x;
    const xSpan = maxX - minX || 1;

    const toX = (x: number) =>
      points.length === 1
        ? PADDING.left + innerW / 2
        : PADDING.left + ((x - minX) / xSpan) * innerW;
    const toY = (y: number) => PADDING.top + (1 - (y - minY) / ySpan) * innerH;

    const coords = points.map((p) => ({ x: toX(p.x), y: toY(p.y) }));
    const line = coords
      .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
      .join(' ');
    const baseline = HEIGHT - PADDING.bottom;
    const area =
      coords.length > 1
        ? `${line} L ${coords[coords.length - 1].x.toFixed(1)} ${baseline} L ${coords[0].x.toFixed(1)} ${baseline} Z`
        : '';

    // ~4 líneas de rejilla en valores redondos.
    const grid: number[] = [];
    const stepRaw = ySpan / 4;
    const magnitude = 10 ** Math.floor(Math.log10(Math.max(stepRaw, 1e-6)));
    const step = Math.max(Math.ceil(stepRaw / magnitude) * magnitude, 1);
    for (let v = Math.ceil(minY / step) * step; v <= maxY; v += step) grid.push(v);

    // Diezmado de etiquetas del eje X: siempre la primera y la última.
    const every = Math.max(1, Math.ceil(points.length / MAX_X_LABELS));
    const xLabels = points.filter((_, i) => i % every === 0 || i === points.length - 1);

    return { coords, line, area, grid, toX, toY, xLabels, baseline, length: polylineLength(coords) };
  }, [points, targetY, innerW, innerH]);

  const draw = useSharedValue(0);
  useEffect(() => {
    if (!geometry || width === 0) return;
    draw.set(0);
    draw.set(withDelay(120, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) })));
  }, [geometry, width, draw]);

  const lineProps = useAnimatedProps(() => ({
    strokeDashoffset: (geometry?.length ?? 0) * (1 - draw.get()),
  }));
  // El área sube detrás de la línea, un poco por detrás de ella.
  const areaProps = useAnimatedProps(() => ({ fillOpacity: draw.get() }));

  if (!geometry || points.length === 0) return null;

  const last = geometry.coords[geometry.coords.length - 1];

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={HEIGHT}>
          <Defs>
            <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={colors.chartLine} stopOpacity={0.28} />
              <Stop offset="100%" stopColor={colors.chartLine} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {geometry.grid.map((value) => (
            <Line
              key={`grid-${value}`}
              x1={PADDING.left}
              x2={width - PADDING.right}
              y1={geometry.toY(value)}
              y2={geometry.toY(value)}
              stroke={colors.chartGrid}
              strokeWidth={1}
            />
          ))}
          {geometry.grid.map((value) => (
            <SvgText
              key={`y-${value}`}
              x={PADDING.left - 8}
              y={geometry.toY(value) + 3.5}
              fontSize={10}
              fontFamily={FontFamily.medium}
              fill={colors.textMuted}
              textAnchor="end">
              {value}
            </SvgText>
          ))}

          {geometry.area ? (
            <AnimatedPath d={geometry.area} fill="url(#area)" animatedProps={areaProps} />
          ) : null}

          {targetY !== undefined && (
            <>
              <Line
                x1={PADDING.left}
                x2={width - PADDING.right}
                y1={geometry.toY(targetY)}
                y2={geometry.toY(targetY)}
                stroke={colors.warning}
                strokeWidth={1.5}
                strokeDasharray="5 5"
                opacity={0.8}
              />
              {targetLabel ? (
                <SvgText
                  x={width - PADDING.right}
                  y={geometry.toY(targetY) - 7}
                  fontSize={10}
                  fontFamily={FontFamily.semibold}
                  fill={colors.warning}
                  textAnchor="end">
                  {targetLabel}
                </SvgText>
              ) : null}
            </>
          )}

          {geometry.coords.length > 1 && (
            <AnimatedPath
              d={geometry.line}
              stroke={colors.chartLine}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              strokeDasharray={geometry.length}
              animatedProps={lineProps}
            />
          )}

          {geometry.coords.map((coord, i) => (
            <Circle
              key={`dot-${points[i].x}`}
              cx={coord.x}
              cy={coord.y}
              r={3}
              fill={colors.surface}
              stroke={colors.chartLine}
              strokeWidth={2}
            />
          ))}

          {/* El último punto es el que importa: dónde estás ahora mismo. */}
          <Circle cx={last.x} cy={last.y} r={9} fill={colors.chartLine} opacity={0.18} />
          <Circle
            cx={last.x}
            cy={last.y}
            r={4.5}
            fill={colors.chartLine}
            stroke={colors.surface}
            strokeWidth={2}
          />

          {geometry.xLabels.map((point) => (
            <SvgText
              key={`x-${point.x}`}
              x={geometry.toX(point.x)}
              y={HEIGHT - 9}
              fontSize={10}
              fontFamily={FontFamily.medium}
              fill={colors.textMuted}
              textAnchor="middle">
              {point.x}
            </SvgText>
          ))}
        </Svg>
      )}
    </View>
  );
}
