import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Reminder streak harian (fitur #4) -- notifikasi LOKAL terjadwal, bukan push
// server. Batasan platform yang jujur: expo-notifications TIDAK didukung di
// web, jadi semua fungsi di sini no-op di web dan UI toggle-nya disembunyikan.

const REMINDER_HOUR = 19; // 19:00 waktu lokal perangkat

export const notificationsSupported = Platform.OS !== 'web';

// Tampilkan notifikasi juga saat app lagi kebuka di foreground (default
// Android/iOS menyembunyikannya) -- panggil sekali saat app start (native saja).
export function configureNotificationHandler() {
  if (!notificationsSupported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function isDailyReminderEnabled(): Promise<boolean> {
  if (!notificationsSupported) return false;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.length > 0;
}

// Minta izin + jadwalkan reminder harian. Return false kalau izin ditolak.
export async function enableDailyReminder(): Promise<boolean> {
  if (!notificationsSupported) return false;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return false;

  // Android wajib punya channel sebelum notifikasi bisa tampil.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily-reminder', {
      name: 'Daily practice reminder',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  // Bersihkan jadwal lama dulu supaya idempoten (toggle bolak-balik tidak
  // menumpuk banyak reminder).
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time to practice 🔥',
      body: 'Keep your streak alive. One short session is enough.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: REMINDER_HOUR,
      minute: 0,
      channelId: Platform.OS === 'android' ? 'daily-reminder' : undefined,
    },
  });
  return true;
}

export async function disableDailyReminder(): Promise<void> {
  if (!notificationsSupported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
