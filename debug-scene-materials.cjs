const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Enable console logging
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    console.log(`[BROWSER] ${type}: ${text}`);
  });

  try {
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });

    // Wait for performance testing to complete
    await page.waitForSelector('button[aria-label="Begin"]', { timeout: 30000 });
    await new Promise((resolve) => setTimeout(resolve, 15000));

    // Check Three.js scene state
    const sceneInfo = await page.evaluate(() => {
      if (!window.threeScene) return { error: 'No Three.js scene found' };

      const scene = window.threeScene;
      const camera = window.threeCamera;

      const sceneData = {
        children: scene.children.length,
        childTypes: scene.children.map((child) => ({
          type: child.type,
          name: child.name || 'unnamed',
          visible: child.visible,
          position: child.position
            ? {
                x: child.position.x,
                y: child.position.y,
                z: child.position.z,
              }
            : null,
          geometry: child.geometry
            ? {
                type: child.geometry.type,
                attributes: Object.keys(child.geometry.attributes || {}),
                vertexCount: child.geometry.attributes?.position?.count || 0,
              }
            : null,
          material: child.material
            ? {
                type: child.material.type,
                visible: child.material.visible,
                uniforms: child.material.uniforms ? Object.keys(child.material.uniforms) : null,
                vertexShader: child.material.vertexShader ? 'present' : 'missing',
                fragmentShader: child.material.fragmentShader ? 'present' : 'missing',
              }
            : null,
        })),
      };

      const cameraData = camera
        ? {
            position: {
              x: camera.position.x,
              y: camera.position.y,
              z: camera.position.z,
            },
            rotation: {
              x: camera.rotation.x,
              y: camera.rotation.y,
              z: camera.rotation.z,
            },
            far: camera.far,
            near: camera.near,
          }
        : null;

      return { sceneData, cameraData };
    });

    console.log('🎭 Scene Info:', JSON.stringify(sceneInfo, null, 2));

    // Check star materials specifically
    const starMaterials = await page.evaluate(() => {
      if (!window.threeScene) return { error: 'No scene' };

      const starObjects = window.threeScene.children.filter(
        (child) => child.type === 'Points' || child.type === 'Mesh' || child.name?.includes('star'),
      );

      return starObjects.map((obj) => ({
        type: obj.type,
        name: obj.name,
        geometryType: obj.geometry?.type,
        materialType: obj.material?.type,
        materialVisible: obj.material?.visible,
        materialOpacity: obj.material?.opacity,
        materialColor: obj.material?.color,
        uniformsPresent: obj.material?.uniforms ? Object.keys(obj.material.uniforms) : null,
        shaderErrors: obj.material?.shaderErrors || null,
      }));
    });

    console.log('⭐ Star Materials:', JSON.stringify(starMaterials, null, 2));

    // Check WebGL state
    const webglState = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return { error: 'No canvas' };

      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return { error: 'No WebGL context' };

      return {
        contextLost: gl.isContextLost(),
        depthTest: gl.getParameter(gl.DEPTH_TEST),
        blending: gl.getParameter(gl.BLEND),
        cullFace: gl.getParameter(gl.CULL_FACE),
        viewport: gl.getParameter(gl.VIEWPORT),
        clearColor: gl.getParameter(gl.COLOR_CLEAR_VALUE),
      };
    });

    console.log('🔧 WebGL State:', JSON.stringify(webglState, null, 2));

    await page.screenshot({ path: 'debug-scene-materials.png' });
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
})();
