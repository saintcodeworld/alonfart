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
        this.fartSound = null; // Fart sound effect
        this.isFarting = false; // Track if currently farting
        
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
        
        // Initialize fart sound effect
        this.initFartSound();
        
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
    
    initFartSound() {
        console.log('[DEBUG] Initializing fart sound effect');
        // Create a simple fart sound using Web Audio API
        this.fartSound = this.createFartSound();
    }
    
    createFartSound() {
        // Create a more realistic fart sound using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        const playFart = () => {
            if (this.isFarting) return; // Prevent overlapping farts
            
            this.isFarting = true;
            console.log('[DEBUG] Playing realistic fart sound');
            
            // Create multiple oscillators for richer sound
            const oscillator1 = audioContext.createOscillator();
            const oscillator2 = audioContext.createOscillator();
            const oscillator3 = audioContext.createOscillator();
            
            const gainNode = audioContext.createGain();
            const filter = audioContext.createBiquadFilter();
            const filter2 = audioContext.createBiquadFilter();
            
            // Connect oscillators to filters
            oscillator1.connect(filter);
            oscillator2.connect(filter);
            oscillator3.connect(filter2);
            
            // Connect filters to gain
            filter.connect(gainNode);
            filter2.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Main fart sound - low frequency rumble
            oscillator1.type = 'sawtooth';
            oscillator1.frequency.setValueAtTime(60, audioContext.currentTime);
            oscillator1.frequency.exponentialRampToValueAtTime(35, audioContext.currentTime + 0.4);
            
            // Secondary fart sound - mid range
            oscillator2.type = 'triangle';
            oscillator2.frequency.setValueAtTime(120, audioContext.currentTime);
            oscillator2.frequency.exponentialRampToValueAtTime(80, audioContext.currentTime + 0.3);
            
            // High frequency component for texture
            oscillator3.type = 'square';
            oscillator3.frequency.setValueAtTime(200, audioContext.currentTime);
            oscillator3.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.2);
            
            // Main filter for bassy sound
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(300, audioContext.currentTime);
            filter.Q.setValueAtTime(8, audioContext.currentTime);
            filter.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.5);
            
            // Secondary filter for mid frequencies
            filter2.type = 'bandpass';
            filter2.frequency.setValueAtTime(400, audioContext.currentTime);
            filter2.Q.setValueAtTime(3, audioContext.currentTime);
            
            // Complex envelope for realistic fart sound
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 0.02); // Quick attack
            gainNode.gain.linearRampToValueAtTime(0.25, audioContext.currentTime + 0.1); // Slight dip
            gainNode.gain.linearRampToValueAtTime(0.35, audioContext.currentTime + 0.25); // Rise again
            gainNode.gain.exponentialRampToValueAtTime(0.05, audioContext.currentTime + 0.6); // Long fade out
            
            // Add some randomness for variation
            const randomVariation = Math.random() * 0.1;
            gainNode.gain.value += randomVariation;
            
            // Start all oscillators
            oscillator1.start(audioContext.currentTime);
            oscillator2.start(audioContext.currentTime);
            oscillator3.start(audioContext.currentTime);
            
            // Stop oscillators at different times for more realistic decay
            oscillator3.stop(audioContext.currentTime + 0.3);
            oscillator2.stop(audioContext.currentTime + 0.5);
            oscillator1.stop(audioContext.currentTime + 0.7);
            
            // Reset farting flag after sound finishes
            setTimeout(() => {
                this.isFarting = false;
            }, 800);
        };
        
        return { play: playFart };
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
        if (!this.cubeModel || this.isFarting) return;
        
        console.log('[DEBUG] Starting fart animation');
        
        // Play fart sound
        if (this.fartSound) {
            this.fartSound.play();
        }
        
        // Create fart particles (greenish gas clouds)
        this.createFartParticles();
        
        // Removed shake animation for smoother experience
    }
    
    createFartParticles() {
        if (!this.cubeModel) return;
        
        console.log('[DEBUG] Creating realistic fart particles');
        
        // Create more particles for a more realistic fart effect
        const particleCount = 12 + Math.floor(Math.random() * 6); // 12-17 particles
        
        for (let i = 0; i < particleCount; i++) {
            setTimeout(() => {
                this.createSingleFartParticle();
            }, i * 80); // Faster stagger for more continuous flow
        }
    }
    
    createSingleFartParticle() {
        // Create more realistic fart particle with varied colors and shapes
        const particleSize = 0.2 + Math.random() * 0.3;
        const particleGeometry = new THREE.SphereGeometry(particleSize, 6, 6);
        
        // Realistic fart colors - yellowish-green with brownish tints
        const fartColors = [
            0x88ff88, // Light green
            0xaaff88, // Yellow-green
            0xccff88, // Yellowish
            0x88cc66, // Darker green
            0x998844, // Brownish-green
            0xaaaa66, // Muddy yellow
        ];
        
        const randomColor = fartColors[Math.floor(Math.random() * fartColors.length)];
        
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: randomColor,
            transparent: true,
            opacity: 0.4 + Math.random() * 0.3, // Varied opacity
            depthWrite: false
        });
        
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        // Get Alon's world position to start particles from correct location
        const alonWorldPosition = new THREE.Vector3();
        this.cubeModel.getWorldPosition(alonWorldPosition);
        
        // More natural starting position - start from very bottom of character
        particle.position.set(
            alonWorldPosition.x - 0.5 + (Math.random() - 0.5) * 0.8, // Start slightly to the left and spread
            alonWorldPosition.y - 2.2 + (Math.random() * 0.2), // Start from very bottom (even lower)
            alonWorldPosition.z - 0.3 + (Math.random() - 0.5) * 0.4 // Slightly behind and spread
        );
        
        // Add particle to the scene, not the model, so it spreads freely without cube confinement
        this.scene.add(particle);
        
        // More realistic animation with varied duration and movement
        const duration = 2000 + Math.random() * 1000; // Varied duration (2-3 seconds)
        const startTime = Date.now();
        const initialScale = particle.scale.x;
        const targetScale = initialScale * (5 + Math.random() * 4); // Varied expansion (5x-9x)
        
        // Random movement parameters for natural drift - now going left and slightly more backward
        const driftX = -0.03 - (Math.random() * 0.03); // Strong leftward drift
        const driftY = 0.01 + Math.random() * 0.01; // Upward drift
        const driftZ = -0.02 - Math.random() * 0.02; // Increased backward drift
        const wobbleAmount = Math.random() * 0.02;
        
        const animateParticle = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress < 1) {
                // Expand particle with easing
                const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
                const currentScale = initialScale + (targetScale - initialScale) * easeProgress;
                particle.scale.setScalar(currentScale);
                
                // Fade out more gradually
                particle.material.opacity = (0.7 * (1 - progress * progress)) + Math.random() * 0.1;
                
                // Natural drift with wobble - now in world space
                particle.position.y += driftY;
                particle.position.x += driftX + Math.sin(elapsed * 0.003) * wobbleAmount;
                particle.position.z += driftZ;
                
                // Slight rotation for more natural movement
                particle.rotation.x += 0.01;
                particle.rotation.y += 0.015;
                
                requestAnimationFrame(animateParticle);
            } else {
                // Remove particle from scene
                this.scene.remove(particle);
                particle.geometry.dispose();
                particle.material.dispose();
            }
        };
        
        animateParticle();
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
        
        // Clean up fart sound
        if (this.fartSound) {
            this.fartSound = null;
        }
        
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.cubeModel = null;
        this.crackOverlay = null;
    }
}

export default Cube3D;
