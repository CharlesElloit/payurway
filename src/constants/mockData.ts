export interface DayItem {
  id: string;
  label: string; // Sun, Mon...
  date: number;
  month: string;
  isCurrentMonth: boolean;
}

export interface ChartPoint {
  label: string; // Jan, Feb...
  value: number; // in currency units (thousands)
  colorKey: 'green' | 'orange' | 'red' | 'gray';
  isCurrent?: boolean;
}

export interface TimelineRow {
  label: 'Overdue' | 'Due' | 'Upcoming' | 'Paid';
  june: number;
  july: number;
  movementPct: number;
  movementUp: boolean;
  colorKey: 'danger' | 'warning' | 'success' | 'neutral';
}

export interface BillItem {
  id: string;
  name: string;
  provider: string;
  amount: number;
  dueDate: string;
  frequency: string;
  status: 'Due' | 'Paid';
  icon: 'flash' | 'water';
}

export const user = {
  name: 'Augustine J',
  id: 'rfeikduwkdi',
  avatarUrl: 'https://i.pravatar.cc/150?img=47',
  notificationCount: 10,
};

export const weekDays: DayItem[] = [
  { id: '19', label: 'Sun', date: 19, month: 'Jul', isCurrentMonth: true },
  { id: '20', label: 'Mon', date: 20, month: 'Jul', isCurrentMonth: true },
  { id: '21', label: 'Tus', date: 21, month: 'Jul', isCurrentMonth: true },
  { id: '22', label: 'Wen', date: 22, month: 'Jul', isCurrentMonth: true },
  { id: '23', label: 'Thu', date: 23, month: 'Jul', isCurrentMonth: true },
  { id: '24', label: 'Fri', date: 24, month: 'Jul', isCurrentMonth: true },
  { id: '25', label: 'Sat', date: 25, month: 'Jul', isCurrentMonth: true },
];

export const wallet = {
  balance: 20000.0,
  accountNumber: '1002********143817',
  movementUp: 20000.0,
  movementDown: 150000.0,
};

export const timelineRows: TimelineRow[] = [
  { label: 'Overdue', june: 350000, july: 350000, movementPct: 4.86, movementUp: true, colorKey: 'danger' },
  { label: 'Due', june: 1312893, july: 1312893, movementPct: 4.86, movementUp: true, colorKey: 'warning' },
  { label: 'Upcoming', june: 568000, july: 568000, movementPct: 8.86, movementUp: true, colorKey: 'warning' },
  { label: 'Paid', june: 568000, july: 568000, movementPct: 2.86, movementUp: true, colorKey: 'success' },
];

export const timelineTotal = {
  june: 2230893,
  july: 2230893,
  movementPct: 6.86,
};

export const chartData: ChartPoint[] = [
  { label: 'Jan', value: 22000, colorKey: 'green' },
  { label: 'Jan', value: 10000, colorKey: 'green' },
  { label: 'Feb', value: 65000, colorKey: 'orange' },
  { label: 'Feb', value: 42000, colorKey: 'orange' },
  { label: 'Mar', value: 95000, colorKey: 'red' },
  { label: 'Mar', value: 18000, colorKey: 'green' },
  { label: 'Apr', value: 75000, colorKey: 'red' },
  { label: 'Apr', value: 55000, colorKey: 'orange' },
  { label: 'May', value: 22000, colorKey: 'green' },
  { label: 'May', value: 32000, colorKey: 'green' },
  { label: 'Jun', value: 92000, colorKey: 'red' },
  { label: 'Jun', value: 90000, colorKey: 'red' },
  { label: 'Jul', value: 60000, colorKey: 'red', isCurrent: true },
  { label: 'Jul', value: 57000, colorKey: 'red', isCurrent: true },
  { label: 'Aug', value: 72000, colorKey: 'red' },
  { label: 'Aug', value: 8000, colorKey: 'gray' },
  { label: 'Sep', value: 42000, colorKey: 'orange' },
  { label: 'Sep', value: 52000, colorKey: 'gray' },
  { label: 'Oct', value: 58000, colorKey: 'red' },
  { label: 'Oct', value: 90000, colorKey: 'gray' },
  { label: 'Nov', value: 15000, colorKey: 'green' },
  { label: 'Nov', value: 10000, colorKey: 'gray' },
  { label: 'Dec', value: 30000, colorKey: 'green' },
];

export const chartMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const currentMonth = 'Jul';
export const chartAverage = 48000;

export const upcomingBills: BillItem[] = [
  {
    id: 'b1',
    name: 'Electricity – UEDCL',
    provider: 'UEDCL',
    amount: 85000,
    dueDate: '25 July',
    frequency: 'Monthly',
    status: 'Due',
    icon: 'flash',
  },
  {
    id: 'b2',
    name: 'Water – NWSC',
    provider: 'NWSC',
    amount: 85000,
    dueDate: '28 July',
    frequency: 'Monthly',
    status: 'Due',
    icon: 'water',
  },
  {
    id: 'b3',
    name: 'Internet',
    provider: 'Savannah',
    amount: 67000,
    dueDate: '28 July',
    frequency: 'Monthly',
    status: 'Due',
    icon: 'flash',
  },
];

export const paidBills: BillItem[] = [
  {
    id: 'p1',
    name: 'Electricity – UEDCL',
    provider: 'UEDCL',
    amount: 82000,
    dueDate: '25 June',
    frequency: 'Monthly',
    status: 'Paid',
    icon: 'flash',
  },
  {
    id: 'p2',
    name: 'Water – NWSC',
    provider: 'NWSC',
    amount: 80000,
    dueDate: '28 June',
    frequency: 'Monthly',
    status: 'Paid',
    icon: 'water',
  },
];
