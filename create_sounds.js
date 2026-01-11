// Simple sound generator for Mine Clicker game
// Run this with Node.js to create basic sound files

const fs = require('fs');

// Create minimal MP3 file headers (basic silent audio)
function createSilentMP3(filename) {
    // This creates a very basic MP3 file structure with silence
    const mp3Header = Buffer.from([
        0xFF, 0xFB, 0x90, 0x00, // MP3 header
        0x00, 0x00, 0x00, 0x00, // Silence data
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00
    ]);
    
    fs.writeFileSync(filename, mp3Header);
    console.log(`Created ${filename}`);
}

// Create all required sound files
const sounds = ['hit', 'break', 'coin', 'buy'];
sounds.forEach(sound => {
    createSilentMP3(`assets/sounds/${sound}.mp3`);
});

console.log('\nSound files created! You can now:');
console.log('1. Open index.html in your browser');
console.log('2. Click the cube to test sounds');
console.log('3. Replace these files with better sounds later');
