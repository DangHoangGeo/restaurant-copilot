"use client";
import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, PlayCircle } from 'lucide-react';
import { Button } from './Button';

export const HeroSection = () => {
  const t = useTranslations('landing');
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const aiFeatures = [
    { 
      title: "AI Menu Analysis", 
      description: "Smart recommendations based on customer preferences",
      icon: "🧠",
      color: "from-blue-500 to-purple-600"
    },
    { 
      title: "Real-time Ordering", 
      description: "Instant order processing with AI optimization",
      icon: "⚡",
      color: "from-green-500 to-blue-500"
    },
    { 
      title: "Smart Analytics", 
      description: "Predictive insights for better business decisions",
      icon: "📊",
      color: "from-purple-500 to-pink-500"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentFeature((prev) => (prev + 1) % aiFeatures.length);
        setIsAnimating(false);
      }, 200);
    }, 3000);

    return () => clearInterval(interval);
  }, [aiFeatures.length]);

  return (
    <section className="py-16 sm:py-20 lg:py-28 bg-gradient-to-br from-slate-50 to-indigo-100 dark:from-slate-900 dark:to-indigo-900/30 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white !leading-tight">
              {t('hero.headline_part1')} <span className="text-[--brand-color-landing]">{t('hero.headline_part2')}</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-xl mx-auto lg:mx-0">
              {t('hero.subheadline')}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button 
                href="/signup" 
                variant="primary" 
                size="xl" 
                iconRight={ArrowRight}
              >
                {t('hero.cta.signup')}
              </Button>
              <Button 
                href="/demo" 
                variant="outline" 
                size="xl" 
                iconLeft={PlayCircle}
              >
                {t('hero.cta.demo')}
              </Button>
            </div>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{t('hero.cta.subtext')}</p>
          </div>
          
          {/* AI System Illustration */}
          <div className="relative">
            {/* Main SVG Logo with Animation */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <svg 
                  width="300" 
                  height="96" 
                  viewBox="0 0 300 96" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  className="animate-pulse"
                >
                  <defs>
                    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{stopColor:"#00B5D9", stopOpacity:1}} />
                      <stop offset="100%" style={{stopColor:"#0047AB", stopOpacity:1}} />
                    </linearGradient>
                  </defs>
                  <g transform="translate(0, 0)">
                    <circle 
                      cx="36" 
                      cy="48" 
                      r="30" 
                      fill="url(#grad1)" 
                      opacity="0.8"
                      className="animate-ping"
                      style={{animationDuration: '2s'}}
                    />
                    <circle 
                      cx="54" 
                      cy="48" 
                      r="30" 
                      fill="url(#grad1)"
                      className="animate-bounce"
                      style={{animationDuration: '3s'}}
                    />
                  </g>
                  <text 
                    x="96" 
                    y="60" 
                    fontFamily="Arial, sans-serif" 
                    fontSize="36" 
                    fill="currentColor" 
                    fontWeight="600"
                    className="text-slate-800 dark:text-white"
                  >
                    coorder.ai
                  </text>
                </svg>
                
                {/* Floating AI particles */}
                <div className="absolute -top-4 -left-4 w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                <div className="absolute -top-2 -right-6 w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.5s'}}></div>
                <div className="absolute -bottom-3 -left-6 w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '1s'}}></div>
                <div className="absolute -bottom-4 -right-4 w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '1.5s'}}></div>
              </div>
            </div>

            {/* Interactive AI Features Display */}
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-slate-200/50 dark:border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">AI System Active</h3>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                </div>
              </div>

              {/* Animated Feature Card */}
              <div 
                className={`transition-all duration-500 transform ${
                  isAnimating ? 'scale-95 opacity-50' : 'scale-100 opacity-100'
                }`}
              >
                <div className={`p-4 rounded-xl bg-gradient-to-r ${aiFeatures[currentFeature].color} text-white mb-4`}>
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{aiFeatures[currentFeature].icon}</span>
                    <div>
                      <h4 className="font-semibold">{aiFeatures[currentFeature].title}</h4>
                      <p className="text-sm opacity-90">{aiFeatures[currentFeature].description}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress indicators */}
              <div className="flex space-x-2 justify-center">
                {aiFeatures.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentFeature(index)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === currentFeature 
                        ? 'bg-[--brand-color-landing] w-6' 
                        : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  />
                ))}
              </div>

              {/* Simulated data stream */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>Orders processed today</span>
                  <span className="font-mono text-green-600">1,247</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>AI recommendations accepted</span>
                  <span className="font-mono text-blue-600">94%</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>Average order time</span>
                  <span className="font-mono text-purple-600">2.3min</span>
                </div>
              </div>

              {/* Animated progress bars */}
              <div className="mt-3 space-y-2">
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1">
                  <div className="bg-green-500 h-1 rounded-full animate-pulse" style={{width: '87%'}}></div>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1">
                  <div className="bg-blue-500 h-1 rounded-full animate-pulse" style={{width: '94%', animationDelay: '0.5s'}}></div>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1">
                  <div className="bg-purple-500 h-1 rounded-full animate-pulse" style={{width: '76%', animationDelay: '1s'}}></div>
                </div>
              </div>
            </div>

            {/* Background decorative elements */}
            <div className="absolute -bottom-4 -right-4 -z-10 w-32 h-32 bg-[--brand-color-landing]/20 rounded-full blur-2xl animate-pulse"></div>
            <div className="absolute -top-8 -left-8 -z-10 w-40 h-40 bg-pink-500/10 rounded-full blur-2xl animate-pulse" style={{animationDelay: '1s'}}></div>
            
            {/* Floating connection lines */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -z-10">
              <svg width="400" height="300" className="opacity-20">
                <line x1="50" y1="50" x2="350" y2="100" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" className="animate-pulse"/>
                <line x1="100" y1="200" x2="300" y2="50" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" className="animate-pulse" style={{animationDelay: '0.5s'}}/>
                <line x1="50" y1="250" x2="350" y2="200" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" className="animate-pulse" style={{animationDelay: '1s'}}/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
