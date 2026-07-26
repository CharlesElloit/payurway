import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { rf, moderateScale } from '../utils/responsive';
import { formatCurrency } from '../utils/format';
import { TimelineRow } from '../constants/mockData';

interface BillTimelineTableProps {
  year: number;
  rows: TimelineRow[];
  total: { june: number; july: number; movementPct: number };
}

const colorFor = (key: TimelineRow['colorKey']) => {
  switch (key) {
    case 'danger':
      return colors.danger;
    case 'warning':
      return colors.warning;
    case 'success':
      return colors.success;
    default:
      return colors.textPrimary;
  }
};

function MovementBadge({ pct, up }: { pct: number; up: boolean }) {
  return (
    <View style={styles.movementBadge}>
      <Text style={[styles.movementArrow, { color: up ? colors.danger : colors.success }]}>{up ? '↑' : '↓'}</Text>
      <Text style={[styles.movementValue, { color: up ? colors.danger : colors.success }]}> {pct.toFixed(2)}%</Text>
    </View>
  );
}

export default function BillTimelineTable({ year, rows, total }: BillTimelineTableProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, styles.labelCol]} />
        <Text style={[styles.headerCell, styles.numCol]}>June {year}</Text>
        <Text style={[styles.headerCell, styles.numCol]}>July {year}</Text>
        <Text style={[styles.headerCell, styles.movCol]}>Movement %</Text>
      </View>

      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <Text style={[styles.rowLabel, styles.labelCol]}>{row.label}</Text>
          <Text style={[styles.rowValue, styles.numCol, { color: colorFor(row.colorKey) }]}>
            {formatCurrency(row.june)}
          </Text>
          <Text style={[styles.rowValue, styles.numCol, { color: colorFor(row.colorKey) }]}>
            {formatCurrency(row.july)}
          </Text>
          <View style={styles.movCol}>
            <MovementBadge pct={row.movementPct} up={row.movementUp} />
          </View>
        </View>
      ))}

      <View style={styles.divider} />

      <View style={styles.row}>
        <Text style={[styles.totalLabel, styles.labelCol]}>Total</Text>
        <Text style={[styles.totalValue, styles.numCol]}>{formatCurrency(total.june)}</Text>
        <Text style={[styles.totalValue, styles.numCol]}>{formatCurrency(total.july)}</Text>
        <View style={styles.movCol}>
          <MovementBadge pct={total.movementPct} up />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: moderateScale(10),
    padding: moderateScale(10),
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: "space-between",
    marginBottom: moderateScale(8),
  },
  headerCell: {
    fontSize: rf(11),
    color: colors.textMuted,
  },
  labelCol: {
    flex: 1.1,
  },
  numCol: {
    flex: 1,
    textAlign: 'right',
    paddingRight: 6,
  },
  movCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: moderateScale(2),
  },
  rowLabel: {
    fontSize: rf(12),
    color: colors.textMuted,
  },
  rowValue: {
    fontSize: rf(12),
    fontWeight: '700',
  },
  movementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  movementArrow: {
    fontSize: rf(12),
    fontWeight: '700',
  },
  movementValue: {
    fontSize: rf(12),
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: moderateScale(4),
  },
  totalLabel: {
    fontSize: rf(12),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  totalValue: {
    fontSize: rf(12),
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
