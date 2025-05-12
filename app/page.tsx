"use client"

import { useEffect, useState, useRef } from "react";
// import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { CanvasRevealEffect } from "@/components/ui/canvas-reveal-effect";
import { AnimatePresence, motion } from "motion/react";

// Japanese character mapping for animation
const japaneseChars: Record<string, string> = {
  'A': 'ア', 'B': 'ブ', 'C': 'シ', 'D': 'ド', 'E': 'エ',
  'F': 'フ', 'G': 'グ', 'H': 'ハ', 'I': 'イ', 'J': 'ジ',
  'K': 'カ', 'L': 'ル', 'M': 'ム', 'N': 'ン', 'O': 'オ',
  'P': 'プ', 'Q': 'キ', 'R': 'ル', 'S': 'ス', 'T': 'ト',
  'U': 'ウ', 'V': 'ヴ', 'W': 'ウ', 'X': 'エックス', 'Y': 'ワイ',
  'Z': 'ゼット', ' ': ' ', 'a': 'ア', 'b': 'ブ', 'c': 'シ',
  'd': 'ド', 'e': 'エ', 'f': 'フ', 'g': 'グ', 'h': 'ハ',
  'i': 'イ', 'j': 'ジ', 'k': 'カ', 'l': 'ル', 'm': 'ム',
  'n': 'ン', 'o': 'オ', 'p': 'プ', 'q': 'キ', 'r': 'ル',
  's': 'ス', 't': 'ト', 'u': 'ウ', 'v': 'ヴ', 'w': 'ウ',
  'x': 'エックス', 'y': 'ワイ', 'z': 'ゼット'
};

export default function Home() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [titleText, setTitleText] = useState("Aries Week");
  const [isHoveringTitle, setIsHoveringTitle] = useState(false);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Effect for title animation when hovered
  useEffect(() => {
    if (!isHoveringTitle || !titleText) return;
    
    const originalText = "Aries Week";
    let animationComplete = false;
    const characters = originalText.split('');
    const totalCharacters = characters.length;
    
    // Calculate individual animation time to fit within 300ms total
    const characterAnimationTime = 300 / totalCharacters / 2; // divide by 2 for to/from transitions
    
    let currentAnimationIndex = 0;
    
    const runAnimation = () => {
      if (animationComplete || currentAnimationIndex >= totalCharacters) {
        setTitleText(originalText); // Reset to original at the end
        return;
      }
      
      // Skip animation for space character, but keep it in the result
      if (originalText[currentAnimationIndex] === ' ') {
        currentAnimationIndex++;
        runAnimation();
        return;
      }
      
      // Create a copy of the text array to modify
      const textArray = originalText.split('');
      
      // Change current character to Japanese
      if (textArray[currentAnimationIndex] && textArray[currentAnimationIndex] !== ' ') {
        const japaneseChar = japaneseChars[textArray[currentAnimationIndex]] || textArray[currentAnimationIndex];
        textArray[currentAnimationIndex] = japaneseChar;
        setTitleText(textArray.join(''));
        
        // Schedule next character change
        setTimeout(() => {
          if (animationComplete) return;
          
          // Move to next character
          currentAnimationIndex++;
          
          // Continue animation if not done
          if (currentAnimationIndex < totalCharacters) {
            runAnimation();
          } else {
            // Reset at the end
            setTitleText(originalText);
          }
        }, characterAnimationTime);
      }
    };
    
    // Start the animation
    runAnimation();
    
    // Cleanup function
    return () => {
      animationComplete = true;
      setTitleText(originalText);
    };
  }, [isHoveringTitle]);
  
  // Handle mouse enter for cards
  const handleCardMouseEnter = (index: number) => {
    setHoveredIndex(index);
  };
  
  // Handle mouse leave for cards
  const handleCardMouseLeave = () => {
    setHoveredIndex(null);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 py-12 relative overflow-hidden">
      {/* Subtle global glow effect */}
      <div className="absolute inset-0 bg-black opacity-50 z-0">
        <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 rounded-full bg-purple-500/5 blur-[120px]"></div>
        <div className="absolute bottom-1/3 right-1/3 w-1/3 h-1/3 rounded-full bg-blue-500/5 blur-[100px]"></div>
        <div className="absolute top-1/2 right-1/4 w-1/3 h-1/3 rounded-full bg-pink-500/5 blur-[150px]"></div>
      </div>
      
      <div className="relative w-full max-w-4xl z-10">
        <div className="mb-16 text-center">
          <h1 
            className="font-editorial-new mb-4 text-6xl font-light tracking-[-0.04em] text-white md:text-7xl group relative"
            style={{ fontFeatureSettings: '"ss01", "ss03"' }}
          >
            <span 
              className="relative inline-block"
            >
              <span className="italic">Aries</span>{'  '}<span className="not-italic">Week</span>
              <div className="absolute -inset-1 -z-10 blur-md opacity-25">Aries Week</div>
              {/* Underline animation on hover */}
              <span className="absolute -bottom-1 left-0 h-1 bg-white w-0 group-hover:w-1/2 transition-all duration-300 ease-in-out"></span>
            </span>
          </h1>
          
          <p className="font-geist-mono mx-auto max-w-xl text-sm text-gray-400 md:text-base">
            train / compete / evolve
          </p>
        </div>
        
        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              title: "Monitor Progress",
              subtitle: "01 / Track",
              description: "Visualize your learning journey with detailed analytics and progress tracking.",
              glow: "from-purple-500/30 via-blue-500/20 to-purple-500/30",
              colors: [[139, 92, 246], [59, 130, 246]]
            },
            {
              title: "Task Challenges",
              subtitle: "02 / Complete",
              description: "Progress through carefully structured challenges designed to enhance your skills.",
              glow: "from-blue-500/30 via-cyan-500/20 to-blue-500/30",
              colors: [[59, 130, 246], [14, 165, 233]]
            },
            {
              title: "Unlock Rewards",
              subtitle: "03 / Achieve",
              description: "Earn badges and recognition as you demonstrate mastery of each concept.",
              glow: "from-pink-500/30 via-purple-500/20 to-pink-500/30",
              colors: [[219, 39, 119], [139, 92, 246]]
            }
          ].map((card, index) => (
            <Card 
              key={index}
              className={`relative overflow-hidden border-0 bg-black/80 transition-all duration-300 ${
                hoveredIndex === index ? 'scale-[1.02]' : ''
              }`}
              onMouseEnter={() => handleCardMouseEnter(index)}
              onMouseLeave={handleCardMouseLeave}
            >
              {/* Canvas Reveal Effect */}
              <AnimatePresence>
                {hoveredIndex === index && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-0"
                  >
                    <CanvasRevealEffect
                      animationSpeed={5}
                      containerClassName="bg-transparent"
                      colors={card.colors}
                      opacities={[0.2, 0.2, 0.2, 0.2, 0.2, 0.4, 0.4, 0.4, 0.4, 1]}
                      dotSize={2}
                      showGradient={false}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="rounded-[inherit] relative z-30">
                
                <GlowingEffect 
                  blur={0}
                  glow={true}
                  spread={60}
                  variant={hoveredIndex === index ? "default" : "white"} 
                  disabled={false}
                  className="z-0" 
                  movementDuration={0.5}
                  borderWidth={0}
                  proximity={64}
                  inactiveZone={0.01}
                />
                <div className="relative z-40 rounded-[inherit]">
                  <CardContent className="p-6">
                    <div className="font-geist-mono mb-3 text-xs uppercase tracking-widest text-gray-500">
                      {card.subtitle}
                    </div>
                    <h2 className="font-editorial-new mb-4 text-2xl italic tracking-tight text-white">
                      {card.title}
                    </h2>
                    <p className="font-geist-mono text-xs text-gray-400">
                      {card.description}
                    </p>
                  </CardContent>
                </div>
              </div>
            </Card>
          ))}
        </div>
        
        <div className="mt-12 flex flex-col justify-center gap-4 sm:flex-row">
          <Button
            asChild
            variant="outline"
            className="border-white/20 bg-black font-geist-mono hover:bg-white/5 hover:text-white"
          >
            <Link href="/dashboard">Start journey</Link>
          </Button>
          
          <Button
            variant="ghost"
            asChild
            className="font-geist-mono text-gray-400 hover:text-white"
          >
            <Link href="https://github.com/your-org/aries-week" target="_blank">
              View GitHub
            </Link>
          </Button>
        </div>
        
        <div className="font-geist-mono mt-16 text-center text-xs text-gray-600">
          <p>Made with precision. Designed for focus.</p>
        </div>
      </div>
    </div>
  );
}
