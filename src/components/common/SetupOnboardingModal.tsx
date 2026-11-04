import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  AppState,
} from 'react-native';
import { useTheme } from '../../theme';
import {
  ShieldCheckIcon,
  CheckIcon,
  CloseIcon,
  AutofillIcon,
  CameraIcon,
  CloudDownloadIcon,
  LockIcon,
} from '../icons';
import {
  permissionsNative,
  updateNative,
  SetupPermissionsStatus,
} from '../../services/nativeBridge';

interface SetupOnboardingModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SetupOnboardingModal: React.FC<SetupOnboardingModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors } = useTheme();

  const [status, setStatus] = useState<SetupPermissionsStatus>({
    autofillEnabled: false,
    biometricsEnabled: false,
    cameraGranted: false,
    canInstallUnknownApps: true,
    ignoringBatteryOptimizations: true,
  });

  const refreshStatus = useCallback(async () => {
    try {
      const s = await permissionsNative.checkSetupStatus();
      if (s) setStatus(s);
    } catch {}
  }, []);

  useEffect(() => {
    if (visible) {
      refreshStatus();
    }
  }, [visible, refreshStatus]);

  // Re-check automatically when user returns to the app from Android Settings
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active' && visible) {
        refreshStatus();
      }
    });
    return () => sub.remove();
  }, [visible, refreshStatus]);

  const handleToggleAutofill = async () => {
    await permissionsNative.openAutofillSettings();
  };

  const handleToggleUnknownApps = async () => {
    await updateNative.openInstallPermissionSettings();
  };

  const handleToggleBattery = async () => {
    await permissionsNative.openBatteryOptimizationSettings();
  };

  const handleToggleCamera = async () => {
    await permissionsNative.openAppSettings();
  };

  const items = [
    {
      id: 'autofill',
      title: 'Android Autofill Service',
      desc: 'Enables 1-click password filling in Chrome, Brave, Edge, and Android apps.',
      descBn: 'ব্রাউজার ও অন্যান্য অ্যাপে স্বয়ংক্রিয়ভাবে পাসওয়ার্ড পূরণ করার সুবিধা।',
      icon: <AutofillIcon size={22} color="#3B82F6" />,
      active: status.autofillEnabled,
      actionText: 'Turn On',
      onPress: handleToggleAutofill,
    },
    {
      id: 'biometrics',
      title: 'Biometric Unlock',
      desc: 'Unlock your vault instantly using your fingerprint or face recognition.',
      descBn: 'ফিঙ্গারপ্রিন্ট দিয়ে সহজে ভল্ট আনলক করার সুবিধা।',
      icon: <LockIcon size={22} color="#10B981" />,
      active: status.biometricsEnabled,
      actionText: status.biometricsEnabled ? 'Active' : 'Settings',
      onPress: () => {
        onClose();
      },
    },
    {
      id: 'camera',
      title: 'Camera for 2FA QR Codes',
      desc: 'Scan 2FA Authenticator QR codes from websites completely offline.',
      descBn: 'অফলাইনে 2FA অথেনটিকেটর QR কোড স্ক্যান করার পারমিশন।',
      icon: <CameraIcon size={22} color="#8B5CF6" />,
      active: status.cameraGranted,
      actionText: 'Grant',
      onPress: handleToggleCamera,
    },
    {
      id: 'updates',
      title: 'Seamless In-App Updates',
      desc: 'Receive verified new versions directly from GitHub without losing data.',
      descBn: 'গিটহাব রিলিজ থেকে সরাসরি ইন-অ্যাপ আপডেট পাওয়ার অনুমতি।',
      icon: <CloudDownloadIcon size={22} color="#F59E0B" />,
      active: status.canInstallUnknownApps,
      actionText: 'Allow',
      onPress: handleToggleUnknownApps,
    },
    {
      id: 'battery',
      title: 'Background Stability',
      desc: 'Prevents the OS from clearing clipboard memory or pausing autofill.',
      descBn: 'ক্লিপবোর্ড অটো-ক্লিয়ার ও অটোফিল যেন ব্যাকগ্রাউন্ডে বন্ধ না হয়।',
      icon: <ShieldCheckIcon size={22} color="#06B6D4" />,
      active: status.ignoringBatteryOptimizations,
      actionText: 'Optimize',
      onPress: handleToggleBattery,
    },
  ];

  const completedCount = items.filter(i => i.active).length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconCircle}>
                <ShieldCheckIcon size={24} color="#10B981" />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>VaultKey Setup Guide</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  {completedCount} of {items.length} features enabled
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <CloseIcon size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Intro notice */}
          <View style={[styles.noticeBox, { backgroundColor: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.2)' }]}>
            <Text style={[styles.noticeText, { color: colors.text }]}>
              To enable 1-click password autofill, biometrics, and offline 2FA scanning, configure the permissions below:
            </Text>
          </View>

          {/* Checklist */}
          <ScrollView style={styles.scrollList} contentContainerStyle={styles.scrollContent}>
            {items.map(item => (
              <View
                key={item.id}
                style={[
                  styles.itemCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: item.active ? 'rgba(16, 185, 129, 0.3)' : colors.border,
                  },
                ]}
              >
                <View style={styles.itemIconCol}>{item.icon}</View>

                <View style={styles.itemContentCol}>
                  <View style={styles.itemTitleRow}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
                    {item.active ? (
                      <View style={styles.activeBadge}>
                        <CheckIcon size={12} color="#10B981" />
                        <Text style={styles.activeBadgeText}>Active</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>{item.desc}</Text>
                  <Text style={[styles.itemDescBn, { color: colors.textSecondary }]}>{item.descBn}</Text>
                </View>

                {!item.active ? (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                    onPress={item.onPress}
                  >
                    <Text style={styles.actionBtnText}>{item.actionText}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.primary }]} onPress={onClose}>
              <Text style={styles.doneBtnText}>All Set • Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dialog: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '88%',
    borderRadius: 18,
    borderWidth: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  noticeBox: {
    marginHorizontal: 18,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 16,
  },
  scrollList: {
    flex: 1,
    paddingHorizontal: 18,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  itemIconCol: {
    width: 32,
    alignItems: 'center',
  },
  itemContentCol: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  itemDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  itemDescBn: {
    fontSize: 10.5,
    marginTop: 2,
    fontStyle: 'italic',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeBadgeText: {
    color: '#10B981',
    fontSize: 10.5,
    fontWeight: '700',
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  doneBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

