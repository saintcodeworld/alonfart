import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Debug logging for Alon model integration
console.log('[DEBUG] Loading Alon model module');

class Cube3D {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.cubeModel = null;
        this.crackOverlay = null;
        this.loader = new GLTFLoader();
        this.currentCrackLevel = 0;
        this.mixer = null; // Animation mixer for Alon model
        this.clock = new THREE.Clock(); // Clock for animation timing
        
        this.init();
    }
    
    init() {
        console.log('[DEBUG] Initializing Alon 3D model viewer');
        // Clear any existing content
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }
        
        this.scene = new THREE.Scene();
        
        // Setup camera - moved back much further to properly frame the Alon model
        this.camera = new THREE.PerspectiveCamera(
            45,
            this.container.offsetWidth / this.container.offsetHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 6, 15); // Adjusted for Alon model
        this.camera.lookAt(0, 0, 0);
        
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            preserveDrawingBuffer: false // Prevent buffer accumulation
        });
        this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
        this.renderer.setClearColor(0x000000, 0);
        this.container.appendChild(this.renderer.domElement);
        
        // Improved lighting setup for character model
        // Main light from front
        const frontLight = new THREE.DirectionalLight(0xffffff, 1.0);
        frontLight.position.set(0, 2, 5);
        this.scene.add(frontLight);
        
        // Fill light from left
        const leftLight = new THREE.DirectionalLight(0x00ffff, 0.6); // Cyan light
        leftLight.position.set(-5, 1, 2);
        this.scene.add(leftLight);
        
        // Accent light from right
        const rightLight = new THREE.DirectionalLight(0xff8800, 0.4); // Orange accent light
        rightLight.position.set(5, 0, -2);
        this.scene.add(rightLight);
        
        // Ambient light to fill shadows
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        // Load alon model
        this.loadCube();
        
        
        this.animate();
    }
    
    loadCube() {
        // Only load alon model, no fallbacks
        console.log('[DEBUG] Loading alon model');
        console.log('[DEBUG] Model URL: alon.glb');
        
        // Add cache-busting parameter to force reload
        const modelUrl = 'alon.glb?t=' + Date.now();
        console.log('[DEBUG] Loading with cache-busting URL:', modelUrl);
        
        this.loader.load(
            modelUrl,
            (gltf) => {
                console.log('[DEBUG] alon model loaded successfully');
                console.log('[DEBUG] Model scene:', gltf.scene);
                console.log('[DEBUG] Model children count:', gltf.scene.children.length);
                
                // Debug texture information
                gltf.scene.traverse((child) => {
                    if (child.isMesh) {
                        console.log('[DEBUG] Found mesh:', child.name);
                        if (child.material) {
                            console.log('[DEBUG] Material type:', child.material.type);
                            console.log('[DEBUG] Material properties:', Object.keys(child.material));
                            
                            // Check for textures
                            for (let key in child.material) {
                                if (child.material[key] && child.material[key].isTexture) {
                                    console.log('[DEBUG] Found texture:', key, child.material[key]);
                                }
                            }
                        }
                    }
                });
                
                if (this.cubeModel) {
                    this.scene.remove(this.cubeModel);
                }
                
                this.cubeModel = gltf.scene;
                
                // Get bounding box to properly scale and position
                const box = new THREE.Box3().setFromObject(this.cubeModel);
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                
                console.log('[DEBUG] Model bounding box size:', size);
                console.log('[DEBUG] Max dimension:', maxDim);
                
                // alon model needs custom scaling
                const scale = 12.0 / maxDim;
                this.cubeModel.scale.setScalar(scale);
                
                console.log('[DEBUG] Applied scale:', scale);
                
                // Position alon model at the center of the scene
                const center = box.getCenter(new THREE.Vector3());
                this.cubeModel.position.sub(center.multiplyScalar(scale));
                
                // Apply a slight Y-axis offset to position alon correctly
                this.cubeModel.position.y -= 0.5;
                
                // Rotate model to match the desired pose from the image
                this.cubeModel.rotation.y = Math.PI / 4; // Rotate slightly to the right (45 degrees)
                this.cubeModel.rotation.x = -Math.PI / 16; // Tilt slightly downwards (11.25 degrees)
                this.cubeModel.position.z = 0.2; // Move slightly forward to compensate for rotation
                
                console.log('[DEBUG] Final position:', this.cubeModel.position);
                console.log('[DEBUG] Applied rotation Y:', this.cubeModel.rotation.y);
                console.log('[DEBUG] Applied rotation X:', this.cubeModel.rotation.x);
                
                // Add to scene
                this.scene.add(this.cubeModel);
                console.log('[DEBUG] alon model added to scene');
                
                // Fix missing textures
                this.fixTextures(gltf.scene);
                
                // Look for and play alon model animations if available
                if (gltf.animations && gltf.animations.length > 0) {
                    console.log('[DEBUG] Found animations in alon model: ' + gltf.animations.length);
                    this.mixer = new THREE.AnimationMixer(this.cubeModel);
                    const animation = this.mixer.clipAction(gltf.animations[0]);
                    animation.play();
                } else {
                    console.log('[DEBUG] No animations found in alon model');
                }
            },
            (progress) => {
                console.log('[DEBUG] Loading progress:', (progress.loaded / progress.total * 100) + '%');
            },
            (error) => {
                console.log('[ERROR] Failed to load alon model:', error);
                console.log('[ERROR] Error details:', error.message || error);
                console.log('[ERROR] Creating alon placeholder instead');
                // Create a simple alon placeholder instead of falling back to cube
                this.createAlonPlaceholder();
            }
        );
    }
    
    
    createAlonPlaceholder() {
        console.log('[DEBUG] Creating alon placeholder model');
        
        // Create a simple humanoid-shaped placeholder for Alon
        const bodyGeometry = new THREE.SphereGeometry(1.0, 16, 16); // Made bigger
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x4169e1, // Blue color for Alon
            roughness: 0.3, // Less rough for more visibility
            metalness: 0.2 
        });
        const alonBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
        
        // Add head
        const headGeometry = new THREE.SphereGeometry(0.6, 16, 16); // Made bigger
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0x4169e1 });
        
        const alonHead = new THREE.Mesh(headGeometry, headMaterial);
        alonHead.position.set(0, 1.2, 0);
        
        // Create group and add all parts
        const alonFigure = new THREE.Group();
        alonFigure.add(alonBody);
        alonFigure.add(alonHead);
        
        // Add a bright emissive material to make it more visible
        alonFigure.children.forEach(child => {
            if (child.material) {
                child.material.emissive = new THREE.Color(0x4169e1);
                child.material.emissiveIntensity = 0.2;
            }
        });
        
        this.cubeModel = alonFigure;
        this.scene.add(this.cubeModel);
        console.log('[DEBUG] Alon placeholder added to scene');
    }
    
    fixTextures(scene) {
        console.log('[DEBUG] Fixing textures for alon model');
        
        scene.traverse((child) => {
            if (child.isMesh) {
                console.log('[DEBUG] Processing mesh:', child.name);
                
                // Fix any missing textures
                if (child.material && child.material.map && !child.material.map.image) {
                    console.log('[DEBUG] Fixing missing texture for:', child.name);
                    // Create a simple colored material as fallback
                    child.material = new THREE.MeshStandardMaterial({
                        color: 0x4169e1, // Blue color for Alon as fallback
                        roughness: 0.8,
                        metalness: 0.1
                    });
                }
            }
        });
    }
    
    
    updateCracks(crackLevel) {
        this.currentCrackLevel = crackLevel;
        
        if (!this.cubeModel) return;
        
        if (this.crackOverlay) {
            this.cubeModel.remove(this.crackOverlay);
            this.crackOverlay.geometry.dispose();
            this.crackOverlay.material.dispose();
        }
        
        // Don't create any visible overlay - completely hide the hitbox
        // This prevents the orange cube outline from appearing when clicking
        console.log('[DEBUG] Crack level updated to: ' + crackLevel + ' (hitbox hidden)');
    }
    
    animateCrackAppearance(crackLevel) {
        if (!this.crackOverlay) return;
        
        const duration = 300;
        const startTime = Date.now();
        const targetOpacity = 0.5 + (crackLevel * 0.1); // More visible with higher damage
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            if (progress < 1 && this.crackOverlay) {
                // Fade in cracks
                this.crackOverlay.material.opacity = targetOpacity * progress;
                
                // Scale effect - cracks spread from center
                const scale = 0.95 + (0.05 * progress);
                this.crackOverlay.scale.setScalar(scale);
                
                requestAnimationFrame(animate);
            } else if (this.crackOverlay) {
                this.crackOverlay.material.opacity = targetOpacity;
                this.crackOverlay.scale.setScalar(1);
            }
        };
        
        animate();
    }
    
    addHitFlash() {
        if (!this.cubeModel) return;
        
        // Create cyan flash overlay matching Web3 theme
        const flashGeometry = new THREE.BoxGeometry(2.05, 2.05, 2.05);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff, // Cyan color matching Web3 theme
            transparent: true,
            opacity: 0.8,
            depthWrite: false
        });
        
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        this.cubeModel.add(flash);
        
        // Animate flash
        const duration = 150;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress < 1) {
                flash.material.opacity = 0.8 * (1 - progress);
                requestAnimationFrame(animate);
            } else {
                this.cubeModel.remove(flash);
                flash.geometry.dispose();
                flash.material.dispose();
            }
        };
        
        animate();
    }
    
    shake() {
        if (!this.cubeModel) return;
        
        // Special shake animation for alon model
        console.log('[DEBUG] Shaking alon model');
        
        // Store original position and rotation
        const originalPosition = this.cubeModel.position.clone();
        const originalRotation = this.cubeModel.rotation.clone();
        
        // More intense shake for alon model
        const shakeIntensity = 0.15;
        const rotateIntensity = 0.05;
        const shakeDuration = 150;
        const startTime = Date.now();
        
        // Temporarily pause any ongoing animation while shaking
        const wasMixerRunning = this.mixer ? true : false;
        
        const shakeAnimation = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / shakeDuration;
            
            if (progress < 1) {
                // Random position shake
                this.cubeModel.position.x = originalPosition.x + (Math.random() - 0.5) * shakeIntensity;
                this.cubeModel.position.y = originalPosition.y + (Math.random() - 0.5) * shakeIntensity;
                this.cubeModel.position.z = originalPosition.z + (Math.random() - 0.5) * shakeIntensity;
                
                // Random rotation shake
                this.cubeModel.rotation.x = originalRotation.x + (Math.random() - 0.5) * rotateIntensity;
                this.cubeModel.rotation.z = originalRotation.z + (Math.random() - 0.5) * rotateIntensity;
                
                requestAnimationFrame(shakeAnimation);
            } else {
                // Restore original position and rotation
                this.cubeModel.position.copy(originalPosition);
                this.cubeModel.rotation.copy(originalRotation);
                
                // Restart mixer if it was running
                if (wasMixerRunning && this.mixer) {
                    // Mixer continues automatically
                }
            }
        };
        
        shakeAnimation();
    }
    
    fartAnimation() {
        if (!this.cubeModel) return;
        
        console.log('[DEBUG] Starting enhanced fart animation');
        
        // Get character position for all effects
        const alonWorldPosition = new THREE.Vector3();
        this.cubeModel.getWorldPosition(alonWorldPosition);
        
        // Layer 1: Initial burst puff - fast expanding cloud
        this.createInitialBurst(alonWorldPosition);
        
        // Layer 2: Main gas cloud particles with turbulence
        this.createMainGasCloud(alonWorldPosition);
        
        // Layer 3: Wispy smoke trails
        this.createSmokeTrails(alonWorldPosition);
        
        // Layer 4: Small detail particles for texture
        this.createDetailParticles(alonWorldPosition);
    }
    
    // Layer 1: Initial burst - big fast expanding puff
    createInitialBurst(origin) {
        console.log('[DEBUG] Creating initial burst');
        
        const burstCount = 3;
        for (let i = 0; i < burstCount; i++) {
            const size = 0.4 + Math.random() * 0.3;
            const geometry = new THREE.SphereGeometry(size, 12, 12);
            
            // Brownish-yellow burst color
            const material = new THREE.MeshBasicMaterial({
                color: 0x8B7355,
                transparent: true,
                opacity: 0.6,
                depthWrite: false
            });
            
            const burst = new THREE.Mesh(geometry, material);
            burst.position.set(
                origin.x - 0.3 + (Math.random() - 0.5) * 0.4,
                origin.y - 2.5 + Math.random() * 0.3,
                origin.z - 0.5 - Math.random() * 0.3
            );
            
            this.scene.add(burst);
            
            // Fast expansion animation
            const startTime = Date.now();
            const duration = 400 + Math.random() * 200;
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = elapsed / duration;
                
                if (progress < 1) {
                    // Rapid expansion with ease-out
                    const scale = 1 + (progress * progress) * 8;
                    burst.scale.setScalar(scale);
                    
                    // Quick fade
                    burst.material.opacity = 0.6 * (1 - progress);
                    
                    // Slight upward and backward movement
                    burst.position.y += 0.02;
                    burst.position.z -= 0.03;
                    
                    requestAnimationFrame(animate);
                } else {
                    this.scene.remove(burst);
                    burst.geometry.dispose();
                    burst.material.dispose();
                }
            };
            
            setTimeout(() => animate(), i * 50);
        }
    }
    
    // Layer 2: Main gas cloud with turbulent motion
    createMainGasCloud(origin) {
        console.log('[DEBUG] Creating main gas cloud');
        
        const cloudCount = 15 + Math.floor(Math.random() * 8);
        
        // Realistic gas colors - more muted and organic
        const gasColors = [
            0x6B8E23, // Olive drab
            0x808000, // Olive
            0x9ACD32, // Yellow green
            0x556B2F, // Dark olive green
            0x8B8B00, // Dark yellow
            0x6B6B47, // Murky green-brown
            0x7D7D5C, // Khaki-ish
            0x8B7765, // Dusty brown
        ];
        
        for (let i = 0; i < cloudCount; i++) {
            setTimeout(() => {
                const size = 0.15 + Math.random() * 0.25;
                // Use icosahedron for more organic cloud shape
                const geometry = new THREE.IcosahedronGeometry(size, 1);
                
                const color = gasColors[Math.floor(Math.random() * gasColors.length)];
                const material = new THREE.MeshBasicMaterial({
                    color: color,
                    transparent: true,
                    opacity: 0.35 + Math.random() * 0.25,
                    depthWrite: false
                });
                
                const cloud = new THREE.Mesh(geometry, material);
                
                // Spawn from butt area with spread
                const spawnAngle = Math.random() * Math.PI * 0.5 - Math.PI * 0.25;
                cloud.position.set(
                    origin.x - 0.2 + Math.sin(spawnAngle) * 0.3,
                    origin.y - 2.3 - Math.random() * 0.4,
                    origin.z - 0.4 + Math.cos(spawnAngle) * 0.2
                );
                
                this.scene.add(cloud);
                
                // Turbulent animation parameters
                const duration = 2500 + Math.random() * 1500;
                const startTime = Date.now();
                const targetScale = 4 + Math.random() * 5;
                
                // Perlin-like noise parameters for turbulence
                const turbulenceX = Math.random() * 0.04;
                const turbulenceY = Math.random() * 0.02;
                const turbulenceZ = Math.random() * 0.03;
                const phaseX = Math.random() * Math.PI * 2;
                const phaseY = Math.random() * Math.PI * 2;
                const phaseZ = Math.random() * Math.PI * 2;
                const freqX = 0.002 + Math.random() * 0.002;
                const freqY = 0.003 + Math.random() * 0.002;
                const freqZ = 0.002 + Math.random() * 0.001;
                
                // Base drift direction
                const baseDriftX = -0.015 - Math.random() * 0.02;
                const baseDriftY = 0.008 + Math.random() * 0.012;
                const baseDriftZ = -0.025 - Math.random() * 0.02;
                
                const animate = () => {
                    const elapsed = Date.now() - startTime;
                    const progress = elapsed / duration;
                    
                    if (progress < 1) {
                        // Organic scale with pulsing
                        const baseScale = 1 + (targetScale - 1) * (1 - Math.pow(1 - progress, 2));
                        const pulse = 1 + Math.sin(elapsed * 0.008) * 0.1;
                        cloud.scale.setScalar(baseScale * pulse);
                        
                        // Turbulent movement using sine waves for pseudo-noise
                        const turbX = Math.sin(elapsed * freqX + phaseX) * turbulenceX;
                        const turbY = Math.sin(elapsed * freqY + phaseY) * turbulenceY;
                        const turbZ = Math.sin(elapsed * freqZ + phaseZ) * turbulenceZ;
                        
                        cloud.position.x += baseDriftX + turbX;
                        cloud.position.y += baseDriftY + turbY;
                        cloud.position.z += baseDriftZ + turbZ;
                        
                        // Slow rotation for organic feel
                        cloud.rotation.x += 0.005 + Math.random() * 0.005;
                        cloud.rotation.y += 0.008 + Math.random() * 0.005;
                        cloud.rotation.z += 0.003;
                        
                        // Gradual fade with flicker
                        const baseFade = 1 - Math.pow(progress, 1.5);
                        const flicker = 0.95 + Math.random() * 0.1;
                        cloud.material.opacity = (0.5 * baseFade * flicker);
                        
                        requestAnimationFrame(animate);
                    } else {
                        this.scene.remove(cloud);
                        cloud.geometry.dispose();
                        cloud.material.dispose();
                    }
                };
                
                animate();
            }, i * 60 + Math.random() * 40);
        }
    }
    
    // Layer 3: Wispy smoke trails
    createSmokeTrails(origin) {
        console.log('[DEBUG] Creating smoke trails');
        
        const trailCount = 5 + Math.floor(Math.random() * 3);
        
        for (let t = 0; t < trailCount; t++) {
            setTimeout(() => {
                // Each trail is a series of connected particles
                const segments = 8 + Math.floor(Math.random() * 5);
                const trailAngle = (Math.random() - 0.5) * Math.PI * 0.4;
                
                for (let s = 0; s < segments; s++) {
                    setTimeout(() => {
                        const size = 0.08 + Math.random() * 0.1;
                        const geometry = new THREE.SphereGeometry(size, 6, 6);
                        
                        // Lighter wispy color
                        const material = new THREE.MeshBasicMaterial({
                            color: 0xA9A9A9,
                            transparent: true,
                            opacity: 0.2 + Math.random() * 0.15,
                            depthWrite: false
                        });
                        
                        const wisp = new THREE.Mesh(geometry, material);
                        
                        // Position along trail path
                        const trailProgress = s / segments;
                        wisp.position.set(
                            origin.x - 0.2 + Math.sin(trailAngle) * trailProgress * 2,
                            origin.y - 2.4 + trailProgress * 0.5,
                            origin.z - 0.5 - trailProgress * 1.5
                        );
                        
                        this.scene.add(wisp);
                        
                        const duration = 1800 + Math.random() * 800;
                        const startTime = Date.now();
                        
                        const animate = () => {
                            const elapsed = Date.now() - startTime;
                            const progress = elapsed / duration;
                            
                            if (progress < 1) {
                                // Gentle expansion
                                wisp.scale.setScalar(1 + progress * 3);
                                
                                // Wavy drift
                                wisp.position.x += Math.sin(elapsed * 0.004 + s) * 0.01;
                                wisp.position.y += 0.012;
                                wisp.position.z -= 0.015;
                                
                                // Fade out
                                wisp.material.opacity = 0.25 * (1 - progress);
                                
                                requestAnimationFrame(animate);
                            } else {
                                this.scene.remove(wisp);
                                wisp.geometry.dispose();
                                wisp.material.dispose();
                            }
                        };
                        
                        animate();
                    }, s * 35);
                }
            }, t * 100);
        }
    }
    
    // Layer 4: Small detail particles for texture
    createDetailParticles(origin) {
        console.log('[DEBUG] Creating detail particles');
        
        const detailCount = 25 + Math.floor(Math.random() * 15);
        
        for (let i = 0; i < detailCount; i++) {
            setTimeout(() => {
                const size = 0.03 + Math.random() * 0.06;
                const geometry = new THREE.SphereGeometry(size, 4, 4);
                
                // Varied tiny particle colors
                const detailColors = [0x7CFC00, 0xADFF2F, 0x9ACD32, 0x6B8E23, 0x8B8B00];
                const color = detailColors[Math.floor(Math.random() * detailColors.length)];
                
                const material = new THREE.MeshBasicMaterial({
                    color: color,
                    transparent: true,
                    opacity: 0.4 + Math.random() * 0.3,
                    depthWrite: false
                });
                
                const detail = new THREE.Mesh(geometry, material);
                
                // Random spawn in cloud area
                detail.position.set(
                    origin.x - 0.3 + (Math.random() - 0.5) * 1.2,
                    origin.y - 2.5 + (Math.random() - 0.3) * 0.8,
                    origin.z - 0.6 + (Math.random() - 0.5) * 0.8
                );
                
                this.scene.add(detail);
                
                const duration = 1200 + Math.random() * 1000;
                const startTime = Date.now();
                
                // Chaotic movement parameters
                const velocityX = (Math.random() - 0.5) * 0.04;
                const velocityY = 0.01 + Math.random() * 0.02;
                const velocityZ = -0.02 - Math.random() * 0.03;
                const spin = (Math.random() - 0.5) * 0.1;
                
                const animate = () => {
                    const elapsed = Date.now() - startTime;
                    const progress = elapsed / duration;
                    
                    if (progress < 1) {
                        // Slight growth
                        detail.scale.setScalar(1 + progress * 2);
                        
                        // Chaotic movement
                        detail.position.x += velocityX + Math.sin(elapsed * 0.01) * 0.005;
                        detail.position.y += velocityY;
                        detail.position.z += velocityZ;
                        
                        detail.rotation.x += spin;
                        detail.rotation.z += spin * 0.7;
                        
                        // Quick fade
                        detail.material.opacity = 0.5 * (1 - progress * progress);
                        
                        requestAnimationFrame(animate);
                    } else {
                        this.scene.remove(detail);
                        detail.geometry.dispose();
                        detail.material.dispose();
                    }
                };
                
                animate();
            }, Math.random() * 300);
        }
    }
    
    breakAnimation(callback) {
        // Removed shake animation for smoother experience
        if (callback) callback();
    }
    
    respawnAnimation() {
        if (!this.cubeModel) return;
        
        this.updateCracks(0);
        this.cubeModel.visible = true;
        this.cubeModel.rotation.set(0, 0, 0);
        
        const duration = 500;
        const startTime = Date.now();
        const targetScale = 1; // Always restore to original scale
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress < 1) {
                const scale = progress;
                this.cubeModel.scale.setScalar(targetScale * scale);
                requestAnimationFrame(animate);
            } else {
                this.cubeModel.scale.setScalar(targetScale);
            }
        };
        
        this.cubeModel.scale.setScalar(0);
        animate();
    }
    
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        // Get delta time for animations
        const delta = this.clock.getDelta();
        
        // Update alon dance animation if mixer exists
        if (this.mixer) {
            this.mixer.update(delta);
        }
        // Removed continuous rotation for static model
        
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    handleResize() {
        if (!this.container || !this.renderer || !this.camera) return;
        
        const width = this.container.offsetWidth;
        const height = this.container.offsetHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    
    forceClear() {
        // Force clear the container and reset everything
        if (this.container) {
            while (this.container.firstChild) {
                this.container.removeChild(this.container.firstChild);
            }
        }
        
        // Cancel any pending animation frames
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        this.cleanup();
    }
    
    cleanup() {
        // Clean up Three.js resources to prevent rendering issues
        if (this.renderer) {
            this.renderer.dispose();
            if (this.container && this.renderer.domElement) {
                this.container.removeChild(this.renderer.domElement);
            }
        }
        
        if (this.cubeModel) {
            this.scene.remove(this.cubeModel);
            if (this.cubeModel.geometry) this.cubeModel.geometry.dispose();
            if (this.cubeModel.material) {
                if (Array.isArray(this.cubeModel.material)) {
                    this.cubeModel.material.forEach(material => material.dispose());
                } else {
                    this.cubeModel.material.dispose();
                }
            }
        }
        
        if (this.crackOverlay) {
            this.crackOverlay.geometry.dispose();
            this.crackOverlay.material.dispose();
        }
        
        // Clean up animation mixer
        if (this.mixer) {
            this.mixer = null;
        }
        
        
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.cubeModel = null;
        this.crackOverlay = null;
    }
}

export default Cube3D;
