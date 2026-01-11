#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
import os

assets_dir = 'assets'
os.makedirs(assets_dir, exist_ok=True)
os.makedirs(f'{assets_dir}/sounds', exist_ok=True)

def create_grass_block():
    img = Image.new('RGB', (512, 512))
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, 512, 358], fill='#7cbd6b')
    draw.rectangle([0, 358, 512, 512], fill='#8b4513')
    for _ in range(100):
        import random
        x, y = random.randint(0, 512), random.randint(0, 358)
        draw.rectangle([x, y, x+2, y+3], fill='#4a5d23')
    img.save(f'{assets_dir}/grass_block.png')
    print('✓ Created grass_block.png')

def create_cracks():
    for level in range(1, 5):
        img = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        opacity = int(50 + level * 30)
        for _ in range(level + 3):
            import random
            coords = [(random.randint(0, 512), random.randint(0, 512)) for _ in range(3)]
            draw.line(coords, fill=(0, 0, 0, opacity), width=3 + level)
        img.save(f'{assets_dir}/crack_{level}.png')
        print(f'✓ Created crack_{level}.png')

def create_hand():
    img = Image.new('RGBA', (256, 256), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rectangle([50, 100, 120, 230], fill='#d4a574')
    draw.rectangle([60, 115, 100, 140], fill='#c19463')
    img.save(f'{assets_dir}/hand.png')
    print('✓ Created hand.png')

def create_pickaxe(name, head_color, handle_color='#654321'):
    img = Image.new('RGBA', (256, 256), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rectangle([75, 128, 110, 230], fill=handle_color)
    draw.polygon([50, 76, 150, 76, 125, 51, 75, 51], fill=head_color)
    draw.rectangle([38, 178, 100, 230], fill='#d4a574')
    img.save(f'{assets_dir}/{name}')
    print(f'✓ Created {name}')

def create_coin():
    img = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.ellipse([10, 10, 118, 118], fill='#ffd700')
    draw.ellipse([20, 20, 108, 108], fill='#ffed4e')
    try:
        font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 60)
    except:
        font = ImageFont.load_default()
    draw.text((64, 64), '$', fill='#ffd700', anchor='mm', font=font)
    img.save(f'{assets_dir}/coin.png')
    print('✓ Created coin.png')

print('Generating placeholder assets...\n')

create_grass_block()
create_cracks()
create_hand()

pickaxes = [
    ('wooden_pickaxe.png', '#8b4513'),
    ('stone_pickaxe.png', '#808080'),
    ('iron_pickaxe.png', '#c0c0c0'),
    ('gold_pickaxe.png', '#ffd700'),
    ('platinum_pickaxe.png', '#4dd0e1'),
    ('netherite_pickaxe.png', '#3d3d3d')
]

for name, color in pickaxes:
    create_pickaxe(name, color)

create_coin()

print('\n✓ All placeholder images created successfully!')
print(f'Images saved to: {os.path.abspath(assets_dir)}/')
print('\nYou can now open index.html to play the game!')
print('For better visuals, replace with real Minecraft assets (see assets/ASSETS_README.md)')
