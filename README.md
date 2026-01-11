# Minecraft Clicker Game

A browser-based Minecraft-inspired clicker game where players break blocks to earn coins and upgrade their tools.

## Game Features

### Core Mechanics
- **Click to Break**: Click the cube to break it and earn coins
- **Progressive Damage**: Cube shows cracks as you hit it
- **Tool Upgrades**: Purchase better tools to break blocks faster and earn more coins
- **Persistent Progress**: Your progress is automatically saved to browser localStorage

### Tool Progression
1. **Hand** (Starting tool) - 4 hits → 1 coin
2. **Wooden Pickaxe** - 500 coins - 2 hits → 1 coin
3. **Stone Pickaxe** - 1,500 coins - 1 hit → 1 coin
4. **Iron Pickaxe** - 2,500 coins - 1 hit → 2 coins
5. **Gold Pickaxe** - 3,500 coins - 1 hit → 3.5 coins
6. **Platinum Pickaxe** - 5,000 coins - 1 hit → 8 coins
7. **Netherite Pickaxe** - 10,000 coins - 1 hit → 15 coins

### Shop System
- Tools must be purchased in order (chronological progression)
- You cannot skip to higher-tier tools without buying previous ones
- Once purchased, tools can be equipped/switched at any time
- Always-visible sidebar shop for easy access

## Setup Instructions

### 1. Add Minecraft Assets

The game requires Minecraft textures and sounds to work properly. See `assets/ASSETS_README.md` for detailed instructions.

**Required Assets:**
- Grass block texture
- Crack/destroy stage textures (4 stages)
- Hand and pickaxe POV images (7 total)
- Coin icon
- Sound effects (hit, break, coin, buy)

### 2. Running the Game

Simply open `index.html` in a modern web browser:
- Chrome (recommended)
- Firefox
- Safari
- Edge

**No build process or server required!**

### 3. Controls

- **Left Click** on cube to hit it
- **Click** shop items to purchase/equip tools
- Progress saves automatically

## File Structure

```
mineclicker-main/
├── index.html          # Main HTML structure
├── style.css           # Game styling and animations
├── game.js            # Game logic and mechanics
├── README.md          # This file
└── assets/
    ├── ASSETS_README.md    # Asset acquisition guide
    ├── sounds/             # Sound effects folder
    │   ├── hit.mp3
    │   ├── break.mp3
    │   ├── coin.mp3
    │   └── buy.mp3
    ├── grass_block.png
    ├── crack_1.png to crack_4.png
    ├── hand.png
    ├── wooden_pickaxe.png
    ├── stone_pickaxe.png
    ├── iron_pickaxe.png
    ├── gold_pickaxe.png
    ├── platinum_pickaxe.png
    ├── netherite_pickaxe.png
    └── coin.png
```

## Technical Details

### Technologies Used
- HTML5
- CSS3 (3D transforms, animations)
- Vanilla JavaScript (ES6+)
- LocalStorage API for save system

### Browser Compatibility
- Requires modern browser with CSS 3D transform support
- Audio API for sound effects
- LocalStorage for save data

### Key Features
- 3D cube rendering with CSS transforms
- Progressive crack overlay system
- Tool swing animation
- Smooth coin counter updates
- Floating coin popup notifications
- Responsive sidebar shop
- Auto-save functionality

## Game Logic

### Hit System
```javascript
// Each tool has specific hit requirements
Hand: 4 hits to break
Wooden: 2 hits to break
All others: 1 hit to break
```

### Coin Calculation
```javascript
// Coins earned per broken block
coinsEarned = tool.coinsPerBreak
```

### Unlock Requirements
- Tools unlock sequentially
- Previous tool must be purchased
- Sufficient coins required
- Chronological progression enforced

## Future Enhancements (Planned)

- [ ] Phantom Wallet integration for token withdrawals
- [ ] Multiplayer leaderboards
- [ ] Additional block types
- [ ] Achievement system
- [ ] Prestige/rebirth mechanics
- [ ] Auto-clicker upgrades
- [ ] Particle effects
- [ ] More sound variations

## Development Notes

### Adding New Tools
Edit the `TOOLS` array in `game.js`:
```javascript
{ 
    name: 'Tool Name',
    hits: 1,
    coinsPerBreak: 10,
    cost: 15000,
    image: 'assets/tool.png'
}
```

### Modifying Game Balance
Adjust values in the `TOOLS` array to change:
- Hit requirements per tool
- Coins earned per break
- Purchase costs
- Tool progression

### Custom Styling
Edit `style.css` to customize:
- Color schemes
- Animation speeds
- UI layout
- Particle effects

## Credits

- Game concept: Minecraft-inspired clicker
- Built with: HTML5, CSS3, JavaScript
- Assets: Minecraft (Mojang Studios/Microsoft)

## License

Game code: Free to use and modify
Minecraft assets: Property of Mojang Studios/Microsoft

---

**Note**: This game is a fan project and is not affiliated with or endorsed by Mojang Studios or Microsoft.
