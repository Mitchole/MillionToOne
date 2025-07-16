import React from 'react';
import { SceneTransition } from '../ui/SceneTransition';
import { GlassPanel } from '../ui/GlassPanel';
import { useSceneManager } from '../../hooks/useSceneManager';

export const StarStylesDemo: React.FC = () => {
  const { currentScene, goToScene } = useSceneManager();

  const starStyles = [
    {
      id: 1,
      name: 'Simple Round Points',
      description: 'Clean, minimal circles with soft radial gradient',
      className: 'star-style-1',
    },
    {
      id: 2,
      name: 'Soft Glow',
      description: 'Rounded stars with subtle glow effect using box-shadow',
      className: 'star-style-2',
    },
    {
      id: 3,
      name: 'Color Variation',
      description: 'Stars with different colors (red, blue, green, yellow, teal)',
      className: 'star-style-3',
    },
    {
      id: 4,
      name: 'Cross Shape',
      description: 'Traditional star shape using CSS pseudo-elements',
      className: 'star-style-4',
    },
    {
      id: 5,
      name: 'Diamond Shape',
      description: 'Rotated squares with glow, creating diamond-like stars',
      className: 'star-style-5',
    },
    {
      id: 6,
      name: 'Twinkling Animation',
      description: 'Animated stars that twinkle with opacity and scale changes',
      className: 'star-style-6',
    },
    {
      id: 7,
      name: 'Lens Flare Effect',
      description: 'Multiple layered box-shadows creating a lens flare effect',
      className: 'star-style-7',
    },
    {
      id: 8,
      name: 'Pulsing Core',
      description: 'Stars that pulse with scale and opacity animation',
      className: 'star-style-8',
    },
  ];

  const StarPreview: React.FC<{ style: (typeof starStyles)[0] }> = ({ style }) => (
    <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-2">
        {style.id}. {style.name}
      </h3>
      <p className="text-sm text-gray-300 mb-3">{style.description}</p>
      <div className="w-full h-32 bg-black rounded relative overflow-hidden">
        {/* Generate some sample stars */}
        {[
          { top: '20%', left: '15%', size: '4px' },
          { top: '60%', left: '70%', size: '6px' },
          { top: '80%', left: '25%', size: '3px' },
          { top: '30%', left: '85%', size: '5px' },
          { top: '50%', left: '45%', size: '4px' },
        ].map((star, index) => (
          <div
            key={index}
            className={`absolute ${style.className}`}
            style={{
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              animationDelay: `${index * 0.5}s`,
            }}
          />
        ))}
      </div>
    </div>
  );

  return (
    <SceneTransition
      sceneId="star-demo"
      isActive={currentScene === 'star-demo'}
      className="flex items-center justify-center min-h-screen p-4"
    >
      <GlassPanel size="lg" className="max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">Star Styling Options</h1>
          <button
            onClick={() => goToScene('landing')}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
          >
            Back to App
          </button>
        </div>

        <p className="text-gray-300 mb-8">
          Here are 8 different star styling options. Each preview shows how stars would appear in
          the starfield:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {starStyles.map((style) => (
            <StarPreview key={style.id} style={style} />
          ))}
        </div>

        <div className="mt-8 p-4 bg-gray-800 rounded-lg">
          <h3 className="text-xl font-semibold text-white mb-4">Implementation Notes:</h3>
          <ul className="text-sm text-gray-300 space-y-2">
            <li>
              <strong>Options 1-2:</strong> Best performance, minimal CSS
            </li>
            <li>
              <strong>Options 3-5:</strong> Good balance of visual appeal and performance
            </li>
            <li>
              <strong>Options 6-8:</strong> Most visually striking but may impact performance with
              many stars
            </li>
            <li>
              <strong>Recommendation:</strong> For best performance with thousands of stars,
              consider options 1-2
            </li>
            <li>
              <strong>Hybrid Approach:</strong> Use different styles for different star
              sizes/distances
            </li>
          </ul>
        </div>
      </GlassPanel>

      <style>{`
        /* Star Style 1: Simple Round Points */
        .star-style-1 {
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.8) 30%, rgba(255,255,255,0) 70%);
        }
        
        /* Star Style 2: Soft Glow */
        .star-style-2 {
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.6) 40%, rgba(255,255,255,0) 100%);
          box-shadow: 0 0 10px rgba(255,255,255,0.5);
        }
        
        /* Star Style 3: Color Variation */
        .star-style-3 {
          border-radius: 50%;
          box-shadow: 0 0 8px currentColor;
        }
        .star-style-3:nth-child(1) { background: #ff6b6b; }
        .star-style-3:nth-child(2) { background: #4ecdc4; }
        .star-style-3:nth-child(3) { background: #45b7d1; }
        .star-style-3:nth-child(4) { background: #96ceb4; }
        .star-style-3:nth-child(5) { background: #feca57; }
        
        /* Star Style 4: Cross Shape */
        .star-style-4 {
          transform: translate(-50%, -50%);
        }
        .star-style-4::before,
        .star-style-4::after {
          content: '';
          position: absolute;
          background: rgba(255,255,255,0.9);
          border-radius: 2px;
        }
        .star-style-4::before {
          width: 12px;
          height: 2px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
        .star-style-4::after {
          width: 2px;
          height: 12px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
        
        /* Star Style 5: Diamond Shape */
        .star-style-5 {
          width: 6px !important;
          height: 6px !important;
          background: rgba(255,255,255,0.9);
          transform: rotate(45deg);
          box-shadow: 0 0 6px rgba(255,255,255,0.5);
        }
        
        /* Star Style 6: Twinkling Animation */
        .star-style-6 {
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.6) 40%, rgba(255,255,255,0) 100%);
          animation: twinkle 2s infinite alternate;
        }
        @keyframes twinkle {
          0% { opacity: 0.3; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1.2); }
        }
        
        /* Star Style 7: Lens Flare Effect */
        .star-style-7 {
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.8) 20%, rgba(255,255,255,0) 50%);
          box-shadow: 
            0 0 10px rgba(255,255,255,0.8),
            0 0 20px rgba(255,255,255,0.4),
            0 0 30px rgba(255,255,255,0.2);
        }
        
        /* Star Style 8: Pulsing Core */
        .star-style-8 {
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.7) 30%, rgba(255,255,255,0) 70%);
          animation: pulse 3s infinite ease-in-out;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.3); opacity: 1; }
        }
      `}</style>
    </SceneTransition>
  );
};
