import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  useWindowDimensions,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation, // Keep Extrapolation
  useAnimatedScrollHandler,
} from "react-native-reanimated";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import LocationMap from "./LocationMap";
import LandingPage from "./LandingPage";
import Logo from "./Logo";
import { PAGES } from "../content";
import { useRouter } from "expo-router";

interface ClientLandingProps {
  onBookNow: () => void;
  onLoginClick: () => void;
  isLoggedIn: boolean;
  onNavigateToPage: (index: number) => void;
  activePageIndex: number;
}

const ClientLanding: React.FC<ClientLandingProps> = ({
  onBookNow,
  onLoginClick,
  isLoggedIn,
  onNavigateToPage,
  activePageIndex,
}) => {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const [isMapActive, setIsMapActive] = useState(false);
  const scrollX = useSharedValue(activePageIndex);
  const scrollViewRef = useRef<Animated.ScrollView>(null);
  const isScrollingRef = useRef(false);

  const router = useRouter();

  useEffect(() => {
    scrollX.value = activePageIndex;
    const targetPos = activePageIndex * SCREEN_WIDTH;
    // Reset scrolling flag and scroll to exact position
    isScrollingRef.current = false;
    // Use requestAnimationFrame for smooth scroll
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({ x: targetPos, animated: false });
    });
    // Double-check position after a brief delay to ensure it's exact
    const timeoutId = setTimeout(() => {
      scrollViewRef.current?.scrollTo({ x: targetPos, animated: false });
    }, 100);
    if (activePageIndex !== 3) setIsMapActive(false);
    return () => clearTimeout(timeoutId);
  }, [activePageIndex, SCREEN_WIDTH]);

  // Update SEO meta tags dynamically for web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const currentPage = PAGES[activePageIndex] || PAGES[0];
      const baseUrl = "https://dawn-naglich.web.app";
      const pageUrl = `${baseUrl}/#${currentPage.id}`;
      const pageImage = currentPage.image || PAGES[0].image;
      const pageImageUrl = pageImage ? `${pageImage.split('?')[0]}?auto=format&fit=crop&q=80&w=1200` : `${baseUrl}/og-image.jpg`;

      // SEO-optimized title with "Dawn Naglich" prominently featured
      const seoTitle = `Dawn Naglich - ${currentPage.subtitle} | ${currentPage.label} | Elite Wellness & Functional Realignment`;
      const seoDescription = `${currentPage.description} Experience Dawn Naglich's expertise in ${currentPage.label.toLowerCase()} - Elite Muscle Activation & Functional Realignment in Solon.`;

      // Update document title
      document.title = seoTitle;

      // Helper function to set or update meta tag
      const setMetaTag = (attribute: string, content: string, isProperty = false) => {
        const attr = isProperty ? 'property' : 'name';
        let meta = document.querySelector(`meta[${attr}="${attribute}"]`) as HTMLMetaElement;
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute(attr, attribute);
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
      };

      const setScriptTag = (contentOrSrc: string, async: boolean = false) => {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.async = async;
        if (contentOrSrc.startsWith('http')) {
          script.src = contentOrSrc;
        } else {
          script.textContent = contentOrSrc;
        }
        document.head.appendChild(script);
      };

      // Helper function to set or update link tag
      const setLinkTag = (rel: string, href: string) => {
        let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
        if (!link) {
          link = document.createElement('link');
          link.setAttribute('rel', rel);
          document.head.appendChild(link);
        }
        link.setAttribute('href', href);
      };

      // Primary SEO Meta Tags
      setMetaTag('description', seoDescription);
      setMetaTag('keywords', `Dawn Naglich, ${currentPage.label}, Muscle Activation, Functional Realignment, Wellness, Physical Therapy, Solon, Recovery, ${currentPage.badge}, Dawn Naglich ${currentPage.label}`);
      setMetaTag('author', 'Dawn Naglich');
      setMetaTag('robots', 'index, follow');
      setLinkTag('canonical', pageUrl);

      // Open Graph / Facebook Social Sharing
      setMetaTag('og:type', 'website', true);
      setMetaTag('og:url', pageUrl, true);
      setMetaTag('og:title', seoTitle, true);
      setMetaTag('og:description', seoDescription, true);
      setMetaTag('og:image', pageImageUrl, true);
      setMetaTag('og:image:width', '1200', true);
      setMetaTag('og:image:height', '630', true);
      setMetaTag('og:image:alt', `Dawn Naglich - ${currentPage.subtitle}`, true);
      setMetaTag('og:site_name', 'Dawn Naglich Wellness', true);
      setMetaTag('og:locale', 'en_US', true);

      // Twitter Card Social Sharing
      setMetaTag('twitter:card', 'summary_large_image');
      setMetaTag('twitter:title', seoTitle);
      setMetaTag('twitter:description', seoDescription);
      setMetaTag('twitter:image', pageImageUrl);
      setMetaTag('twitter:image:alt', `Dawn Naglich - ${currentPage.subtitle}`);
      setMetaTag('twitter:site', '@dawn_naglich');
      setMetaTag('twitter:creator', '@dawn_naglich');

      // Additional SEO Meta Tags
      setMetaTag('theme-color', '#10B981');
      setMetaTag('apple-mobile-web-app-title', 'Dawn Naglich');
      setMetaTag('application-name', 'Dawn Naglich Wellness');


      // Google Tag Manager
      /**
       * <!-- Google tag (gtag.js) -->
       * <script async src="https://www.googletagmanager.com/gtag/js?id=G-WRDENVG2TE"></script>
       * <script>
       *   window.dataLayer = window.dataLayer || [];
       *   function gtag(){dataLayer.push(arguments);}
       *   gtag('js', new Date());* 
       *   gtag('config', 'G-WRDENVG2TE');
       * </script>
      **/
      setScriptTag('https://www.googletagmanager.com/gtag/js?id=G-WRDENVG2TE');
      setScriptTag(`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-WRDENVG2TE');
      `);

      // Update URL hash for deep linking
      try {
        const targetHash = `#${currentPage.id}`;
        if (window.location.hash !== targetHash) {
          window.history.replaceState(null, "", targetHash);
        }
      } catch {
        // Silently fail if history API is not available
      }
    }
  }, [activePageIndex]);

  const snapToExactPosition = (index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, PAGES.length - 1));
    const expectedOffset = clampedIndex * SCREEN_WIDTH;
    scrollViewRef.current?.scrollTo({ x: expectedOffset, animated: false });
    onNavigateToPage(clampedIndex);
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 100);
  };

  const handleScrollEnd = (index: number) => {
    onNavigateToPage(index);
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 100);
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x / SCREEN_WIDTH;
    },
    onBeginDrag: () => {
      isScrollingRef.current = true;
    },
  });

  const handleMomentumScrollEnd = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const currentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(currentOffset / SCREEN_WIDTH);
    const clampedIndex = Math.max(0, Math.min(index, PAGES.length - 1));
    const expectedOffset = clampedIndex * SCREEN_WIDTH;

    // Always snap to exact position to prevent stuttering
    if (Math.abs(currentOffset - expectedOffset) > 0.5) {
      snapToExactPosition(clampedIndex);
    } else {
      handleScrollEnd(clampedIndex);
    }
  };

  const handleScrollEndDrag = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const currentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(currentOffset / SCREEN_WIDTH);
    const clampedIndex = Math.max(0, Math.min(index, PAGES.length - 1));
    const expectedOffset = clampedIndex * SCREEN_WIDTH;

    // Snap immediately on drag end if not at exact position
    if (Math.abs(currentOffset - expectedOffset) > 0.5) {
      snapToExactPosition(clampedIndex);
    }
  };

  const handleLogout = () => {
    if (auth) signOut(auth).catch((error) => {
      console.error("Error signing out:", error);
      router.push("/");
    });
  };

  const bottomElementsStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        scrollX.value,
        [2.5, 3],
        [1, 0],
        Extrapolation.CLAMP,
      ),
      pointerEvents: scrollX.value > 2.8 ? "none" : "auto",
    };
  });

  return (
    <View style={styles.container}>
      {/* Background Map - Always Rendered */}
      <View style={StyleSheet.absoluteFill} pointerEvents={isMapActive ? "auto" : "none"}>
        <LocationMap isInteractive={isMapActive} />
      </View>

      <LandingPage progress={scrollX} isMapActive={isMapActive} />

      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
        decelerationRate={0.9}
        snapToInterval={SCREEN_WIDTH}
        snapToAlignment="start"
        disableIntervalMomentum={false}
        bounces={false}
        scrollEnabled={!isMapActive}
        pointerEvents={isMapActive ? "none" : "auto"}
        style={[StyleSheet.absoluteFill, { zIndex: 15 }]}
        contentContainerStyle={{ width: SCREEN_WIDTH * PAGES.length }}
      >
        {PAGES.map((page, idx) => (
          <View key={page.id} style={{ width: SCREEN_WIDTH, height: "100%" }}>
            <ContentSlide
              page={page}
              index={idx}
              scrollX={scrollX}
              SCREEN_WIDTH={SCREEN_WIDTH}
              onBookNow={onBookNow}
              isMapActive={isMapActive}
              setIsMapActive={setIsMapActive}
            />
          </View>
        ))}
      </Animated.ScrollView>

      {/* Fixed Bottom Elements: Pagination Dots & Reserve Now */}
      <Animated.View
        style={[styles.bottomFixedContainer, bottomElementsStyle]}
        pointerEvents="box-none"
      >
        <View style={styles.paginationContainer}>
          {PAGES.map((_, i) => {
            const dotStyle = useAnimatedStyle(() => {
              const inputRange = [i - 1, i, i + 1];
              const width = interpolate(
                scrollX.value,
                inputRange,
                [6, 24, 6],
                Extrapolation.CLAMP,
              );
              const opacity = interpolate(
                scrollX.value,
                inputRange,
                [0.4, 1, 0.4],
                Extrapolation.CLAMP,
              );
              return {
                width,
                opacity,
              };
            });
            return (
              <Animated.View
                key={i}
                style={[styles.paginationDot, dotStyle]}
              />
            );
          })}
        </View>

        <TouchableOpacity style={styles.reserveButtonFixed} onPress={onBookNow}>
          <Text style={styles.reserveButtonText}>Reserve Now</Text>
          <Text style={styles.reserveIcon}>↓</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Top Bar with Indicators, Login/Logout - ALWAYS VISIBLE */}
      <View style={styles.topBar} pointerEvents="box-none">
        <View style={styles.topBarContent}>
          {/* Logo - LEFT SIDE */}
          <View style={styles.logoContainer} pointerEvents="auto">
            <Logo color="#10B981" size={Platform.OS === "web" ? 42 : 36} />
          </View>

          {/* Login/Logout Buttons - RIGHT SIDE */}
          <View style={styles.buttonContainer} pointerEvents="auto">
            {isLoggedIn && (
              <TouchableOpacity
                onPress={handleLogout}
                style={styles.logoutButton}
                activeOpacity={0.8}
              >
                <Text style={styles.logoutButtonText}>Logout</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={isLoggedIn ? onBookNow : onLoginClick}
              style={styles.loginButton}
              activeOpacity={0.8}
            >
              <Text style={styles.loginButtonText}>
                {isLoggedIn ? "Sessions" : "Login"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Exit Map Button */}
      {isMapActive && (
        <TouchableOpacity
          onPress={() => setIsMapActive(false)}
          style={styles.exitMapButton}
        >
          <Text style={styles.exitMapButtonText}>Exit Exploration</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

interface ContentSlideProps {
  page: (typeof PAGES)[0];
  index: number;
  scrollX: ReturnType<typeof useSharedValue<number>>;
  SCREEN_WIDTH: number;
  onBookNow: () => void;
  isMapActive: boolean;
  setIsMapActive: (active: boolean) => void;
}

const ContentSlide: React.FC<ContentSlideProps> = ({
  page,
  index,
  scrollX,
  SCREEN_WIDTH, // eslint-disable-line @typescript-eslint/no-unused-vars
  onBookNow,
  isMapActive,
  setIsMapActive,
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [index - 1, index, index + 1];

    // Simple fade in/out - NO translateX, NO vertical movement
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0, 1, 0],
      Extrapolation.CLAMP,
    );

    // Keep content visible over map until map is fully interactive
    const finalOpacity = isMapActive && index === 3 ? 0 : opacity;

    return {
      opacity: finalOpacity,
    };
  });

  return (
    <Animated.View style={[styles.slideContent, animatedStyle]}>
      <View style={styles.badgeContainer}>
        <Text style={styles.badgeText}>{page.badge}</Text>
      </View>
      <Text style={styles.subtitle}>{page.subtitle}</Text>
      <Text style={styles.description}>{page.description}</Text>

      {index === 3 ? (
        <TouchableOpacity
          onPress={() => setIsMapActive(true)}
          style={styles.exploreButton}
        >
          <Text style={styles.exploreButtonText}>Explore Facility</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={onBookNow} style={styles.bookButton}>
          <Text style={styles.bookButtonText}>View Available Times</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
    position: "relative",
  },
  topBar: ({
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 3000,
    elevation: 3000,
    // Subtle backdrop for better visibility
    backgroundColor: "rgba(2, 44, 34, 0.3)",
    ...Platform.select({
      web: {
        position: "sticky",
        top: 0,
      },
      default: {
        position: "absolute",
        top: 0,
      },
    }) as object,
  } as const),
  topBarContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 64,
    zIndex: 3002,
    elevation: 3002,
  },
  logoContainer: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "flex-start",
    minWidth: 60,
  },
  indicatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(2, 44, 34, 0.6)",
    borderWidth: 1.5,
    borderColor: "#10B981",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 16,
    // Ensure it's above other elements
    zIndex: 3001,
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(16, 185, 129, 0.4)",
  },
  indicatorActive: {
    width: 48,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10B981",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 10,
    ...Platform.select({
      web: {
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      },
      default: {},
    }),
  },
  buttonContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    zIndex: 3003,
    elevation: 3003,
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "rgba(239, 68, 68, 0.25)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.5)",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    ...Platform.select({
      web: {
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      },
      default: {},
    }),
  },
  logoutButtonText: {
    color: "#FCA5A5",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  loginButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#10B981",
    borderRadius: 8,
  },
  loginButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  slideContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 80,
    zIndex: 10,
  },
  badgeContainer: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
    borderRadius: 999,
    marginBottom: 16,
  },
  badgeText: {
    color: "#10B981",
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 48,
    fontWeight: "900",
    color: "#FFFFFF",
    lineHeight: 56,
    letterSpacing: -2,
    marginBottom: 24,
    textTransform: "uppercase",
    fontStyle: "italic",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.95)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 12,
  },
  description: {
    maxWidth: 600,
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.95)",
    fontWeight: "300",
    lineHeight: 24,
    marginBottom: 32,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  exploreButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: "rgba(2, 44, 34, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderRadius: 20,
  },
  exploreButtonText: {
    color: "#ECFDF5",
    fontSize: 14,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  bookButton: {
    paddingHorizontal: 40,
    paddingVertical: 20,
    backgroundColor: "#10B981",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
  },
  bookButtonText: {
    color: "#022c22",
    fontSize: 14,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  bottomFixedContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 24,
    zIndex: 20,
  },
  paginationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  paginationDot: {
    height: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 3,
  },
  reserveButtonFixed: {
    alignItems: "center",
    gap: 4,
  },
  reserveButtonText: {
    fontSize: 8,
    fontWeight: "900",
    color: "rgba(16, 185, 129, 0.7)",
    textTransform: "uppercase",
    letterSpacing: 8,
  },
  reserveIcon: {
    fontSize: 28,
    color: "rgba(16, 185, 129, 0.7)",
    fontWeight: "900",
  },
  exitMapButton: {
    position: "absolute",
    top: 112,
    alignSelf: "center",
    zIndex: 200,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#022c22",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.5)",
  },
  exitMapButtonText: {
    color: "#ECFDF5",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
});

export default ClientLanding;
