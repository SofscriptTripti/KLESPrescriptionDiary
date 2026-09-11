import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, {
  Circle,
  G,
  Line,
  Polyline,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import { Screen, AppHeader, Card, EmptyState } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import { getMode } from '../../storage/session';
import type { RootScreenProps } from '../../navigation/types';

const CHART_HEIGHT = 300;
const PAD_LEFT = 48;
const PAD_RIGHT = 16;
const PAD_TOP = 24;
const PAD_BOTTOM = 56;
const MAX_X_LABELS = 6;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const RESET_EPSILON = 0.02;

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

/**
 * Ports TestDetailsPage.xaml.cs's ShowGraphPage()/GraphPage.xaml(.cs) — reached
 * by tapping a component name in the Test Details grid. Same header fields as
 * the original (PtnNo, Name, Dept, Component, From, To, Ref. Range) and the
 * same data (pre-fetched component readings, no separate API call), redrawn
 * as a custom SVG line chart instead of the MAUI Microcharts view.
 *
 * Zoom is a two-finger pinch that scales the WHOLE drawn chart as one image —
 * axis, reference lines, labels, points, everything together via a single
 * transform — rather than re-laying the data out across a wider canvas (which
 * left the y-axis stranded off-screen with no way back at high zoom). A
 * two-finger drag pans around when zoomed in, bounds-clamped so the chart can
 * never be dragged fully out of view, and zooming back out to 100% always
 * snaps the pan back to center so nothing stays stuck off-screen. Built on
 * react-native-gesture-handler alone (already linked app-wide, no Reanimated),
 * so it behaves identically on iOS with no new native module.
 */
export function TestGraphScreen({
  navigation,
  route,
}: RootScreenProps<'TestGraph'>) {
  const { patient, dept, component, min, max, points } = route.params;
  const [mode, setMode] = useState<'ip' | 'op'>('ip');
  const [containerWidth, setContainerWidth] = useState(0);
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });

  // Committed ("base") values from the end of the previous gesture, and the
  // live values during the current one — refs so gesture callbacks always
  // see the latest value without stale closures.
  const baseRef = useRef({ scale: 1, x: 0, y: 0 });
  const liveRef = useRef({ scale: 1, x: 0, y: 0 });

  useEffect(() => {
    getMode().then(m => setMode(m === 'op' ? 'op' : 'ip'));
  }, []);

  const ptnNo = mode === 'ip' ? patient.PATIENT_ID : patient.PRMNT_PATIENT_NO;

  function onContainerLayout(e: LayoutChangeEvent) {
    setContainerWidth(e.nativeEvent.layout.width);
  }

  function openRmo() {
    const docCd = Number(patient.PATIENT_DOCCD);
    navigation.navigate('RMO', { docCd: Number.isNaN(docCd) ? 0 : docCd });
  }

  function maxTranslate(scale: number) {
    return {
      x: (containerWidth * (scale - 1)) / 2,
      y: (CHART_HEIGHT * (scale - 1)) / 2,
    };
  }

  function commitAndMaybeReset() {
    baseRef.current = liveRef.current;
    if (baseRef.current.scale <= MIN_ZOOM + RESET_EPSILON) {
      baseRef.current = { scale: MIN_ZOOM, x: 0, y: 0 };
      liveRef.current = baseRef.current;
      setTransform(baseRef.current);
    }
  }

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .runOnJS(true)
        .onUpdate(e => {
          const scale = clamp(
            baseRef.current.scale * e.scale,
            MIN_ZOOM,
            MAX_ZOOM,
          );
          const bound = maxTranslate(scale);
          const x = clamp(baseRef.current.x, -bound.x, bound.x);
          const y = clamp(baseRef.current.y, -bound.y, bound.y);
          liveRef.current = { scale, x, y };
          setTransform(liveRef.current);
        })
        .onEnd(commitAndMaybeReset),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [containerWidth],
  );

  // Two-finger drag to pan around a zoomed-in chart — kept to 2 pointers so a
  // normal single-finger touch on the chart still lets the page itself scroll.
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .minPointers(2)
        .maxPointers(2)
        .runOnJS(true)
        .onUpdate(e => {
          const scale = liveRef.current.scale;
          const bound = maxTranslate(scale);
          const x = clamp(
            baseRef.current.x + e.translationX,
            -bound.x,
            bound.x,
          );
          const y = clamp(
            baseRef.current.y + e.translationY,
            -bound.y,
            bound.y,
          );
          liveRef.current = { scale, x, y };
          setTransform(liveRef.current);
        })
        .onEnd(commitAndMaybeReset),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [containerWidth],
  );

  const composedGesture = useMemo(
    () => Gesture.Simultaneous(pinchGesture, panGesture),
    [pinchGesture, panGesture],
  );

  const layout = useMemo(() => {
    if (points.length === 0 || containerWidth === 0) return null;

    const values = points.map(p => p.value);
    const rawMin = Math.min(min, ...values);
    const rawMax = Math.max(max, ...values);
    const span = rawMax - rawMin;
    const pad =
      span > 0 ? span * 0.15 : Math.max(Math.abs(rawMax || 1) * 0.1, 1);
    const domainMin = rawMin - pad;
    const domainMax = rawMax + pad;
    const domainSpan = domainMax - domainMin || 1;

    const innerWidth = containerWidth - PAD_LEFT - PAD_RIGHT;
    const innerHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

    const x = (index: number) =>
      points.length > 1
        ? PAD_LEFT + (index / (points.length - 1)) * innerWidth
        : PAD_LEFT + innerWidth / 2;
    const y = (value: number) =>
      PAD_TOP + (1 - (value - domainMin) / domainSpan) * innerHeight;

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
  }, [points, containerWidth, min, max]);

  return (
    <Screen>
      <AppHeader
        title="Graph"
        subtitle={component}
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={openRmo}
            hitSlop={8}
          >
            <Icon name="doctor" size={22} color={colors.textOnPrimary} />
          </TouchableOpacity>
        }
      />

      {points.length === 0 ? (
        <EmptyState icon="chart-line" title="No graph data" />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {/* Mirrors GraphPage.xaml's teal header Grid — PtnNo/Name, Dept/Component, From/To. */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <InfoField label="PtnNo:" value={ptnNo} />
              <InfoField label="Name:" value={patient.PATIENT_NAME} />
            </View>
            <View style={styles.infoRow}>
              <InfoField label="Dept:" value={dept || '—'} />
              <InfoField label="Component:" value={component} />
            </View>
            <View style={styles.infoRow}>
              <InfoField label="From:" value={points[0]?.label ?? '—'} />
              <InfoField
                label="To:"
                value={points[points.length - 1]?.label ?? '—'}
              />
            </View>
          </View>

          <View style={styles.refRangeRow}>
            <Text style={styles.refRange}>
              Ref. Range : {min} - {max}
            </Text>
            <View style={styles.pinchHint}>
              <Icon name="gesture-pinch" size={16} color={colors.textMuted} />
              <Text style={styles.pinchHintText}>
                Pinch to zoom in and out with two fingers. 
              </Text>
            </View>
          </View>

          <Card style={styles.chartCard} collapsable={false}>
            {/* Measured separately from Card itself (Card has its own padding,
                which onLayout would otherwise include, overflowing the clip
                box past the card's edges) — this View spans exactly the
                content area available inside that padding. */}
            <View style={styles.chartMeasure} onLayout={onContainerLayout}>
              {/* Clips the transformed (scaled + panned) chart to the card's own
                  bounds — without this a zoomed-in chart would visually spill
                  over the rest of the screen instead of just panning inside. */}
              <View
                style={[
                  styles.chartClip,
                  { width: containerWidth || '100%', height: CHART_HEIGHT },
                ]}
              >
                <GestureDetector gesture={composedGesture}>
                  <View
                    collapsable={false}
                    style={[
                      styles.chartTransform,
                      {
                        transform: [
                          { translateX: transform.x },
                          { translateY: transform.y },
                          { scale: transform.scale },
                        ],
                      },
                    ]}
                  >
                    {layout ? (
                      <Svg width={containerWidth} height={CHART_HEIGHT}>
                        {/* Reference band */}
                        <Rect
                          x={PAD_LEFT}
                          y={layout.bandTop}
                          width={layout.innerWidth}
                          height={Math.max(
                            layout.bandBottom - layout.bandTop,
                            0,
                          )}
                          fill={colors.primaryLight}
                          opacity={0.5}
                        />
                        {/* Higher limit (max) and lower limit (min) reference lines
                          in distinct colors — explained in the legend below. */}
                        <Line
                          x1={PAD_LEFT}
                          x2={PAD_LEFT + layout.innerWidth}
                          y1={layout.bandTop}
                          y2={layout.bandTop}
                          stroke={colors.warning}
                          strokeWidth={1.5}
                          strokeDasharray="4,4"
                        />
                        <Line
                          x1={PAD_LEFT}
                          x2={PAD_LEFT + layout.innerWidth}
                          y1={layout.bandBottom}
                          y2={layout.bandBottom}
                          stroke={colors.info}
                          strokeWidth={1.5}
                          strokeDasharray="4,4"
                        />
                        <SvgText
                          x={PAD_LEFT - 6}
                          y={layout.bandTop + 4}
                          fontSize={10}
                          fill={colors.warning}
                          textAnchor="end"
                        >
                          {max}
                        </SvgText>
                        <SvgText
                          x={PAD_LEFT - 6}
                          y={layout.bandBottom + 4}
                          fontSize={10}
                          fill={colors.info}
                          textAnchor="end"
                        >
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

                        {/* X-axis date labels — given generous clearance below the
                          axis (PAD_BOTTOM) so the rotated text has room and
                          doesn't look cramped or clipped. */}
                        {layout.plotted.map((p, i) =>
                          i % layout.labelStep === 0 ||
                          i === layout.plotted.length - 1 ? (
                            <G
                              key={`lbl-${i}`}
                              rotation={-30}
                              origin={`${p.x}, ${
                                PAD_TOP + layout.innerHeight + 26
                              }`}
                            >
                              <SvgText
                                x={p.x}
                                y={PAD_TOP + layout.innerHeight + 26}
                                fontSize={10}
                                fill={colors.textMuted}
                                textAnchor="end"
                              >
                                {p.label}
                              </SvgText>
                            </G>
                          ) : null,
                        )}

                        {/* Value labels above each point */}
                        {layout.plotted.map((p, i) => (
                          <SvgText
                            key={`val-${i}`}
                            x={p.x}
                            y={p.y - 10}
                            fontSize={9}
                            fill={colors.textPrimary}
                            textAnchor="middle"
                          >
                            {p.value}
                          </SvgText>
                        ))}

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
                  </View>
                </GestureDetector>
              </View>
            </View>
          </Card>

          <View style={styles.legendRow}>
            <LegendDot color={colors.primary} label="Within reference range" />
            <LegendDot color={colors.danger} label="Outside reference range" />
          </View>
          <View style={styles.legendRow}>
            <LegendLine color={colors.warning} label="Higher limit (Max)" />
            <LegendLine color={colors.info} label="Lower limit (Min)" />
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoField}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
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

function LegendLine({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendLineSwatch, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBtn: { padding: spacing.xs },
  body: { padding: spacing.lg, gap: spacing.md },
  infoCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  infoRow: { flexDirection: 'row', gap: spacing.md },
  infoField: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  infoLabel: {
    ...typography.caption,
    color: colors.textOnPrimary,
    opacity: 0.8,
    fontSize: 11,
  },
  infoValue: {
    ...typography.captionStrong,
    color: colors.textOnPrimary,
    fontSize: 11,
    flexShrink: 1,
  },
  refRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  refRange: { ...typography.bodyStrong, color: colors.primary },
  pinchHint: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pinchHintText: { ...typography.caption, color: colors.textMuted },
  chartCard: { padding: spacing.md, alignItems: 'stretch' },
  chartMeasure: { width: '100%' },
  chartClip: { overflow: 'hidden', alignSelf: 'center' },
  chartTransform: { width: '100%', height: '100%' },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendSwatch: { width: 10, height: 10, borderRadius: radius.pill },
  legendLineSwatch: { width: 18, height: 3, borderRadius: 2 },
  legendLabel: { ...typography.caption, color: colors.textSecondary },
});
