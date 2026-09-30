import { Platform } from 'react-native';

export const fonts = {
  serif: Platform.select({ ios: 'Georgia', default: 'serif' }),
};
