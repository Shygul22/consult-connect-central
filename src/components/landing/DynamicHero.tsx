
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface HeroVariation {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  is_active: boolean;
  sort_order: number;
}

export function DynamicHero() {
  const [heroTexts, setHeroTexts] = useState<HeroVariation[]>([]);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    fetchHeroVariations();
  }, []);

  useEffect(() => {
    if (heroTexts.length <= 1) return;

    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentTextIndex((prev) => (prev + 1) % heroTexts.length);
        setIsVisible(true);
      }, 500);
    }, 6000);

    return () => clearInterval(interval);
  }, [heroTexts.length]);

  const fetchHeroVariations = async () => {
    const { data, error } = await supabase
      .from('hero_variations')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (!error && data && data.length > 0) {
      setHeroTexts(data);
    } else {
      // Fallback to default content if no data or error
      setHeroTexts([{
        id: 'default',
        title: "Your Career, Clarity, and Confidence — Starts Here",
        subtitle: "Therapy for Goal-Getters, Dreamers, and Professionals on the Rise",
        description: "Feeling stuck, overwhelmed, or unsure about your next move? Whether you're facing burnout, decision fatigue, or struggling with time management — we're here to help.",
        is_active: true,
        sort_order: 1
      }]);
    }
  };

  const scrollToServices = () => {
    document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
  };

  const currentText = heroTexts[currentTextIndex] || heroTexts[0];

  if (!currentText) return null;

  return (
    <section className="relative w-full min-h-screen flex items-center justify-center text-center text-white overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 bg-black/60 z-10" />
      <img
        src="https://images.unsplash.com/photo-1649972904349-6e44c42644a7?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
        alt="ZenJourney - Your Career, Clarity, and Confidence Starts Here"
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      {/* Content Container */}
      <div className="relative z-20 container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <div 
          className={`mb-6 transition-all duration-500 ${
            isVisible ? 'animate-fade-in-up opacity-100' : 'opacity-0 translate-y-4'
          }`}
        >
          <span className="text-3xl md:text-4xl animate-gentle-bounce mb-4 block">🌟</span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight leading-tight">
            {currentText.title}
          </h1>
        </div>
        
        <div 
          className={`transition-all duration-500 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <p className="mt-6 max-w-4xl mx-auto text-lg sm:text-xl md:text-2xl lg:text-3xl text-gray-200 font-semibold leading-relaxed">
            {currentText.subtitle}
          </p>
          <p className="mt-4 max-w-3xl mx-auto text-base sm:text-lg md:text-xl text-gray-300 leading-relaxed">
            {currentText.description}
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4 sm:gap-6">
          <Button asChild size="lg" className="text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 bg-therapy-gradient hover:opacity-90 transform hover:scale-105 transition-all duration-300 shadow-therapy">
            <Link to="/client">📘 Book a Career Clarity Session</Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 bg-white/20 backdrop-blur-sm hover:bg-white/30 transform hover:scale-105 transition-all duration-300 border border-white/30">
            <Link to="/client">🔍 Free Assessment</Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="mt-12 md:mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8 max-w-3xl mx-auto text-center">
          <div className="transform hover:scale-110 transition-transform duration-300 p-4">
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold animate-calm-pulse mb-2">500+</div>
            <div className="text-sm sm:text-base text-gray-300">Professionals Guided</div>
          </div>
          <div className="transform hover:scale-110 transition-transform duration-300 p-4">
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">✅</div>
            <div className="text-sm sm:text-base text-gray-300">Online & Flexible</div>
          </div>
          <div className="transform hover:scale-110 transition-transform duration-300 p-4">
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">Free</div>
            <div className="text-sm sm:text-base text-gray-300">Career Assessment</div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="mt-12 md:mt-16 flex justify-center">
          <button
            onClick={scrollToServices}
            className="text-white/80 hover:text-white transition-colors animate-gentle-bounce p-2"
            aria-label="Scroll to services"
          >
            <ChevronDown className="h-6 w-6 sm:h-8 sm:w-8" />
          </button>
        </div>
      </div>
    </section>
  );
}
