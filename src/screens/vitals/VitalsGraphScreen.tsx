import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { Screen, AppHeader, Card, EmptyState } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import type { RootScreenProps } from '../../navigation/types';

const CHART_HEIGHT = 260;
const PAD_LEFT = 48;
const PAD_RIGHT = 16;
const PAD_TOP = 20;
const PAD_BOTTOM = 34;
const MAX_X_LABELS = 6;

/**
 * Ports GraphPage.xaml.cs: a line chart of pre-fetched observation readings
 * against a min/max reference range, plus the department/component/from-to
 * header it built from the same entries. The MAUI original used Microcharts
 * (a native SkiaSharp chart view); this rewrite draws a lightweight custom
 * SVG line chart instead of pulling in a charting library, matching
 * GraphPage's own MinValue/MaxValue padding idea (`range * 0.4` there — this
 * chart uses a smaller 15% pad since it also expands the domain to the data
 * itself, not just the reference range, so a smaller cushion still keeps
 * every point clear of the edges).
 */
export function VitalsGraphScreen({ navigation, route }: RootScreenProps<'VitalsGraph'>) {
  const { patient, obsName, unit, min, max, points } = route.params;
  const [chartWidth, setChartWidth] = useState(0);

  function onChartLayout(e: LayoutChangeEvent) {
    setChartWidth(e.nativeEvent.layout.width);
  }

  const layout = useMemo(() => {
    if (points.length === 0 || chartWidth === 0) return null;

    const values = points.map(p => p.value);
    const rawMin = Math.min(min, ...values);
    const rawMax = Math.max(max, ...values);
    const span = rawMax - rawMin;
    const pad = span > 0 ? span * 0.15 : Math.max(Math.abs(rawMax || 1) * 0.1, 1);
    const domainMin = rawMin - pad;
    const domainMax = rawMax + pad;
    const domainSpan = domainMax - domainMin || 1;

    const innerWidth = chartWidth - PAD_LEFT - PAD_RIGHT;
    const innerHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

    const x = (index: number) =>
      points.length > 1 ? PAD_LEFT + (index / (points.length - 1)) * innerWidth : PAD_LEFT + innerWidth / 2;
    const y = (value: number) => PAD_TOP + (1 - (value - domainMin) / domainSpan) * innerHeight;

    const plotted = points.map((p, i) => ({
      ...p,
      x: x(i),
      y: y(p.value),
      inRange: p.value >= min && p.value <= max,
    }));

    const labelStep = Math.max(1, Math.ceil(points.length / MAX_X_LABELS));

    return {
      plotted,
      polyline: plotted.map(p => `${p.x},${p.y}`).join(' '),
      bandTop: y(max),
      bandBottom: y(min),
      innerWidth,
      innerHeight,
      labelStep,
    };
  }, [points, chartWidth, min, max]);

  return (
    <Screen>
      <AppHeader title={obsName} subtitle={patient.PATIENT_NAME} onBack={() => navigation.goBack()} />

      {points.length === 0 ? (
        <EmptyState icon="chart-line" title="No trend data available" />
      ) : (
        <View style={styles.body}>
          <Card style={styles.headerCard}>
            <Text style={styles.obsName}>{obsName}</Text>
            <Text style={styles.range}>
              Reference range: {min}–{max} {unit}
            </Text>
            <Text style={styles.spanLabel}>
              {points[0]?.label} → {points[points.length - 1]?.label} · {points.length} readings
            </Text>
          </Card>

          <Card style={styles.chartCard} onLayout={onChartLayout}>
            {layout ? (
              <Svg width={chartWidth} height={CHART_HEIGHT}>
                {/* Reference band */}
                <Rect
                  x={PAD_LEFT}
                  y={layout.bandTop}
                  width={layout.innerWidth}
                  height={Math.max(layout.bandBottom - layout.bandTop, 0)}
                  fill={colors.primaryLight}
                  opacity={0.5}
                />
                <Line
                  x1={PAD_LEFT}
                  x2={PAD_LEFT + layout.innerWidth}
                  y1={layout.bandTop}
                  y2={layout.bandTop}
                  stroke={colors.primary}
                  strokeWidth={1}
                  strokeDasharray="4,4"
                />
                <Line
                  x1={PAD_LEFT}
                  x2={PAD_LEFT + layout.innerWidth}
                  y1={layout.bandBottom}
                  y2={layout.bandBottom}
                  stroke={colors.primary}
                  strokeWidth={1}
                  strokeDasharray="4,4"
                />
                <SvgText
                  x={PAD_LEFT - 6}
                  y={layout.bandTop + 4}
                  fontSize={10}
                  fill={colors.textMuted}
                  textAnchor="end">
                  {max}
                </SvgText>
                <SvgText
                  x={PAD_LEFT - 6}
                  y={layout.bandBottom + 4}
                  fontSize={10}
                  fill={colors.textMuted}
                  textAnchor="end">
                  {min}
                </SvgText>

                {/* Axes */}
                <Line
                  x1={PAD_LEFT}
                  x2={PAD_LEFT}
                  y1={PAD_TOP}
                  y2={PAD_TOP + layout.innerHeight}
                  stroke={colors.border}
                  strokeWidth={1}
                />
                <Line
                  x1={PAD_LEFT}
                  x2={PAD_LEFT + layout.innerWidth}
                  y1={PAD_TOP + layout.innerHeight}
                  y2={PAD_TOP + layout.innerHeight}
                  stroke={colors.border}
                  strokeWidth={1}
                />

                {/* Trend line */}
                <Polyline
                  points={layout.polyline}
                  fill="none"
                  stroke={colors.primary}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />

                {/* X-axis labels (thinned when there are many points) */}
                {layout.plotted.map((p, i) =>
                  i % layout.labelStep === 0 || i === layout.plotted.length - 1 ? (
                    <G
                      key={`lbl-${i}`}
                      rotation={-35}
                      origin={`${p.x}, ${PAD_TOP + layout.innerHeight + 14}`}>
                      <SvgText
                        x={p.x}
                        y={PAD_TOP + layout.innerHeight + 14}
                        fontSize={9}
                        fill={colors.textMuted}
                        textAnchor="end">
                        {p.label}
                      </SvgText>
                    </G>
                  ) : null,
                )}

                {/* Data points */}
                {layout.plotted.map((p, i) => (
                  <Circle
                    key={`pt-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r={4.5}
                    fill={p.inRange ? colors.primary : colors.danger}
                    stroke={colors.surface}
                    strokeWidth={1.5}
                  />
                ))}
              </Svg>
            ) : null}
          </Card>

          <View style={styles.legendRow}>
            <LegendDot color={colors.primary} label="Within reference range" />
            <LegendDot color={colors.danger} label="Outside reference range" />
          </View>
        </View>
      )}
    </Screen>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, padding: spacing.lg, gap: spacing.md },
  headerCard: { gap: 4 },
  obsName: { ...typography.h3, color: colors.textPrimary },
  range: { ...typography.bodyStrong, color: colors.primary },
  spanLabel: { ...typography.caption, color: colors.textMuted },
  chartCard: { padding: spacing.md, alignItems: 'stretch' },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendSwatch: { width: 10, height: 10, borderRadius: radius.pill },
  legendLabel: { ...typography.caption, color: colors.textSecondary },
});
