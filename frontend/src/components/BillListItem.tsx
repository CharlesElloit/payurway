import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { rf, moderateScale } from '../utils/responsive';
import { formatCurrency } from '../utils/format';
import { BillItem } from '../constants/mockData';

interface BillListItemProps {
  bill: BillItem;
  onPress?: (bill: BillItem) => void;
}

const iconFor = (icon: BillItem['icon']) => {
  switch (icon) {
    case 'flash':
      return { name: 'flash' as const, bg: '#4A1414' };
    case 'water':
      return { name: 'water' as const, bg: '#123B57' };
    default:
      return { name: 'document' as const, bg: colors.surfaceAlt };
  }
};

export default function BillListItem({ bill, onPress }: BillListItemProps) {
  const iconMeta = iconFor(bill.icon);
  const isPaid = bill.status === 'Paid';

  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.75} onPress={() => onPress?.(bill)}>
      <View style={[styles.iconWrap, { backgroundColor: iconMeta.bg }]}>
        <Ionicons name={iconMeta.name} size={rf(20)} color={colors.textPrimary} />
      </View>

      <View style={styles.middle}>
        <Text style={styles.name} numberOfLines={1}>
          {bill.name}
        </Text>
        <Text style={styles.meta}>
          Due {bill.dueDate} · {bill.frequency}
        </Text>
      </View>

      <View style={styles.right}>
        <Text style={styles.amount}>UGX {formatCurrency(bill.amount)}</Text>
        <Text style={[styles.status, { color: isPaid ? colors.success : colors.warning }]}>{bill.status}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: moderateScale(10),
    padding: moderateScale(5),
    marginBottom: moderateScale(10),
  },
  iconWrap: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(8),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: moderateScale(5),
  },
  middle: {
    flex: 1,
  },
  name: {
    fontSize: rf(14),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  meta: {
    fontSize: rf(12),
    color: colors.textMuted,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: rf(13),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  status: {
    fontSize: rf(12),
    fontWeight: '600',
    marginTop: 2,
  },
});
