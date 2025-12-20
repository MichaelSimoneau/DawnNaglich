import React, { useRef, useState, useEffect } from 'react';
import { Linking, View, Text, StyleSheet } from 'react-native';
import LocationMap from './LocationMap';

interface ClientLandingProps {
  onBookNow: () => void;
  onLoginClick: () => void;
  isLoggedIn: boolean;
  onNavigateToPage: (index: number) => void;
  activePageIndex: number;
}

export const PAGES = [
  {
    id: 'about',
    label: 'About',
    title: 'Dawn Naglich',
    subtitle: 'RECLAIM MOTION.',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=2400',
    description: 'Elite Muscle Activation & Functional Realignment for high-performance recovery and neurological muscle firing.',
    badge: 'Wellness Specialist'
  },
  {
    id: 'focus',
    label: 'Focus',
    title: 'Focus',
    subtitle: 'THE SANCTUARY.',
    image: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&q=80&w=2400',
    description: 'Operating out of her private gym facility, Dawn focuses on loosening tension and strengthening alignment.',
    badge: 'Private Practice'
  },
  {
    id: 'experience',
    label: 'Experience',
    title: 'Past Experience',
    subtitle: 'CLINICAL DEPTH.',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&q=80&w=2400',
    description: 'Decades of experience as a massage and physical therapist in leading hospital environments.',
    badge: 'Veteran PT'
  },
  {
    id: 'contact',
    label: 'Contact',
    title: 'Connect',
    subtitle: 'START HEALING.',
    image: '', // Map used instead
    description: 'Ready to realign? Visit our facility in Chesterland for a professional assessment and realignment.',
    badge: 'Join the Community'
  }
];

const ClientLanding: React.FC<ClientLandingProps> = ({ 
  onBookNow, 
  onLoginClick, 
  isLoggedIn, 
  onNavigateToPage,
  activePageIndex 
}) => {
  const horizontalScrollRef = useRef<HTMLDivElement>(null);
  const [isMapActive, setIsMapActive] = useState(false);

  const handleHorizontalScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const width = e.currentTarget.offsetWidth;
    if (width === 0) return;
    const index = Math.round(scrollLeft / width);
    if (index !== activePageIndex && index >= 0 && index < PAGES.length) {
      onNavigateToPage(index);
    }
  };

  useEffect(() => {
    if (horizontalScrollRef.current) {
      horizontalScrollRef.current.scrollTo({
        left: activePageIndex * horizontalScrollRef.current.offsetWidth,
        behavior: 'smooth'
      });
    }
    if (activePageIndex !== 3) setIsMapActive(false);
  }, [activePageIndex]);

  return (
    <div className="relative w-full h-full bg-emerald-950 overflow-hidden">
      {/* Horizontal Carousel */}
      <div 
        ref={horizontalScrollRef}
        onScroll={handleHorizontalScroll}
        className="flex w-full h-full overflow-x-scroll snap-x snap-mandatory no-scrollbar"
        style={{ scrollBehavior: 'smooth' }}
      >
        {PAGES.map((page, idx) => (
          <section 
            key={page.id} 
            className="flex-shrink-0 w-screen h-full relative snap-center overflow-hidden"
          >
            {/* Background */}
            <div className="absolute inset-0 z-0">
              {idx === 3 ? (
                <LocationMap isInteractive={isMapActive} />
              ) : (
                <>
                  <img 
                    src={page.image} 
                    alt={page.title} 
                    className={`w-full h-full object-cover transition-all duration-1000 ease-in-out ${
                      activePageIndex === idx ? 'scale-100 opacity-100 blur-0' : 'scale-110 opacity-0 blur-md'
                    }`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/80 via-emerald-950/40 to-emerald-950/90" />
                </>
              )}
            </div>

            {/* Content */}
            <div className={`relative z-10 w-full h-full flex flex-col items-center justify-center text-center px-6 transition-opacity duration-500 ${isMapActive ? 'opacity-0' : 'opacity-100'}`}>
              <div className={`transition-all duration-1000 transform ${activePageIndex === idx ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
                <span className="inline-block py-2 px-5 bg-emerald-400/10 border border-emerald-400/20 rounded-full text-emerald-400 text-[9px] font-black uppercase tracking-[0.4em] mb-4">
                  {page.badge}
                </span>
                <h2 className="text-4xl md:text-8xl font-black text-white leading-none tracking-tighter mb-6 italic uppercase">
                  {page.subtitle}
                </h2>
                <p className="max-w-xl mx-auto text-white/70 text-sm md:text-lg font-light leading-relaxed mb-8">
                  {page.description}
                </p>

                {idx === 3 ? (
                  <button 
                    onClick={() => setIsMapActive(true)}
                    className="px-8 py-4 bg-emerald-900/40 border border-emerald-400/30 text-emerald-50 rounded-2xl font-black text-sm hover:bg-emerald-400 hover:text-emerald-950 transition-all backdrop-blur-xl"
                  >
                    Explore Facility
                  </button>
                ) : (
                  <button 
                    onClick={onBookNow}
                    className="px-10 py-5 bg-emerald-400 text-emerald-950 rounded-2xl font-black text-sm shadow-2xl hover:bg-white transition-all active:scale-95"
                  >
                    View Available Times
                  </button>
                )}
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* Page Indicators */}
      <div className={`absolute bottom-24 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-6 py-3 rounded-full bg-emerald-950/40 backdrop-blur-xl border border-emerald-500/10 transition-opacity ${isMapActive ? 'opacity-0' : 'opacity-100'}`}>
        {PAGES.map((_, dotIdx) => (
          <button
            key={dotIdx}
            onClick={() => onNavigateToPage(dotIdx)}
            className={`h-2 rounded-full transition-all duration-500 ${activePageIndex === dotIdx ? 'w-10 bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'w-2 bg-emerald-400/20'}`}
          />
        ))}
      </div>

      {/* Vertical Hint Button */}
      <button 
        className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1 transition-opacity ${isMapActive ? 'opacity-0' : 'opacity-100'}`}
        onClick={onBookNow}
      >
        <span className="text-[8px] font-black text-emerald-400/30 uppercase tracking-[0.5em]">Reserve Now</span>
        <div className="animate-bounce">
          <i className="fa-solid fa-chevron-down text-emerald-400/30"></i>
        </div>
      </button>

      {/* Exit Map */}
      {isMapActive && (
        <button 
          onClick={() => setIsMapActive(false)}
          className="absolute top-28 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 bg-emerald-950 text-emerald-50 rounded-full font-black text-[10px] uppercase tracking-widest border border-emerald-500/50"
        >
          Exit Exploration
        </button>
      )}
    </div>
  );
};

export default ClientLanding;