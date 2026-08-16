import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, useWindowDimensions } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { colors } from '../theme/colors';
import { rf, moderateScale } from '../utils/responsive';
import { ChartPoint } from '../constants/mockData';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface AnimatedBarChartProps {
  data: ChartPoint[];
  months: string[];
  currentMonth: string;
  average: number;
  maxValue?: number;
  height?: number;
}

const barColor = (key: ChartPoint['colorKey']) => {
  switch (key) {
    case 'green':
      return colors.success;
    case 'orange':
      return colors.warning;
    case 'red':
      return colors.danger;
    default:
      return colors.neutralBar;
  }
};

export default function AnimatedBarChart({
  data,
  months,
  currentMonth,
  average,
  maxValue = 100000,
  height = 220,
}: AnimatedBarChartProps) {
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = Math.max(windowWidth - moderateScale(65), 300);
  const paddingLeft = moderateScale(38);
  const paddingBottom = moderateScale(10);
  const plotWidth = chartWidth - paddingLeft;
  const plotHeight = height - paddingBottom;

  const barGap = 6;
  const barWidth = Math.max((plotWidth - barGap * (data.length - 1)) / data.length, 4);

  // One animated value per bar, driving a 0->1 "growth" progress.
  const animatedValues = useRef(data.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = animatedValues.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 550,
        delay: index * 35,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false, // height/y animation on SVG rect requires JS driver
      })
    );
    Animated.stagger(20, animations).start();
  }, [data]);

  const avgY = plotHeight - (average / maxValue) * plotHeight;

  const gridLines = useMemo(() => {
    const steps = 5; // 0, 20k, 40k, 60k, 80k, 100k
    return Array.from({ length: steps + 1 }, (_, i) => {
      const value = (maxValue / steps) * i;
      const y = plotHeight - (value / maxValue) * plotHeight;
      return { value, y };
    });
  }, [maxValue, plotHeight]);

  return (
    <View style={styles.card}>
      <Svg width={chartWidth} height={height}>
        {/* Y-axis grid + labels */}
        {gridLines.map((g) => (
          <React.Fragment key={g.value}>
            <Line
              x1={paddingLeft}
              x2={chartWidth}
              y1={g.y}
              y2={g.y}
              stroke={colors.border}
              strokeWidth={1}
            />
            <SvgText
              x={paddingLeft - 8}
              y={g.y + 4}
              fontSize={rf(10)}
              fill={colors.textMuted}
              textAnchor="end"
            >
              {g.value >= 1000 ? `${g.value / 1000}k` : `${g.value}`}
            </SvgText>
          </React.Fragment>
        ))}

        {/* Average line */}
        <Line
          x1={paddingLeft}
          x2={chartWidth}
          y1={avgY}
          y2={avgY}
          stroke={colors.warning}
          strokeWidth={1}
          strokeDasharray="4,4"
        />
        <SvgText x={paddingLeft - 8} y={avgY + 4} fontSize={rf(9)} fill={colors.warning} textAnchor="end">
          AVG
        </SvgText>

        {/* Bars */}
        {data.map((point, index) => {
          const targetBarHeight = (point.value / maxValue) * plotHeight;
          const x = paddingLeft + index * (barWidth + barGap);

          const animatedHeight = animatedValues[index].interpolate({
            inputRange: [0, 1],
            outputRange: [0, targetBarHeight],
          });
          const animatedY = animatedValues[index].interpolate({
            inputRange: [0, 1],
            outputRange: [plotHeight, plotHeight - targetBarHeight],
          });

          return (
            <AnimatedRect
              key={`${point.label}-${index}`}
              x={x}
              y={animatedY as unknown as number}
              width={barWidth}
              height={animatedHeight as unknown as number}
              rx={2}
              fill={barColor(point.colorKey)}
            />
          );
        })}
      </Svg>

      {/* Month labels row, aligned under the bar pairs */}
      <View style={[styles.monthRow, { paddingLeft }]}>
        {months.map((m) => (
          <Text
            key={m}
            style={[
              styles.monthLabel,
              m === currentMonth && styles.monthLabelActive,
              { width: plotWidth / months.length },
            ]}
          >
            {m}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: moderateScale(10),
    paddingTop: moderateScale(15),
    paddingBottom: moderateScale(6),
    paddingHorizontal: moderateScale(0),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  monthLabel: {
    fontSize: rf(10),
    color: colors.textMuted,
    textAlign: 'center',
  },
  monthLabelActive: {
    color: colors.accent,
    fontWeight: '700',
  },
});
