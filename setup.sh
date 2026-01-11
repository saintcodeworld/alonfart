#!/bin/bash

echo "Setting up Minecraft Clicker assets..."

cd "$(dirname "$0")"

echo "Creating placeholder sound files..."
touch assets/sounds/hit.mp3
touch assets/sounds/break.mp3
touch assets/sounds/coin.mp3
touch assets/sounds/buy.mp3

echo "✓ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Open create_placeholders.html in your browser"
echo "2. Click 'Generate All Placeholders' button"
echo "3. Move all downloaded PNG files to the assets/ folder"
echo "4. Open index.html to play the game"
echo ""
echo "For better experience, replace placeholders with real Minecraft assets."
echo "See assets/ASSETS_README.md for instructions."
