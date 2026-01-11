#!/bin/bash

cd "$(dirname "$0")"
cd assets

echo "Creating SVG placeholder assets..."

cat > grass_block.png << 'EOF'
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="358" fill="#7cbd6b"/>
  <rect y="358" width="512" height="154" fill="#8b4513"/>
  <rect x="50" y="30" width="2" height="3" fill="#4a5d23"/>
  <rect x="150" y="80" width="2" height="3" fill="#4a5d23"/>
  <rect x="250" y="120" width="2" height="3" fill="#4a5d23"/>
  <rect x="350" y="200" width="2" height="3" fill="#4a5d23"/>
</svg>
EOF

for i in {1..4}; do
cat > crack_${i}.png << EOF
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <line x1="100" y1="50" x2="200" y2="300" stroke="black" stroke-width="$((i*2))" opacity="0.$((i*2))"/>
  <line x1="300" y1="100" x2="150" y2="400" stroke="black" stroke-width="$((i*2))" opacity="0.$((i*2))"/>
  <line x1="400" y1="200" x2="250" y2="450" stroke="black" stroke-width="$((i*2))" opacity="0.$((i*2))"/>
</svg>
EOF
done

cat > hand.png << 'EOF'
<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
  <rect x="50" y="100" width="70" height="130" fill="#d4a574"/>
  <rect x="60" y="115" width="40" height="25" fill="#c19463"/>
</svg>
EOF

cat > wooden_pickaxe.png << 'EOF'
<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
  <rect x="75" y="128" width="35" height="102" fill="#654321"/>
  <polygon points="50,76 150,76 125,51 75,51" fill="#8b4513"/>
  <rect x="38" y="178" width="62" height="52" fill="#d4a574"/>
</svg>
EOF

cat > stone_pickaxe.png << 'EOF'
<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
  <rect x="75" y="128" width="35" height="102" fill="#654321"/>
  <polygon points="50,76 150,76 125,51 75,51" fill="#808080"/>
  <rect x="38" y="178" width="62" height="52" fill="#d4a574"/>
</svg>
EOF

cat > iron_pickaxe.png << 'EOF'
<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
  <rect x="75" y="128" width="35" height="102" fill="#654321"/>
  <polygon points="50,76 150,76 125,51 75,51" fill="#c0c0c0"/>
  <rect x="38" y="178" width="62" height="52" fill="#d4a574"/>
</svg>
EOF

cat > gold_pickaxe.png << 'EOF'
<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
  <rect x="75" y="128" width="35" height="102" fill="#654321"/>
  <polygon points="50,76 150,76 125,51 75,51" fill="#ffd700"/>
  <rect x="38" y="178" width="62" height="52" fill="#d4a574"/>
</svg>
EOF

cat > platinum_pickaxe.png << 'EOF'
<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
  <rect x="75" y="128" width="35" height="102" fill="#654321"/>
  <polygon points="50,76 150,76 125,51 75,51" fill="#4dd0e1"/>
  <rect x="38" y="178" width="62" height="52" fill="#d4a574"/>
</svg>
EOF

cat > netherite_pickaxe.png << 'EOF'
<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
  <rect x="75" y="128" width="35" height="102" fill="#654321"/>
  <polygon points="50,76 150,76 125,51 75,51" fill="#3d3d3d"/>
  <rect x="38" y="178" width="62" height="52" fill="#d4a574"/>
</svg>
EOF

cat > coin.png << 'EOF'
<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
  <circle cx="64" cy="64" r="54" fill="#ffd700"/>
  <circle cx="64" cy="64" r="44" fill="#ffed4e"/>
  <text x="64" y="80" font-size="60" font-weight="bold" text-anchor="middle" fill="#ffd700">$</text>
</svg>
EOF

echo "✓ All SVG placeholder assets created!"
echo ""
echo "Note: These are SVG files saved as .png (browsers will render them)"
echo "For better quality, replace with actual PNG Minecraft textures"
