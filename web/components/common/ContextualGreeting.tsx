"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, ThermometerSun, Snowflake } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContextualInfo {
  greeting: string;
  weatherSuggestion: string;
  isWeekend: boolean;
  timeContext: string;
  temperature: number;
  isHot: boolean;
  isCold: boolean;
  timeGreeting?: string; // Optional for more specific time greetings
}

interface ContextualGreetingProps {
  contextualInfo: ContextualInfo;
  className?: string;
  variant?: 'default' | 'compact' | 'minimal';
  showWeather?: boolean;
  showTimeInfo?: boolean;
}

export function ContextualGreeting({
  contextualInfo,
  className,
  variant = 'default',
  showWeather = true,
  showTimeInfo = true,
}: ContextualGreetingProps) {
  const variants = {
    default: {
      container: "px-4 py-6",
      title: "text-2xl font-bold",
      description: "text-white/80 max-w-md mx-auto",
      info: "flex items-center justify-center space-x-4 text-sm text-white/70"
    },
    compact: {
      container: "px-3 py-4",
      title: "text-xl font-bold",
      description: "text-white/80 max-w-sm mx-auto text-sm",
      info: "flex items-center justify-center space-x-3 text-xs text-white/70"
    },
    minimal: {
      container: "px-2 py-3",
      title: "text-lg font-semibold",
      description: "text-white/80 max-w-xs mx-auto text-sm",
      info: "flex items-center justify-center space-x-2 text-xs text-white/60"
    }
  };

  const currentVariant = variants[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("mb-6", className)}
    >
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-2xl" />
        <div className={cn("relative text-center", currentVariant.container)}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <h1 className={cn(
              currentVariant.title,
              "bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent"
            )}>
              {contextualInfo.greeting}
            </h1>
            
            <p className={currentVariant.description}>
              {contextualInfo.weatherSuggestion}
              {contextualInfo.isWeekend && " • Perfect weekend vibes"}
            </p>
            
            {(showWeather || showTimeInfo) && (
              <div className={currentVariant.info}>
                {showTimeInfo && (
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{contextualInfo.timeContext}</span>
                  </div>
                )}
                
                {showWeather && (
                  <div className="flex items-center space-x-1">
                    {contextualInfo.isHot ? 
                      <ThermometerSun className="h-4 w-4" /> : 
                      <Snowflake className="h-4 w-4" />
                    }
                    <span>{contextualInfo.temperature}°C</span>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

// Helper function to generate contextual information
export function generateContextualInfo(
  restaurantName?: string,
  userLocale: string = 'en'
): ContextualInfo {
  const now = new Date();
  const hour = now.getHours();
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;
  const temperature = Math.floor(Math.random() * 30) + 5; // Mock temperature 5-35°C
  const isHot = temperature > 25;
  const isCold = temperature < 15;

  // Time-based greetings with localization support
  const greetings = {
    en: {
      morning: `Good morning! Welcome to ${restaurantName || 'our restaurant'}`,
      afternoon: `Good afternoon! Ready for a delicious meal?`,
      evening: `Good evening! Perfect time for dinner`,
      night: `Late night cravings? We've got you covered`
    },
    ja: {
      morning: `おはようございます！${restaurantName || 'レストラン'}へようこそ`,
      afternoon: `こんにちは！美味しいお食事はいかがですか？`,
      evening: `こんばんは！ディナーにぴったりの時間ですね`,
      night: `夜食をお探しですか？お任せください`
    },
    vi: {
      morning: `Chào buổi sáng! Chào mừng đến với ${restaurantName || 'nhà hàng'}`,
      afternoon: `Chào buổi chiều! Sẵn sàng cho bữa ăn ngon?`,
      evening: `Chào buổi tối! Thời gian hoàn hảo cho bữa tối`,
      night: `Đói đêm? Chúng tôi sẽ lo cho bạn`
    }
  };

  const currentGreetings = greetings[userLocale as keyof typeof greetings] || greetings.en;

  let greeting: string;
  let timeContext: string;
  
  if (hour >= 5 && hour < 12) {
    greeting = currentGreetings.morning;
    timeContext = userLocale === 'ja' ? '朝の時間' : userLocale === 'vi' ? 'Buổi sáng' : 'Morning';
  } else if (hour >= 12 && hour < 17) {
    greeting = currentGreetings.afternoon;
    timeContext = userLocale === 'ja' ? '昼の時間' : userLocale === 'vi' ? 'Buổi trưa' : 'Afternoon';
  } else if (hour >= 17 && hour < 22) {
    greeting = currentGreetings.evening;
    timeContext = userLocale === 'ja' ? '夕方の時間' : userLocale === 'vi' ? 'Buổi tối' : 'Evening';
  } else {
    greeting = currentGreetings.night;
    timeContext = userLocale === 'ja' ? '夜の時間' : userLocale === 'vi' ? 'Đêm muộn' : 'Late Night';
  }

  let timeGreeting = "";
    if (hour >= 6 && hour < 11) {
      timeContext = "breakfast";
      timeGreeting = "Start your day right";
    } else if (hour >= 11 && hour < 15) {
      timeContext = "lunch";
      timeGreeting = "Perfect lunch time";
    } else if (hour >= 15 && hour < 17) {
      timeContext = "afternoon";
      timeGreeting = "Afternoon pick-me-up";
    } else if (hour >= 17 && hour < 22) {
      timeContext = "dinner";
      timeGreeting = "Dinner time delights";
    } else {
      timeContext = "late";
      timeGreeting = "Late night cravings";
    }

  // Weather-based suggestions
  const weatherSuggestions = {
    en: {
      hot: "Perfect weather for cold drinks and fresh dishes",
      cold: "Warm comfort food sounds perfect right now",
      weekend: "Great day to try something special"
    },
    ja: {
      hot: "冷たい飲み物と新鮮な料理にぴったりの天気ですね",
      cold: "温かい料理が恋しい天気ですね",
      weekend: "特別な料理を試すのに最適な日です"
    },
    vi: {
      hot: "Thời tiết tuyệt vời cho đồ uống mát và món tươi",
      cold: "Món ăn ấm áp nghe có vẻ hoàn hảo",
      weekend: "Ngày tuyệt vời để thử món đặc biệt"
    }
  };

  const currentSuggestions = weatherSuggestions[userLocale as keyof typeof weatherSuggestions] || weatherSuggestions.en;
  
  let weatherSuggestion: string;
  if (isWeekend) {
    weatherSuggestion = currentSuggestions.weekend;
  } else if (isHot) {
    weatherSuggestion = currentSuggestions.hot;
  } else {
    weatherSuggestion = currentSuggestions.cold;
  }

  return {
    greeting,
    weatherSuggestion,
    isWeekend,
    timeContext,
    temperature,
    isHot,
	isCold,
	timeGreeting
  };
}
