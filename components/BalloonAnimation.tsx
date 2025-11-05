
import React, { useState, useEffect } from 'react';

const NUM_BALLOONS = 20;
const ANIMATION_DURATION_MIN = 6; // seconds
const ANIMATION_DURATION_MAX = 12; // seconds

interface Balloon {
  id: number;
  style: React.CSSProperties;
}

const BalloonAnimation: React.FC<{ onAnimationEnd: () => void }> = ({ onAnimationEnd }) => {
  const [balloons, setBalloons] = useState<Balloon[]>([]);

  useEffect(() => {
    const generatedBalloons = Array.from({ length: NUM_BALLOONS }).map((_, i) => {
      const duration = Math.random() * (ANIMATION_DURATION_MAX - ANIMATION_DURATION_MIN) + ANIMATION_DURATION_MIN;
      const delay = Math.random() * 5; // Start balloons at slightly different times
      const size = Math.random() * 50 + 40; // size between 40px and 90px
      const left = Math.random() * 100; // vw

      return {
        id: i,
        style: {
          width: `${size}px`,
          height: `${size * 1.2}px`,
          left: `${left}vw`,
          animationDuration: `${duration}s`,
          animationDelay: `${delay}s`,
        },
      };
    });
    setBalloons(generatedBalloons);

    // Set a timeout to call the onAnimationEnd callback after the longest possible animation
    const longestAnimationTime = (ANIMATION_DURATION_MAX + 5) * 1000;
    const timer = setTimeout(onAnimationEnd, longestAnimationTime);

    return () => clearTimeout(timer);
  }, [onAnimationEnd]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {balloons.map(balloon => (
        <div key={balloon.id} className="balloon" style={balloon.style}></div>
      ))}
    </div>
  );
};

export default BalloonAnimation;
