import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, StatusBar, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { moderateScale } from '../utils/responsive';

import HeroHeaderCard from '../components/HeroHeaderCard';
import WalletBalanceCard from '../components/WalletBalanceCard';
import AddMoneyButton from '../components/AddMoneyButton';
import BillTimelineTable from '../components/BillTimelineTable';
import AnimatedBarChart from '../components/AnimatedBarChart';
import TabSwitcher from '../components/TabSwitcher';
import BillListItem from '../components/BillListItem';
import BottomTabBar, { TabKey } from '../components/BottomTabBar';

import {
  user,
  weekDays,
  wallet,
  timelineRows,
  timelineTotal,
  chartData,
  chartMonths,
  currentMonth,
  chartAverage,
  upcomingBills,
  paidBills,
} from '../constants/mockData';

export default function HomeScreen() {
  const [selectedDay, setSelectedDay] = useState('20');
  const [billsTab, setBillsTab] = useState<'Upcoming' | 'Paid'>('Upcoming');
  const [activeNavTab, setActiveNavTab] = useState<TabKey>('Home');

  const bills = billsTab === 'Upcoming' ? upcomingBills : paidBills;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <HeroHeaderCard
          name={user.name}
          id={user.id}
          avatarUrl={user.avatarUrl}
          notificationCount={user.notificationCount}
          days={weekDays}
          selectedDayId={selectedDay}
          onSelectDay={setSelectedDay}
        />

        <View style={styles.section}>
          <WalletBalanceCard
            balance={wallet.balance}
            accountNumber={wallet.accountNumber}
            movementUp={wallet.movementUp}
            movementDown={wallet.movementDown}
          />
        </View>

        {/* <View style={styles.section}>
          <AddMoneyButton onPress={() => { }} />
        </View> */}

        <View style={styles.section}>
          <Text style={{ color: colors.textMuted, paddingBottom: 5 }}>Bill Timeline.2026</Text>
          <BillTimelineTable year={2026} rows={timelineRows} total={timelineTotal} />
        </View>

        <View style={styles.section}>
          <AnimatedBarChart
            data={chartData}
            months={chartMonths}
            currentMonth={currentMonth}
            average={chartAverage}
          />
        </View>

        <View style={styles.section}>
          <TabSwitcher
            tabs={['Upcoming', 'Paid']}
            activeTab={billsTab}
            onChange={(t) => setBillsTab(t as 'Upcoming' | 'Paid')}
          />
        </View>

        <View style={[styles.section, styles.listSection]}>
          {bills.map((bill) => (
            <BillListItem key={bill.id} bill={bill} />
          ))}
        </View>
      </ScrollView>

      <BottomTabBar activeTab={activeNavTab} onChange={setActiveNavTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: moderateScale(16),
    paddingTop: moderateScale(12),
    paddingBottom: moderateScale(110),
  },
  section: {
    marginTop: moderateScale(10),
  },
  listSection: {
    marginTop: moderateScale(10),
  },
});
