# Sound Files Setup

The game requires 4 sound files in this directory:

1. **hit.mp3** - Plays when clicking the cube
2. **break.mp3** - Plays when the cube breaks
3. **coin.mp3** - Plays when earning coins
4. **buy.mp3** - Plays when purchasing upgrades

## Quick Setup Options:

### Option 1: Download Free Sounds
Visit these sites for free sound effects:
- https://freesound.org/
- https://mixkit.co/free-sound-effects/
- https://pixabay.com/sound-effects/

Recommended searches:
- hit.mp3: "punch", "hit", "impact"
- break.mp3: "break", "shatter", "crack"
- coin.mp3: "coin", "pickup", "ding"
- buy.mp3: "purchase", "success", "powerup"

### Option 2: Use Text-to-Speech or Simple Beeps
You can use online tools to generate simple beep sounds or use macOS's built-in audio tools.

### Option 3: Create Placeholder Silence
Run these commands to create silent MP3 files (requires ffmpeg):
```bash
ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 0.5 -q:a 9 -acodec libmp3lame hit.mp3
ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 0.5 -q:a 9 -acodec libmp3lame break.mp3
ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 0.5 -q:a 9 -acodec libmp3lame coin.mp3
ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 0.5 -q:a 9 -acodec libmp3lame buy.mp3
```

## Current Status
The game code is already configured to play these sounds. Once you add the MP3 files to this directory, the sounds will work automatically.
