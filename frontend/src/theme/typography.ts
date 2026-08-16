import { moderateScale } from '../utils/responsive';

export const typography = {
  h1: {
    fontSize: moderateScale(22),
    fontWeight: '700' as const,
  },
  h2: {
    fontSize: moderateScale(18),
    fontWeight: '700' as const,
  },
  body: {
    fontSize: moderateScale(14),
    fontWeight: '400' as const,
  },
  bodyBold: {
    fontSize: moderateScale(14),
    fontWeight: '700' as const,
  },
  caption: {
    fontSize: moderateScale(12),
    fontWeight: '400' as const,
  },
  balance: {
    fontSize: moderateScale(32),
    fontWeight: '800' as const,
  },
};
