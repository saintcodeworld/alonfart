import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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
        
        this.init();
    }
    
    init() {
        // Clear any existing content
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }
        
        this.scene = new THREE.Scene();
        
        this.camera = new THREE.PerspectiveCamera(
            45,
            this.container.offsetWidth / this.container.offsetHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 2, 5);
        this.camera.lookAt(0, 0, 0);
        
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            preserveDrawingBuffer: false // Prevent buffer accumulation
        });
        this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
        this.renderer.setClearColor(0x000000, 0);
        this.container.appendChild(this.renderer.domElement);
        
        const ambientLight = new THREE.AmbientLight(0x004444, 0.6); // Cyan ambient light
        this.scene.add(ambientLight);
        
        const directionalLight1 = new THREE.DirectionalLight(0x00ffff, 0.8); // Cyan directional light
        directionalLight1.position.set(5, 5, 5);
        this.scene.add(directionalLight1);
        
        const directionalLight2 = new THREE.DirectionalLight(0xff8800, 0.3); // Orange accent light
        directionalLight2.position.set(-5, -5, -5);
        this.scene.add(directionalLight2);
        
        this.loadCube();
        this.animate();
    }
    
    loadCube() {
        this.loader.load(
            'assets/grass_block.glb',
            (gltf) => {
                if (this.cubeModel) {
                    this.scene.remove(this.cubeModel);
                }
                
                this.cubeModel = gltf.scene;
                
                const box = new THREE.Box3().setFromObject(this.cubeModel);
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 2 / maxDim;
                this.cubeModel.scale.setScalar(scale);
                
                const center = box.getCenter(new THREE.Vector3());
                this.cubeModel.position.sub(center.multiplyScalar(scale));
                
                this.scene.add(this.cubeModel);
            },
            undefined,
            (error) => {
                console.log('GLB not found, creating fallback cube');
                this.createFallbackCube();
            }
        );
    }
    
    createFallbackCube() {
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        
        // Create Web3-style materials with cyan/orange theme
        const materials = [
            new THREE.MeshStandardMaterial({ color: 0x001a1a, roughness: 0.7, metalness: 0.8 }), // Right - dark cyan
            new THREE.MeshStandardMaterial({ color: 0x001a1a, roughness: 0.7, metalness: 0.8 }), // Left - dark cyan
            new THREE.MeshStandardMaterial({ color: 0x002222, roughness: 0.6, metalness: 0.9 }), // Top - darker cyan
            new THREE.MeshStandardMaterial({ color: 0x004444, roughness: 0.5, metalness: 0.7 }), // Bottom - medium cyan
            new THREE.MeshStandardMaterial({ color: 0x003333, roughness: 0.6, metalness: 0.8 }), // Front - cyan
            new THREE.MeshStandardMaterial({ color: 0x003333, roughness: 0.6, metalness: 0.8 })  // Back - cyan
        ];
        
        this.cubeModel = new THREE.Mesh(geometry, materials);
        this.scene.add(this.cubeModel);
    }
    
    updateCracks(crackLevel) {
        this.currentCrackLevel = crackLevel;
        
        if (!this.cubeModel) return;
        
        if (this.crackOverlay) {
            this.cubeModel.remove(this.crackOverlay);
            this.crackOverlay.geometry.dispose();
            this.crackOverlay.material.dispose();
        }
        
        if (crackLevel > 0 && crackLevel <= 4) {
            // Create crack lines instead of wireframe box
            const geometry = new THREE.BoxGeometry(2.01, 2.01, 2.01);
            const edges = new THREE.EdgesGeometry(geometry);
            
            // Create orange crack effect using line segments
            const material = new THREE.LineBasicMaterial({
                color: 0xff8800, // Orange color matching Web3 theme
                transparent: true,
                opacity: 0,
                depthWrite: false
            });
            
            this.crackOverlay = new THREE.LineSegments(edges, material);
            this.cubeModel.add(this.crackOverlay);
            
            // Animate crack appearing with spreading effect
            this.animateCrackAppearance(crackLevel);
            
            // Flash effect on hit
            this.addHitFlash();
        }
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
        
        const originalPosition = this.cubeModel.position.clone();
        const shakeIntensity = 0.1;
        const shakeDuration = 100;
        const startTime = Date.now();
        
        const shakeAnimation = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / shakeDuration;
            
            if (progress < 1) {
                this.cubeModel.position.x = originalPosition.x + (Math.random() - 0.5) * shakeIntensity;
                this.cubeModel.position.y = originalPosition.y + (Math.random() - 0.5) * shakeIntensity;
                this.cubeModel.position.z = originalPosition.z + (Math.random() - 0.5) * shakeIntensity;
                requestAnimationFrame(shakeAnimation);
            } else {
                this.cubeModel.position.copy(originalPosition);
            }
        };
        
        shakeAnimation();
    }
    
    breakAnimation(callback) {
        // Just shake more intensely and call callback
        this.shake();
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
        
        if (this.cubeModel && this.cubeModel.visible) {
            this.cubeModel.rotation.y += 0.005;
        }
        
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
        
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.cubeModel = null;
        this.crackOverlay = null;
    }
}

export default Cube3D;
