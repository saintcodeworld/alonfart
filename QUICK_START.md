# Quick Start Guide - 3D Minecraft Clicker

## Current Status

Your game now has **full 3D integration** with:
- ✅ 3D cube rendering with Three.js
- ✅ 3D hand/tool system
- ✅ Progressive crack overlays on 3D cube
- ✅ Smooth break and respawn animations
- ✅ Shake effect on hit

## What You Need to Do

### Download 2 GLB Files

The game will work with **fallback textures**, but for the best experience, download these 3D models:

#### 1. **Minecraft Hand** (Required for hand animation)
- **URL**: https://sketchfab.com/3d-models/minecraft-steve-cb228dcc137042cc9a3dc588758cc6e9
- **Steps**:
  1. Click "Download 3D Model"
  2. Select **GLB** format
  3. Save as `hand.glb`
  4. Move to `/assets/` folder

#### 2. **Minecraft Grass Block** (Required for 3D cube)
- **URL**: https://sketchfab.com/3d-models/minecraft-grass-block-84938a8f3f8d4a0aa64aaa9c4e4d27d3
- **Steps**:
  1. Click "Download 3D Model"
  2. Select **GLB** format
  3. Save as `grass_block.glb`
  4. Move to `/assets/` folder

### Alternative: Game Works Without GLB Files!

If you don't download the GLB files:
- **Hand**: Will use the diamond pickaxe you already have
- **Cube**: Will automatically create a textured cube using your grass_block.png

## How It Works Now

### 3D Cube Features
- **Rotating cube** rendered in real-time
- **Progressive cracks** appear as you hit (4 levels)
- **Shake effect** on each hit
- **Break animation** - cube shrinks and spins
- **Respawn animation** - cube grows back

### 3D Hand/Tool Features
- **3D model** swings when you click
- **Smooth animation** with rotation
- **Auto-rotation** when idle
- **Dynamic loading** - changes when you buy new tools

## File Structure

```
assets/
├── hand.glb              # ← Download this (Minecraft hand)
├── grass_block.glb       # ← Download this (Minecraft cube)
├── platinum_pickaxe.glb  # ✅ Already added
├── grass_block.png       # Used as fallback texture
├── crack_1.png to crack_4.png  # Used for crack overlays
└── sounds/
```

## Testing the Game

1. **Refresh your browser** (the server is still running)
2. **Click the cube** to see:
   - Hand swings in 3D
   - Cube shakes
   - Cracks appear progressively
   - Cube breaks with animation
   - Cube respawns with animation

## Next Steps

### Add More 3D Tools
Once you have more GLB pickaxe models, update `game.js`:

```javascript
const TOOLS = [
    { name: 'Hand', model: 'assets/hand.glb' },
    { name: 'Wooden Pickaxe', model: 'assets/wooden_pickaxe.glb' },
    // ... add more
];
```

### Customize Animations
Edit `cube3d.js` or `pickaxe3d.js` to adjust:
- Animation speeds
- Rotation angles
- Lighting effects
- Camera positions

## Troubleshooting

### Models Not Loading?
- Check browser console (F12) for errors
- Verify GLB files are in `/assets/` folder
- Make sure file names match exactly: `hand.glb`, `grass_block.glb`

### Performance Issues?
- Reduce model polygon count
- Adjust renderer settings in `cube3d.js`
- Lower animation frame rates

### Models Look Wrong?
- Adjust scale in `loadCube()` or `loadPickaxe()` functions
- Change rotation angles
- Modify lighting positions

## Technical Details

### New Files Created
- `cube3d.js` - 3D cube rendering and animations
- `pickaxe3d.js` - 3D hand/tool rendering (updated)
- `DOWNLOAD_3D_MODELS.md` - Detailed download guide
- `QUICK_START.md` - This file

### Modified Files
- `index.html` - Added Three.js, removed CSS cube
- `style.css` - Updated for 3D rendering
- `game.js` - Integrated 3D systems

### Technologies Used
- **Three.js** - 3D rendering engine
- **GLTFLoader** - Loads .glb 3D models
- **WebGL** - Hardware-accelerated graphics
- **ES6 Modules** - Modern JavaScript imports

---

**Your game is now fully 3D! 🎮⛏️**
