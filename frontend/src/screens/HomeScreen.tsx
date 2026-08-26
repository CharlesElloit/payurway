import React, { useRef, useState } from 'react';
import { View, StyleSheet, StatusBar, Animated, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { moderateScale } from '../utils/responsive';

import HeroHeaderCard from '../components/HeroHeaderCard';
import WalletBalanceCard from '../components/WalletBalanceCard';
import BillTimelineTable from '../components/BillTimelineTable';
import AnimatedBarChart from '../components/AnimatedBarChart';
import TabSwitcher from '../components/TabSwitcher';
import BillListItem from '../components/BillListItem';
import BottomTabBar, { TabKey } from '../components/BottomTabBar';
import MyBillsHeader, { MY_BILLS_HEADER_HEIGHT } from '../components/MyBillsHeader';
import AddBillModal from '../components/AddBillModal';
import PayScanModal from '../components/PayScanModal';
import ProfileScreen from './ProfileScreen'; // Import your ProfileScreen

import {
  user as mockUser,
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

const BILL_TIMELINE_STICKY_INDEX = 2;
const REVEAL_DISTANCE = moderateScale(60);
const CHART_FADE_DISTANCE = moderateScale(180);

interface HomeScreenProps {
  onLogout?: () => void;
  user?: {
    id: string;
    phone: string;
    firstName?: string;
    lastName?: string;
    isVerified?: boolean;
  };
}

export default function HomeScreen({ onLogout, user: apiUser }: HomeScreenProps) {
  const displayUser = apiUser
    ? {
        name: apiUser.firstName
          ? `${apiUser.firstName} ${apiUser.lastName || ''}`.trim()
          : apiUser.phone,
        id: apiUser.id,
        avatarUrl: `https://i.pravatar.cc/150?u=${apiUser.id}`,
        notificationCount: 0,
      }
    : mockUser;
  const [selectedDay, setSelectedDay] = useState('20');
  const [billsTab, setBillsTab] = useState<'Upcoming' | 'Paid'>('Upcoming');
  const [activeNavTab, setActiveNavTab] = useState<TabKey>('Home');
  const [isAddBillVisible, setIsAddBillVisible] = useState(false);
  const [isPayScanVisible, setIsPayScanVisible] = useState(false);
  const [billTimelineY, setBillTimelineY] = useState(0);
  const [stickySectionHeight, setStickySectionHeight] = useState(0);
  const [chartY, setChartY] = useState(0);

  const bills = billsTab === 'Upcoming' ? upcomingBills : paidBills;

  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<any>(null);

  const triggerY = billTimelineY > 0 ? billTimelineY : Number.MAX_SAFE_INTEGER;
  const revealInputRange = [Math.max(triggerY - REVEAL_DISTANCE, 0), triggerY];

  const headerHeight = scrollY.interpolate({
    inputRange: revealInputRange,
    outputRange: [0, MY_BILLS_HEADER_HEIGHT],
    extrapolate: 'clamp',
  });
  const headerOpacity = scrollY.interpolate({
    inputRange: revealInputRange,
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const chartTriggerY = chartY > 0 ? chartY : Number.MAX_SAFE_INTEGER;
  const chartFadeStart = chartTriggerY - stickySectionHeight;

  const chartOpacity = scrollY.interpolate({
    inputRange: [Math.max(chartFadeStart, 0), chartFadeStart + CHART_FADE_DISTANCE],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  ) as (event: NativeSyntheticEvent<NativeScrollEvent>) => void;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* CONDITIONAL RENDER: Display ProfileScreen or Main Home View based on active tab */}
      {activeNavTab === 'Profile' ? (
        <ProfileScreen onLogout={onLogout} />
      ) : (
        <>
          <MyBillsHeader
            height={headerHeight}
            opacity={headerOpacity}
            onBack={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
            onAdd={() => setIsAddBillVisible(true)}
          />

          <Animated.ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            stickyHeaderIndices={[BILL_TIMELINE_STICKY_INDEX]}
          >
            <HeroHeaderCard
              name={displayUser.name}
              id={displayUser.id}
              avatarUrl={displayUser.avatarUrl}
              notificationCount={displayUser.notificationCount}
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

            <View
              style={[styles.section, styles.stickySection]}
              onLayout={(e) => {
                setBillTimelineY(e.nativeEvent.layout.y);
                setStickySectionHeight(e.nativeEvent.layout.height);
              }}
            >
              <BillTimelineTable year={2026} rows={timelineRows} total={timelineTotal} />
            </View>

            <Animated.View style={[styles.section, { opacity: chartOpacity }]} onLayout={(e) => setChartY(e.nativeEvent.layout.y)}>
              <AnimatedBarChart
                data={chartData}
                months={chartMonths}
                currentMonth={currentMonth}
                average={chartAverage}
              />
            </Animated.View>

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
          </Animated.ScrollView>
        </>
      )}

      {/* PERSISTENT BOTTOM TAB BAR */}
      <BottomTabBar
        activeTab={activeNavTab}
        onChange={(tab) => {
          if (tab === 'Pay') {
            setIsPayScanVisible(true);
          } else {
            setActiveNavTab(tab);
          }
        }}
      />

      <AddBillModal visible={isAddBillVisible} onClose={() => setIsAddBillVisible(false)} />
      <PayScanModal visible={isPayScanVisible} onClose={() => setIsPayScanVisible(false)} />
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
  stickySection: {
    backgroundColor: colors.background,
    marginTop: 0,
    paddingTop: moderateScale(16),
    paddingBottom: moderateScale(4),
  },
  listSection: {
    marginTop: moderateScale(10),
  },
});