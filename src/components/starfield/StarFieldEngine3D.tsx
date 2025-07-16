import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useAppContext } from '../../context/AppContext';
import { DeviceCapabilityDetector } from '../../utils/performance';
import { useGSAP } from '@gsap/react';
import { EnhancedCanvas2DFallback } from './EnhancedCanvas2DFallback';
import { StarOctree } from '../../utils/octree';
import { ChunkLoader } from '../../utils/chunkLoader';
import { CameraGuardrails } from '../../utils/cameraGuardrails';
import { generateStars3D, convert2DTo3D } from '../../utils/starfield3d';
import { useCamera3D } from '../../hooks/useCamera3D';
import { initializeStarQuality, getStarQualityManager } from '../../utils/starQualityManager';
import { getStarsInChunk, getStarPosition } from '../../utils/deterministicStars';

interface StarFieldEngine3DProps {
  className?: string;
  style?: React.CSSProperties;
}

export const StarFieldEngine3D: React.FC<StarFieldEngine3DProps> = ({ className, ...props }) => {
  const { state } = useAppContext();
  const { camera3D, updateCamera3D, syncCameras } = useCamera3D();
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const octreeRef = useRef<StarOctree>();
  const chunkLoaderRef = useRef<ChunkLoader>();
  const guardrailsRef = useRef<CameraGuardrails>();
  const animationFrameRef = useRef<number>();
  const initializedRef = useRef(false);

  const [webglSupported, setWebglSupported] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [deviceCapabilities, setDeviceCapabilities] = useState<any>(null);

  // Initialize device capabilities and WebGL support
  useEffect(() => {
    const initializeCapabilities = async () => {
      try {
        const capabilities = await DeviceCapabilityDetector.detect();
        console.log('Device capabilities:', capabilities);
        setDeviceCapabilities(capabilities);
        setWebglSupported(capabilities.webgl);

        // Set fallback mode based on renderer preference
        setFallbackMode(capabilities.preferredRenderer === 'canvas2d');
        console.log(
          'WebGL supported:',
          capabilities.webgl,
          'Fallback mode:',
          capabilities.preferredRenderer === 'canvas2d',
        );

        // Initialize star quality manager
        await initializeStarQuality();
        console.log('🎯 Star quality manager initialized');
      } catch (error) {
        console.warn('Failed to detect device capabilities:', error);
        setFallbackMode(true);
        console.log('Forced fallback mode due to error');
      }
    };

    initializeCapabilities();
  }, []);

  // 🌟 ACTIVE CHUNK SPAWNING: Find a spawn position with stars around it
  const findActiveSpawnPosition = () => {
    // Generate a random seed for this session to randomize spawn location
    const sessionSeed = Math.floor(Math.random() * 1000000);

    // Try multiple potential spawn locations and pick the one with most stars
    const candidates = [];
    const chunkSize = 8000; // Match the chunk size from chunkLoader

    for (let attempt = 0; attempt < 20; attempt++) {
      // Generate random positions across the universe
      const x = (Math.random() - 0.5) * 800000; // Within 80% of universe size
      const y = (Math.random() - 0.5) * 800000;
      const z = (Math.random() - 0.5) * 800000;

      // Check star density around this position
      const testBounds = {
        min: new THREE.Vector3(x - chunkSize, y - chunkSize, z - chunkSize),
        max: new THREE.Vector3(x + chunkSize, y + chunkSize, z + chunkSize),
      };

      const starsInChunk = getStarsInChunk(testBounds);

      candidates.push({
        position: { x, y, z },
        starCount: starsInChunk.length,
        bounds: testBounds,
      });
    }

    // Sort by star count and pick the best location
    candidates.sort((a, b) => b.starCount - a.starCount);
    const bestCandidate = candidates[0];

    console.log(
      '🌟 ACTIVE SPAWN: Found spawn position with',
      bestCandidate.starCount,
      'stars at',
      bestCandidate.position,
    );
    console.log(
      '🌟 ACTIVE SPAWN: Candidate star counts:',
      candidates.slice(0, 5).map((c) => c.starCount),
    );

    return bestCandidate;
  };

  // Initialize Three.js scene
  const initializeThreeJS = () => {
    console.log(
      'initializeThreeJS called - mountRef:',
      !!mountRef.current,
      'webglSupported:',
      webglSupported,
      'initialized:',
      initializedRef.current,
    );
    if (!mountRef.current || !webglSupported || initializedRef.current) {
      console.log('initializeThreeJS early return');
      return;
    }

    initializedRef.current = true;
    console.log('Creating Three.js scene...');

    try {
      // Create scene
      sceneRef.current = new THREE.Scene();
      sceneRef.current.background = new THREE.Color(0x000000);

      // Create camera
      cameraRef.current = new THREE.PerspectiveCamera(
        75, // FOV
        window.innerWidth / window.innerHeight, // aspect ratio
        0.1, // near
        50000, // far
      );

      // 🎯 GEMINI SOLUTION: Expose camera globally for direct animation access
      if (typeof window !== 'undefined') {
        (window as any).threejsCamera = cameraRef.current;
        console.log('🎯 Three.js camera exposed globally:', cameraRef.current);
      }

      // Create renderer with error handling
      try {
        rendererRef.current = new THREE.WebGLRenderer({
          antialias: !deviceCapabilities?.isLowEnd,
          alpha: true,
          powerPreference: deviceCapabilities?.isLowEnd ? 'low-power' : 'high-performance',
        });
        console.log('✅ WebGL renderer created successfully');
      } catch (rendererError) {
        console.error('🚨 WebGL renderer creation failed:', rendererError);
        throw new Error(
          `WebGL renderer creation failed: ${rendererError instanceof Error ? rendererError.message : String(rendererError)}`,
        );
      }

      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // Enable depth testing
      rendererRef.current.sortObjects = false;
      rendererRef.current.shadowMap.enabled = false; // Disable shadows for performance

      mountRef.current.appendChild(rendererRef.current.domElement);

      // 🚀 RE-ENABLING OCTREE SYSTEM for infinite space and chunk loading!
      console.log('🌌 Initializing octree system for infinite space...');

      // Initialize octree with MUCH larger bounds for infinite space
      octreeRef.current = new StarOctree({
        bounds: {
          min: { x: -500000, y: -500000, z: -500000 }, // 20x larger bounds
          max: { x: 500000, y: 500000, z: 500000 },
        },
        maxStarsPerNode: deviceCapabilities?.isLowEnd ? 50 : 100, // Smaller chunks for better performance
        maxDepth: deviceCapabilities?.isLowEnd ? 12 : 15, // Deeper for more granular chunks
      });

      // Initialize chunk loader with optimized settings
      chunkLoaderRef.current = new ChunkLoader(octreeRef.current, sceneRef.current, {
        preloadDistance: deviceCapabilities?.isLowEnd ? 5000 : 10000, // Larger preload distance
        maxConcurrentLoads: deviceCapabilities?.isLowEnd ? 3 : 5,
        memoryLimit: deviceCapabilities?.isLowEnd ? 200 : 500,
        adaptiveQuality: deviceCapabilities?.isLowEnd,
      });

      // Initialize camera guardrails with relaxed settings
      guardrailsRef.current = new CameraGuardrails(octreeRef.current, {
        minStarDensity: deviceCapabilities?.isLowEnd ? 0.0001 : 0.0005, // Lower density for larger space
        maxEmptyDistance: deviceCapabilities?.isLowEnd ? 1000 : 2000, // Larger empty distance tolerance
        rerouting: {
          enabled: !deviceCapabilities?.isLowEnd,
          maxAttempts: 5,
          detourFactor: 0.5,
        },
      });

      console.log('🌌 Octree system initialized with infinite bounds!');

      // Initialize camera position
      updateCameraFromState();

      // 🌌 INITIALIZE INFINITE STAR SYSTEM - No static stars, pure chunk generation
      console.log('🌌 Initializing infinite star system with octree chunks...');

      // Force initial chunk loading around camera position
      if (chunkLoaderRef.current) {
        // 🌟 ACTIVE CHUNK SPAWNING: Find a location with stars around it
        const { position: activeSpawnPosition } = findActiveSpawnPosition();

        const initialCamera3D = {
          position: activeSpawnPosition,
          rotation: { pitch: 0, yaw: 0, roll: 0 },
          fieldOfView: 75,
          near: 0.1,
          far: 50000,
          zoom: 1,
        };

        console.log('🌌 Triggering initial chunk loading...');
        console.log('🔍 ChunkLoader exists:', !!chunkLoaderRef.current);
        chunkLoaderRef.current.update(initialCamera3D);
      } else {
        console.log('❌ ChunkLoader not initialized at startup!');
      }

      console.log('🌌 Infinite star system initialized - stars will load dynamically!');

      // Start render loop
      startRenderLoop();

      console.log('Three.js initialization complete');
    } catch (error) {
      console.error('🚨 WebGL initialization failed:', error);
      console.log('🔄 Falling back to 2D canvas renderer');

      // Reset initialization flag
      initializedRef.current = false;

      // Force fallback mode
      setFallbackMode(true);
      setWebglSupported(false);
    }
  };

  // Update camera position based on app state
  const updateCameraFromState = () => {
    if (!cameraRef.current) return;

    // Use 3D camera state
    const camera = cameraRef.current;

    // Only log during zoom animation scenes
    if (
      state.currentScene === 'zoom1' ||
      state.currentScene === 'none' ||
      state.currentScene === 'zoom2'
    ) {
      console.log(
        '🎯 ZOOM ANIMATION - Updating Three.js camera to:',
        camera3D.position,
        'Scene:',
        state.currentScene,
      );
    }

    camera.position.set(camera3D.position.x, camera3D.position.y, camera3D.position.z);

    // Apply rotation
    camera.rotation.set(camera3D.rotation.pitch, camera3D.rotation.yaw, camera3D.rotation.roll);

    // Update camera properties
    camera.fov = camera3D.fieldOfView;
    camera.near = camera3D.near;
    camera.far = camera3D.far;
    camera.updateProjectionMatrix();

    if (
      state.currentScene === 'zoom1' ||
      state.currentScene === 'none' ||
      state.currentScene === 'zoom2'
    ) {
      console.log(
        '🎯 ZOOM ANIMATION - Three.js camera position now:',
        camera.position,
        'Scene:',
        state.currentScene,
      );
    }

    // Synchronize with 2D state for compatibility
    syncCameras();
  };

  // Render loop
  const startRenderLoop = () => {
    console.log('Starting render loop...');
    let frameCount = 0;
    let lastTime = performance.now();
    const qualityManager = getStarQualityManager();

    const animate = () => {
      if (!sceneRef.current || !rendererRef.current || !cameraRef.current) return;

      frameCount++;
      const now = performance.now();
      const deltaTime = now - lastTime;
      const fps = 1000 / deltaTime;

      // Record FPS for quality manager
      qualityManager.recordFPS(fps);

      // Update material uniforms for shader materials
      sceneRef.current.traverse((child) => {
        if (child instanceof THREE.Points) {
          qualityManager.updateMaterial(child.material, now * 0.001, cameraRef.current!.position);
        }
      });

      lastTime = now;

      // Update camera position
      // TEMPORARILY DISABLED: This was overriding GSAP animations!
      // updateCameraFromState();

      // 🚀 INFINITE STAR SYSTEM - Dynamic chunk loading and management

      // Update chunk loader with current THREE.JS camera position
      if (chunkLoaderRef.current && cameraRef.current) {
        const currentCamera3D = {
          position: {
            x: cameraRef.current.position.x,
            y: cameraRef.current.position.y,
            z: cameraRef.current.position.z,
          },
          rotation: {
            pitch: cameraRef.current.rotation.x,
            yaw: cameraRef.current.rotation.y,
            roll: cameraRef.current.rotation.z,
          },
          fieldOfView: cameraRef.current.fov,
          near: cameraRef.current.near,
          far: cameraRef.current.far,
          zoom: 1,
        };
        chunkLoaderRef.current.update(currentCamera3D);
      }

      // Update octree visibility and manage star chunks
      if (octreeRef.current) {
        octreeRef.current.updateVisibility(cameraRef.current);

        // Add visible star meshes to scene
        const visibleNodes = octreeRef.current.getVisibleNodes();
        if (frameCount % 300 === 0) {
          // Debug logging every 5 seconds
          console.log('🔍 OCTREE VISIBILITY: visibleNodes =', visibleNodes);
        }
        if (visibleNodes) {
          for (const node of visibleNodes) {
            if (node.mesh && !sceneRef.current.children.includes(node.mesh)) {
              sceneRef.current.add(node.mesh);
              console.log(
                '🌟 SCENE: Added mesh to scene, total children:',
                sceneRef.current.children.length,
              );
            } else if (!node.mesh) {
              console.log('🌟 SCENE: Node has no mesh, stars:', node.stars?.length || 0);
            }
          }

          // Remove invisible star meshes from scene
          const sceneMeshes = sceneRef.current.children.filter(
            (child) => child instanceof THREE.Points,
          );
          for (const mesh of sceneMeshes) {
            const isVisible = Array.from(visibleNodes).some((node) => node.mesh === mesh);
            if (!isVisible) {
              sceneRef.current.remove(mesh);
            }
          }
        }

        // Log chunk info occasionally
        if (frameCount % 300 === 0) {
          // Every 5 seconds at 60fps
          console.log('🚀 GEMINI INFINITE STAR SYSTEM:', {
            visibleNodes: visibleNodes ? visibleNodes.size : 0,
            totalSceneChildren: sceneRef.current.children.length,
            cameraPosition: `(${cameraRef.current.position.x.toFixed(0)}, ${cameraRef.current.position.y.toFixed(0)}, ${cameraRef.current.position.z.toFixed(0)})`,
            chunksCreated: chunkLoaderRef.current ? 'ChunkLoader active' : 'ChunkLoader inactive',
          });
        }
      }

      // Render scene
      rendererRef.current.render(sceneRef.current, cameraRef.current);

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!rendererRef.current || !cameraRef.current) return;

      const width = window.innerWidth;
      const height = window.innerHeight;

      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();

      rendererRef.current.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize Three.js when WebGL is supported
  useEffect(() => {
    console.log(
      'useEffect triggered - webglSupported:',
      webglSupported,
      'fallbackMode:',
      fallbackMode,
      'deviceCapabilities:',
      !!deviceCapabilities,
      'initialized:',
      initializedRef.current,
    );
    if (webglSupported && !fallbackMode && deviceCapabilities && !initializedRef.current) {
      console.log('Initializing Three.js...');
      initializeThreeJS();
    } else {
      console.log('Three.js initialization skipped');
    }
  }, [webglSupported, fallbackMode, !!deviceCapabilities]); // Use boolean check instead of object reference

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (chunkLoaderRef.current) {
        chunkLoaderRef.current.clear();
      }

      if (octreeRef.current) {
        octreeRef.current.clear();
      }

      if (rendererRef.current) {
        rendererRef.current.dispose();
      }

      if (sceneRef.current) {
        sceneRef.current.clear();
      }

      // Cleanup star quality manager
      const qualityManager = getStarQualityManager();
      qualityManager.stopPerformanceMonitoring();

      initializedRef.current = false;
    };
  }, []);

  // Render fallback if WebGL is not supported
  if (fallbackMode) {
    return (
      <EnhancedCanvas2DFallback className={className} deviceCapabilities={deviceCapabilities} />
    );
  }

  return (
    <div
      ref={mountRef}
      className={`fixed inset-0 ${className || ''}`}
      style={{ zIndex: 0 }}
      {...props}
    />
  );
};
