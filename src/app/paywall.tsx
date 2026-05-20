import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Modal,
  useWindowDimensions
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import {
  X,
  Crown,
  FolderOpen,
  BarChart3,
  Compass,
  Share2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import type { PurchasesPackage } from 'react-native-purchases';
import {
  isPurchasesEnabled,
  getOfferings,
  purchasePackage,
  restorePurchases,
} from '@/lib/purchases';
import usePurchasesStore from '@/lib/state/purchases-store';
import RenderHTML from "react-native-render-html";
import { cn } from "@/lib/cn";

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=900&q=85';

const FREE_LIMIT = 3;

const FEATURES: {
  icon: React.ComponentType<{ size: number; color: string }>;
  title: string;
  description: string;
  color: string;
  badge?: string;
}[] = [
  {
    icon: FolderOpen,
    title: 'Unlimited Albums',
    description: `Free tier: ${FREE_LIMIT} albums. Premium: no limit.`,
    color: '#3B82F6',
  },
  {
    icon: BarChart3,
    title: 'Travel Stats',
    description: 'Cities, countries & km traveled at a glance.',
    color: '#10B981',
  },
  {
    icon: Compass,
    title: 'Trip Detection',
    description: 'Auto-group photos into trips by time & place.',
    color: '#8B5CF6',
  },
  {
    icon: Share2,
    title: 'Map Export',
    description: 'Export your travel map as a shareable image.',
    color: '#EC4899',
  },
];

type LegalModalType = "terms" | "policy" | null;

interface LegalModalProps {
  visible: boolean;
  type: LegalModalType;
  onClose: () => void;
  isLight: boolean;
}

const LegalModal: React.FC<LegalModalProps> = ({ visible, type, onClose, isLight }) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  //const { t } = useTranslation();

  const getLegalContent = () => {
    switch (type) {
      case "terms":
        return {
          title: "Terms & Conditions",
          content: "<p>These terms and conditions apply to the Travel View - Memories Tracker app (hereby referred to as \"Application\") for mobile devices that was created by Paulo Cristo (hereby referred to as \"Service Provider\") as a Freemium service.</p><br><p>Upon downloading or utilizing the Application, you are automatically agreeing to the following terms. It is strongly advised that you thoroughly read and understand these terms prior to using the Application.</p><br><p>Unauthorized copying, modification of the Application, any part of the Application, or our trademarks is strictly prohibited. Any attempts to extract the source code of the Application, translate the Application into other languages, or create derivative versions are not permitted. All trademarks, copyrights, database rights, and other intellectual property rights related to the Application remain the property of the Service Provider.</p><br><p>The Service Provider is dedicated to ensuring that the Application is as beneficial and efficient as possible. As such, they reserve the right to modify the Application or charge for their services at any time and for any reason. The Service Provider assures you that any charges for the Application or its services will be clearly communicated to you.</p><br><p>The Application stores and processes personal data that you have provided to the Service Provider in order to provide the Service. It is your responsibility to maintain the security of your phone and access to the Application. The Service Provider strongly advise against jailbreaking or rooting your phone, which involves removing software restrictions and limitations imposed by the official operating system of your device. Such actions could expose your phone to malware, viruses, malicious programs, compromise your phone's security features, and may result in the Application not functioning correctly or at all.</p><br><p>Please be aware that the Service Provider does not assume responsibility for certain aspects. Some functions of the Application require an active internet connection, which can be Wi-Fi or provided by your mobile network provider. The Service Provider cannot be held responsible if the Application does not function at full capacity due to lack of access to Wi-Fi or if you have exhausted your data allowance.</p><br><p>If you are using the application outside of a Wi-Fi area, please be aware that your mobile network provider's agreement terms still apply. Consequently, you may incur charges from your mobile provider for data usage during the connection to the application, or other third-party charges. By using the application, you accept responsibility for any such charges, including roaming data charges if you use the application outside of your home territory (i.e., region or country) without disabling data roaming. If you are not the bill payer for the device on which you are using the application, they assume that you have obtained permission from the bill payer.</p><br><p>Similarly, the Service Provider cannot always assume responsibility for your usage of the application. For instance, it is your responsibility to ensure that your device remains charged. If your device runs out of battery and you are unable to access the Service, the Service Provider cannot be held responsible.</p><br><p>In terms of the Service Provider's responsibility for your use of the application, it is important to note that while they strive to ensure that it is updated and accurate at all times, they do rely on third parties to provide information to them so that they can make it available to you. The Service Provider accepts no liability for any loss, direct or indirect, that you experience as a result of relying entirely on this functionality of the application.</p><br><p>The Service Provider may wish to update the application at some point. The application is currently available as per the requirements for the operating system (and for any additional systems they decide to extend the availability of the application to) may change, and you will need to download the updates if you want to continue using the application. The Service Provider does not guarantee that it will always update the application so that it is relevant to you and/or compatible with the particular operating system version installed on your device. However, you agree to always accept updates to the application when offered to you. The Service Provider may also wish to cease providing the application and may terminate its use at any time without providing termination notice to you. Unless they inform you otherwise, upon any termination, (a) the rights and licenses granted to you in these terms will end; (b) you must cease using the application, and (if necessary) delete it from your device.</p><br><strong>Changes to These Terms and Conditions</strong><p>The Service Provider may periodically update their Terms and Conditions. Therefore, you are advised to review this page regularly for any changes. The Service Provider will notify you of any changes by posting the new Terms and Conditions on this page.</p><br><p>These terms and conditions are effective as of 2026-01-19</p><br><strong>Contact Us</strong><p>If you have any questions or suggestions about the Terms and Conditions, please do not hesitate to contact the Service Provider at <strong>paulocristo@me.com</strong>.</p>",
        };
      case "policy":
        return {
          title: "Privacy Policy",
          content: "<p>This privacy policy applies to the Travel View - Memories Tracker app (hereby referred to as \"Application\") for mobile devices that was created by Paulo Cristo (hereby referred to as \"Service Provider\") as a Freemium service. This service is intended for use \"AS IS\".</p><br><strong>What information does the Application obtain and how is it used?</strong><p>The Application does not obtain any information when you download and use it. Registration is not required to use the Application.</p><br><strong>Does the Application collect precise real time location information of the device?</strong><p>This Application does not collect precise information about the location of your mobile device.</p><br><strong>Do third parties see and/or have access to information obtained by the Application?</strong><p>Since the Application does not collect any information, no data is shared with third parties.</p><br><strong>What are my opt-out rights?</strong><p>You can stop all collection of information by the Application easily by uninstalling it. You may use the standard uninstall processes as may be available as part of your mobile device or via the mobile application marketplace or network.</p><br><strong>Children</strong><p>The Application is not used to knowingly solicit data from or market to children under the age of 13.</p><br><p>The Service Provider does not knowingly collect personally identifiable information from children. The Service Provider encourages all children to never submit any personally identifiable information through the Application and/or Services. The Service Provider encourage parents and legal guardians to monitor their children's Internet usage and to help enforce this Policy by instructing their children never to provide personally identifiable information through the Application and/or Services without their permission. If you have reason to believe that a child has provided personally identifiable information to the Service Provider through the Application and/or Services, please contact the Service Provider (<strong>paulocristo@me.com</strong>) so that they will be able to take the necessary actions. You must also be at least 16 years of age to consent to the processing of your personally identifiable information in your country (in some countries we may allow your parent or guardian to do so on your behalf).</p><br><strong>Security</strong><p>The Service Provider is concerned about safeguarding the confidentiality of your information. However, since the Application does not collect any information, there is no risk of your data being accessed by unauthorized individuals.</p><br><strong>Changes</strong><p>This Privacy Policy may be updated from time to time for any reason. The Service Provider will notify you of any changes to their Privacy Policy by updating this page with the new Privacy Policy. You are advised to consult this Privacy Policy regularly for any changes, as continued use is deemed approval of all changes.</p><br><p>This privacy policy is effective as of 2026-01-19</p><br><strong>Your Consent</strong><p>By using the Application, you are consenting to the processing of your information as set forth in this Privacy Policy now and as amended by the Service Provider.</p><br><strong>Contact Us</strong><p>If you have any questions regarding privacy while using the Application, or have questions about the practices, please contact the Service Provider via email at <strong>paulocristo@me.com</strong>.</p>",
        };
      default:
        return { title: "", content: "" };
    }
  };

  const { title, content } = getLegalContent();

  const htmlTagStyles = {
    p: { color: isLight ? "#334155" : "#cbd5e1", fontSize: 16, lineHeight: 24, marginVertical: 8 },
    strong: { color: isLight ? "#0f172a" : "#f1f5f9", fontWeight: "bold" as const },
    br: { marginVertical: 4 },
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className={cn("flex-1", isLight ? "bg-slate-100" : "bg-slate-950")} style={{ paddingTop: insets.top }}>
        <LinearGradient
          colors={isLight ? ["#f8fafc", "#f1f5f9", "#e2e8f0"] : ["#312e81", "#1e1b4b", "#020617"]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          pointerEvents="none"
        />
        <View className="flex-1">
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-4">
            <Text className={cn("text-xl font-bold", isLight ? "text-slate-900" : "text-white")}>{title}</Text>
            <Pressable
              onPress={onClose}
              className={cn("w-10 h-10 rounded-full items-center justify-center active:opacity-70", isLight ? "bg-slate-700" : "bg-white/10")}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color="#fff" />
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={true}>
            <RenderHTML
              contentWidth={width - 48}
              source={{ html: content }}
              tagsStyles={htmlTagStyles}
            />
            <View className="h-6" />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const setPremium = usePurchasesStore((s) => s.setPremium);

  const [isLoading, setIsLoading] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [lifetimePkg, setLifetimePkg] = useState<PurchasesPackage | undefined>();

  const [legalModalType, setLegalModalType] = useState<LegalModalType>(null);
  useEffect(() => {
    const load = async () => {
      if (!isPurchasesEnabled()) return;
      setIsLoading(true);
      const result = await getOfferings();
      if (result.ok && result.data.current) {
        const pkg = result.data.current.availablePackages.find(
          (p) => p.identifier === '$rc_lifetime',
        );
        setLifetimePkg(pkg);
      }
      setIsLoading(false);
    };
    load();
  }, []);

  const handleClose = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (navigation.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handlePurchase = async () => {
    if (!lifetimePkg) return;
    setIsPurchasing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await purchasePackage(lifetimePkg);
    if (result.ok) {
      if (result.data.entitlements.active['premium']) {
        setPremium(true);
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (navigation.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setIsPurchasing(false);
  };

  const handleRestore = async () => {
    setIsPurchasing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const result = await restorePurchases();
    if (result.ok) {
      if (result.data.entitlements.active['premium']) {
        setPremium(true);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (navigation.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)');
        }
      }
    }
    setIsPurchasing(false);
  };

  const priceString = lifetimePkg?.product.priceString ?? '$4.99';

  return (
    <View style={styles.container}>
      {/* Hero image */}
      <Animated.View entering={FadeIn.duration(600)} style={StyleSheet.absoluteFill}>
        <Image
          source={{ uri: HERO_IMAGE }}
          style={{ width: '100%', height: 340 }}
          contentFit="cover"
        />
      </Animated.View>

      {/* Top gradient: keep image partially visible */}
      <LinearGradient
        colors={['rgba(6,9,20,0.25)', 'rgba(6,9,20,0.6)', '#060914']}
        locations={[0, 0.55, 1]}
        style={[StyleSheet.absoluteFill, { height: 380 }]}
        pointerEvents="none"
      />
      {/* Full background below hero */}
      <View style={[StyleSheet.absoluteFill, { top: 340, backgroundColor: '#060914' }]} />

      {/* Close button */}
      <Pressable
        onPress={handleClose}
        style={[styles.closeBtn, { top: insets.top + 8 }]}
        hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
      >
        <X size={18} color="rgba(255,255,255,0.9)" />
      </Pressable>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Spacer to let hero show */}
        <View style={{ height: insets.top + 56 }} />

        {/* Crown + headline */}
        <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.heroContent}>
          <View style={styles.crownCircle}>
            <Crown size={28} color="#F59E0B" />
          </View>
          <Text style={styles.headline}>Unlock Premium</Text>
          <Text style={styles.subheadline}>
            Your entire travel history,{'\n'}beautifully organized
          </Text>
        </Animated.View>

        {/* Feature grid */}
        <Animated.View entering={FadeInDown.delay(220)} style={styles.gridWrapper}>
          <View style={styles.grid}>
            {FEATURES.map((f, i) => (
              <Animated.View
                key={f.title}
                entering={FadeInDown.delay(260 + i * 55).springify()}
                style={styles.featureCard}
              >
                {f.badge && (
                  <View style={styles.featureBadge}>
                    <Text style={styles.featureBadgeText}>{f.badge}</Text>
                  </View>
                )}
                <View style={[styles.featureIconBg, { backgroundColor: f.color + '22' }]}>
                  <f.icon size={20} color={f.color} />
                </View>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDescription}>{f.description}</Text>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* One-time purchase card */}
        <Animated.View entering={FadeInDown.delay(480)} style={styles.onetimeCard}>
          <View style={styles.onetimeHeader}>
            <Sparkles size={15} color="#F59E0B" />
            <Text style={styles.onetimeLabel}>ONE-TIME PURCHASE</Text>
          </View>
          {[
            'Pay once, yours forever',
            'All current & future premium features',
            'No subscriptions, no renewals',
          ].map((item) => (
            <View key={item} style={styles.onetimeRow}>
              <CheckCircle2 size={15} color="#F59E0B" />
              <Text style={styles.onetimeText}>{item}</Text>
            </View>
          ))}
        </Animated.View>

        {/* CTA */}
        <Animated.View entering={FadeInDown.delay(580)} style={styles.ctaWrapper}>
          {isLoading ? (
            <ActivityIndicator color="#F59E0B" style={{ marginVertical: 20 }} />
          ) : (
            <Pressable
              onPress={handlePurchase}
              disabled={isPurchasing}
              style={({ pressed }) => [styles.ctaButton, { opacity: pressed || isPurchasing ? 0.82 : 1 }]}
            >
              <LinearGradient
                colors={['#FBBF24', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}
              >
                {isPurchasing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.ctaTitle}>Get Lifetime Access</Text>
                    <Text style={styles.ctaPrice}>{priceString} — one-time payment</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          )}

          <Pressable
            onPress={handleRestore}
            disabled={isPurchasing}
            style={styles.restoreBtn}
          >
            <Text style={styles.restoreText}>Restore Purchases</Text>
          </Pressable>

          <Text style={styles.legalText}>
            Payment processed by Apple. Cancel anytime before the period ends.
          </Text>
          {/* Legal Links */}
              <View className="flex-row justify-center gap-4 pb-2">
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setLegalModalType("terms");
                  }}
                  className="active:opacity-70"
                >
                  <Text className="text-slate-400 text-xs underline">
                    Terms & Conditions
                  </Text>
                </Pressable>
                <Text className="text-slate-500 text-xs">•</Text>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setLegalModalType("policy");
                  }}
                  className="active:opacity-70"
                >
                  <Text className="text-slate-400 text-xs underline">
                    Privacy Policy
                  </Text>
                </Pressable>
              </View>
        </Animated.View>
      </ScrollView>
      {/* Legal Modal */}
      <LegalModal
        visible={legalModalType !== null}
        type={legalModalType}
        onClose={() => setLegalModalType(null)}
        isLight={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060914',
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 20,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 120,
    paddingBottom: 32,
  },
  crownCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  headline: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
    textAlign: 'center',
    marginBottom: 10,
  },
  subheadline: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 16,
    textAlign: 'center',
  },
  gridWrapper: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  featureCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  featureBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  featureBadgeText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  featureIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 5,
  },
  featureDescription: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
  },
  onetimeCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: 'rgba(245,158,11,0.07)',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.22)',
  },
  onetimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  onetimeLabel: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  onetimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  onetimeText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
  },
  ctaWrapper: {
    paddingHorizontal: 20,
  },
  ctaButton: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  ctaGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: 18,
  },
  ctaTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  ctaPrice: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    marginTop: 3,
  },
  restoreBtn: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  restoreText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 13,
  },
  legalText: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 11,
    textAlign: 'center',
  },
});
