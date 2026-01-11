# How to Download 3D Models for the Game

## Required Models

### 1. Minecraft Hand (First Person View)
**Best Sources:**
- **Sketchfab**: https://sketchfab.com/3d-models/minecraft-steve-cb228dcc137042cc9a3dc588758cc6e9
  - Click "Download 3D Model" button
  - Select **GLB** format
  - Save as `hand.glb` in the `assets/` folder

**Alternative**: https://sketchfab.com/3d-models/first-person-hands-rigged-547a45535f0c4fe787948f7a7a6a88db
  - Download and convert FBX to GLB using online converter

### 2. Minecraft Grass Block
**Best Sources:**
- **Sketchfab**: https://sketchfab.com/3d-models/minecraft-grass-block-84938a8f3f8d4a0aa64aaa9c4e4d27d3
  - Click "Download 3D Model" button
  - Select **GLB** format
  - Save as `grass_block.glb` in the `assets/` folder

**Alternative Collection**: https://sketchfab.com/3d-models/minecraft-block-collection-6917281ba6244c73a37ede12e9a35bff
  - Contains multiple block types
  - Download GLB format

## Download Instructions

### Step 1: Visit Sketchfab Links
1. Open the URLs above in your browser
2. You may need to create a free Sketchfab account (it's free!)

### Step 2: Download Models
1. Click the **"Download 3D Model"** button on each page
2. Select **GLB** format from the dropdown
3. Click **Download**

### Step 3: Move Files to Assets
```bash
cd /Users/saintcodeworld/Downloads/mineclicker-main/assets/
# Move downloaded files here and rename:
# - Rename hand model to: hand.glb
# - Rename grass block to: grass_block.glb
```

## Alternative: Use Online Converters

If models are in other formats (FBX, OBJ, BLEND):

**Recommended Converters:**
- https://products.aspose.app/3d/conversion (FBX to GLB)
- https://anyconv.com/fbx-to-glb-converter/
- https://www.vectary.com/3d-modeling-news/free-online-3d-model-converter/

## File Structure After Download

```
assets/
├── hand.glb              # Minecraft hand model
├── grass_block.glb       # Minecraft grass block
├── platinum_pickaxe.glb  # Already added
└── sounds/
```

## Quick Test

After downloading, refresh your browser and the game will automatically load the 3D models!
