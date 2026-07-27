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

// Direct-child index of the Bill Timeline section within the ScrollView's
// content — this is what react-native's stickyHeaderIndices pins in place.
const BILL_TIMELINE_STICKY_INDEX = 2;
// How many pixels of scroll the "ease down" reveal animation plays over.
const REVEAL_DISTANCE = moderateScale(60);
const CHART_FADE_DISTANCE = moderateScale(180);

export default function HomeScreen() {
  const [selectedDay, setSelectedDay] = useState('20');
  const [billsTab, setBillsTab] = useState<'Upcoming' | 'Paid'>('Upcoming');
  const [activeNavTab, setActiveNavTab] = useState<TabKey>('Home');

  // Y position of the Bill Timeline section within the scroll content, captured via onLayout.
  const [billTimelineY, setBillTimelineY] = useState(0);

  // Height of the sticky Bill Timeline section — needed to know how much of the
  // screen it covers once pinned, so the chart fade is timed against its bottom
  // edge rather than its own raw scroll offset.
  const [stickySectionHeight, setStickySectionHeight] = useState(0);

  // Y position of the chart section, captured via onLayout — used to fade it
  // out as it scrolls in behind the sticky Bill Timeline section.
  const [chartY, setChartY] = useState(0);

  const bills = billsTab === 'Upcoming' ? upcomingBills : paidBills;

  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<any>(null);

  // Guard against the header reveal firing before onLayout has measured the
  // real section position (defaults to "far away" so nothing shows early).
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

  // Fades the chart to transparent over CHART_FADE_DISTANCE once scroll passes
  // its top edge, instead of letting it hard-clip under the sticky section.
const chartTriggerY = chartY > 0 ? chartY : Number.MAX_SAFE_INTEGER;
 const chartFadeStart = chartTriggerY - stickySectionHeight;

const chartOpacity = scrollY.interpolate({
    inputRange: [Math.max(chartFadeStart, 0), chartFadeStart + CHART_FADE_DISTANCE],
    outputRange: [1, 0],
    extrapolate: 'clamp',
 });

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false } // height/color-style interpolations require the JS driver
  ) as (event: NativeSyntheticEvent<NativeScrollEvent>) => void;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <MyBillsHeader
        height={headerHeight}
        opacity={headerOpacity}
        onBack={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
        onAdd={() => {}}
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

        {/* Sticky section: index 3 among the ScrollView's direct children — pins to the
            top of the scroll viewport (i.e. right under MyBillsHeader) once reached,
            while everything below continues to scroll underneath it. */}
        <View
          style={[styles.section, styles.stickySection]}
          onLayout={(e) => {
            setBillTimelineY(e.nativeEvent.layout.y);
            setStickySectionHeight(e.nativeEvent.layout.height);
          }}
        >
          <BillTimelineTable year={2026} rows={timelineRows} total={timelineTotal} />
        </View>

        {/* <View style={styles.section}> */}
        <Animated.View style={[styles.section, { opacity: chartOpacity }]} onLayout={(e) => setChartY(e.nativeEvent.layout.y)}>
          <AnimatedBarChart
            data={chartData}
            months={chartMonths}
            currentMonth={currentMonth}
            average={chartAverage}
          />
        </Animated.View>
        {/* </View> */}

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