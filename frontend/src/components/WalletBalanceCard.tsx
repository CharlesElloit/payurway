import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { rf, moderateScale } from '../utils/responsive';
import { formatCurrency } from '../utils/format';

interface WalletBalanceCardProps {
  balance: number;
  accountNumber: string;
  movementUp: number;
  movementDown: number;
  currency?: string;
}

export default function WalletBalanceCard({
  balance,
  accountNumber,
  movementUp,
  movementDown,
  currency = 'UGX',
}: WalletBalanceCardProps) {
  const [whole, decimals] = formatCurrency(balance).split('.');

  return (
    <View style={styles.card}>
      <View style={styles.col}>
        <Text style={styles.label}>Wallet balance</Text>
        <View style={styles.balanceRow}>
          <Text style={styles.currency}>{currency}</Text>
          <Text style={styles.balanceWhole}>
            {' '}
            {whole}
            <Text style={styles.balanceDecimals}>.{decimals}</Text>
          </Text>
        </View>
        <View style={styles.accountRow}>
          <Text style={styles.accountText}>{accountNumber}</Text>
          <Ionicons name="eye-off-outline" size={rf(14)} color={colors.textMuted} style={{ marginLeft: 6 }} />
        </View>
      </View>

      <View style={[styles.col, styles.colRight]}>
        <Text style={styles.label}>Movements</Text>
        <View style={styles.movementItem}>
          <Ionicons name="arrow-up" size={rf(12)} color={colors.accent} />
          <Text style={[styles.movementText, { color: colors.accent }]}>
            {currency} {formatCurrency(movementUp)}
          </Text>
        </View>
        <View style={styles.movementItem}>
          <Ionicons name="arrow-down" size={rf(12)} color={colors.warning} />
          <Text style={[styles.movementText, { color: colors.warning }]}>
            {currency} {formatCurrency(movementDown)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: moderateScale(10),
    borderWidth: 1,
    borderColor: colors.border,
    padding: moderateScale(10),
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  col: {
    flexShrink: 1,
  },
  colRight: {
    alignItems: 'flex-end',
  },
  label: {
    fontSize: rf(13),
    color: colors.textSecondary,
    marginBottom: moderateScale(6),
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  currency: {
    fontSize: rf(13),
    color: colors.textSecondary,
    marginBottom: 4,
  },
  balanceWhole: {
    fontSize: rf(30),
    fontWeight: '800',
    color: colors.textPrimary,
  },
  balanceDecimals: {
    fontSize: rf(12),
    fontWeight: '600',
    color: colors.textSecondary,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: moderateScale(6),
  },
  accountText: {
    fontSize: rf(12),
    color: colors.textMuted,
  },
  movementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: moderateScale(6),
  },
  movementText: {
    fontSize: rf(13),
    fontWeight: '700',
    marginLeft: 4,
  },
});
