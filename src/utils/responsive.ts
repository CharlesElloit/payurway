import { Dimensions, PixelRatio } from 'react-native';

// Guideline sizes are based on a standard 375x812 (iPhone X-ish) design.
const GUIDELINE_BASE_WIDTH = 375;
const GUIDELINE_BASE_HEIGHT = 812;

export function getWindow() {
  return Dimensions.get('window');
}

export function scale(size: number): number {
  const { width } = getWindow();
  return (width / GUIDELINE_BASE_WIDTH) * size;
}

export function verticalScale(size: number): number {
  const { height } = getWindow();
  return (height / GUIDELINE_BASE_HEIGHT) * size;
}

/**
 * Moderate scale dampens the scaling factor so text/spacing doesn't grow
 * too aggressively on large tablets, while still adapting to small phones.
 */
export function moderateScale(size: number, factor = 0.5): number {
  return size + (scale(size) - size) * factor;
}

export function isSmallDevice(): boolean {
  const { width } = getWindow();
  return width < 360;
}

export function isTablet(): boolean {
  const { width } = getWindow();
  return width >= 768;
}

export function rf(size: number): number {
  // Rounds to nearest pixel to avoid blurry text on some densities.
  return Math.round(PixelRatio.roundToNearestPixel(moderateScale(size)));
}
