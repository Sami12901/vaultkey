import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
} from 'react-native';
import { useTheme } from '../../theme';
import { updateNative, UpdateInfo, DownloadProgress } from '../../services/nativeBridge';
import { CloudDownloadIcon, ShieldCheckIcon, CloseIcon } from '../icons';

interface UpdateModalProps {
  visible: boolean;
  updateInfo: UpdateInfo | null;
  onClose: () => void;
}

type UpdateStep = 'PROMPT' | 'DOWNLOADING' | 'READY_TO_INSTALL' | 'PERMISSION_NEEDED';

export const UpdateModal: React.FC<UpdateModalProps> = ({ visible, updateInfo, onClose }) => {
  const { colors } = useTheme();

  const [step, setStep] = useState<UpdateStep>('PROMPT');
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>({
    percent: 0,
    downloadedBytes: 0,
    totalBytes: 0,
  });
  const [downloadedFilePath, setDownloadedFilePath] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setStep('PROMPT');
      setDownloadProgress({ percent: 0, downloadedBytes: 0, totalBytes: 0 });
      setErrorMsg(null);
    }
  }, [visible]);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      'onUpdateDownloadProgress',
      (data: DownloadProgress) => {
        setDownloadProgress(data);
      }
    );
    return () => subscription.remove();
  }, []);

  if (!updateInfo) return null;

  const formatBytes = (bytes: number) => {
    if (bytes <= 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const handleStartDownload = async () => {
    if (!updateInfo.apkUrl) {
      Alert.alert('Error', 'Download URL not found in release');
      return;
    }
    setErrorMsg(null);
    setStep('DOWNLOADING');
    try {
      const res = await updateNative.startDownload(updateInfo.apkUrl);
      if (res.success && res.filePath) {
        setDownloadedFilePath(res.filePath);
        // Check if unknown app installs are allowed
        const canInstall = await updateNative.canInstallUnknownApps();
        if (canInstall) {
          setStep('READY_TO_INSTALL');
          // Auto trigger install
          await updateNative.installApk(res.filePath);
        } else {
          setStep('PERMISSION_NEEDED');
        }
      }
    } catch (err: any) {
      setStep('PROMPT');
      setErrorMsg(err?.message || 'Download failed. Please check your network connection.');
    }
  };

  const handleGrantPermissionAndInstall = async () => {
    try {
      await updateNative.openInstallPermissionSettings();
      // Keep state as READY_TO_INSTALL so user can tap install after returning from Settings
      setStep('READY_TO_INSTALL');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to open settings');
    }
  };

  const handleTriggerInstall = async () => {
    if (!downloadedFilePath) return;
    try {
      const canInstall = await updateNative.canInstallUnknownApps();
      if (!canInstall) {
        setStep('PERMISSION_NEEDED');
        return;
      }
      await updateNative.installApk(downloadedFilePath);
    } catch (err: any) {
      Alert.alert('Installation Error', err?.message || 'Failed to launch installer');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <CloudDownloadIcon size={24} color="#10B981" />
            </View>
            <View style={styles.titleArea}>
              <View style={styles.versionBadgeRow}>
                <Text style={[styles.title, { color: colors.text }]}>New Update Available</Text>
                <View style={styles.versionBadge}>
                  <Text style={styles.versionBadgeText}>{updateInfo.latestVersion}</Text>
                </View>
              </View>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Current version: {updateInfo.currentVersion} • Size: {formatBytes(updateInfo.apkSize)}
              </Text>
            </View>
            {step !== 'DOWNLOADING' && (
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <CloseIcon size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Error banner if any */}
          {errorMsg && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {/* Body according to step */}
          {step === 'PROMPT' && (
            <View style={styles.content}>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>Release Notes & Changelog:</Text>
              <ScrollView style={[styles.changelogBox, { backgroundColor: colors.background, borderColor: colors.border }]} nestedScrollEnabled>
                <Text style={[styles.changelogText, { color: colors.textSecondary }]}>
                  {updateInfo.changelog || 'Performance improvements, security hardening, and bug fixes.'}
                </Text>
              </ScrollView>

              <View style={styles.infoRow}>
                <ShieldCheckIcon size={16} color="#10B981" />
                <Text style={[styles.infoNote, { color: colors.textSecondary }]}>
                  Your vault data is 100% preserved during the in-place update.
                </Text>
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.btnSecondary, { borderColor: colors.border }]}
                  onPress={onClose}
                >
                  <Text style={[styles.btnSecondaryText, { color: colors.textSecondary }]}>Later</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btnPrimary, { backgroundColor: colors.primary }]}
                  onPress={handleStartDownload}
                >
                  <Text style={styles.btnPrimaryText}>Update Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 'DOWNLOADING' && (
            <View style={styles.content}>
              <Text style={[styles.downloadingText, { color: colors.text }]}>
                Downloading VaultKey {updateInfo.latestVersion}...
              </Text>

              {/* Progress bar */}
              <View style={[styles.progressBarBackground, { backgroundColor: colors.background }]}>
                <View style={[styles.progressBarFill, { width: `${downloadProgress.percent}%` }]} />
              </View>

              <View style={styles.progressDetailRow}>
                <Text style={[styles.progressPercent, { color: colors.primary }]}>
                  {downloadProgress.percent}%
                </Text>
                <Text style={[styles.progressBytes, { color: colors.textSecondary }]}>
                  {formatBytes(downloadProgress.downloadedBytes)} / {formatBytes(downloadProgress.totalBytes || updateInfo.apkSize)}
                </Text>
              </View>

              <View style={styles.downloadSpinnerRow}>
                <ActivityIndicator size="small" color="#10B981" />
                <Text style={[styles.downloadNotice, { color: colors.textSecondary }]}>
                  Please keep VaultKey open while downloading
                </Text>
              </View>
            </View>
          )}

          {step === 'PERMISSION_NEEDED' && (
            <View style={styles.content}>
              <View style={styles.permissionBox}>
                <Text style={[styles.permissionTitle, { color: colors.text }]}>Install Permission Needed</Text>
                <Text style={[styles.permissionDesc, { color: colors.textSecondary }]}>
                  Android requires permission to install updates directly from inside the app. Tap below to enable &quot;Allow from this source&quot;, then return to install.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: colors.primary, marginTop: 16 }]}
                onPress={handleGrantPermissionAndInstall}
              >
                <Text style={styles.btnPrimaryText}>Allow Permission in Settings</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'READY_TO_INSTALL' && (
            <View style={styles.content}>
              <View style={styles.readyBox}>
                <ShieldCheckIcon size={32} color="#10B981" />
                <Text style={[styles.readyTitle, { color: colors.text }]}>Download Complete!</Text>
                <Text style={[styles.readySubtitle, { color: colors.textSecondary }]}>
                  The updated APK is verified and ready to install.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: colors.primary, marginTop: 16 }]}
                onPress={handleTriggerInstall}
              >
                <Text style={styles.btnPrimaryText}>Install Update Now</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleArea: {
    flex: 1,
  },
  versionBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  versionBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  versionBadgeText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
  },
  content: {
    marginTop: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  changelogBox: {
    maxHeight: 140,
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  changelogText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'monospace',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  infoNote: {
    fontSize: 11,
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  btnSecondary: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  btnPrimary: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  downloadingText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  progressBarBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  progressDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBytes: {
    fontSize: 12,
  },
  downloadSpinnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  downloadNotice: {
    fontSize: 12,
  },
  permissionBox: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  permissionDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  readyBox: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  readyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  readySubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
});
