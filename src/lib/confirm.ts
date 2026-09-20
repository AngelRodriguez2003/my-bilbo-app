import { Alert, Platform } from 'react-native';

/** Native alert with buttons; on web falls back to the browser confirm dialog. */
export function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmLabel: string,
  cancelLabel = '✕',
) {
  if (Platform.OS === 'web') {
    // RN-web Alert has no buttons support
    if (globalThis.confirm?.(message)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { style: 'cancel', text: cancelLabel },
    { style: 'destructive', text: confirmLabel, onPress: onConfirm },
  ]);
}
