import os
import math
from PIL import Image, ImageDraw, ImageFilter, ImageFont

def draw_rounded_rect(draw, bbox, radius, fill=None, outline=None, width=1):
    draw.rounded_rectangle(bbox, radius=radius, fill=fill, outline=outline, width=width)

def render_flame(size):
    """Render a stylized, glossy 3D multi-layered flame at given (w, h)."""
    w, h = size
    flame_img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(flame_img)

    # Outer Glow/Flame Points (Outer fire: Crimson/Red -> Orange)
    outer_points = [
        (w * 0.50, h * 0.05),
        (w * 0.68, h * 0.28),
        (w * 0.85, h * 0.52),
        (w * 0.82, h * 0.78),
        (w * 0.65, h * 0.95),
        (w * 0.35, h * 0.95),
        (w * 0.18, h * 0.78),
        (w * 0.15, h * 0.52),
        (w * 0.32, h * 0.28),
    ]
    # Draw soft red/pink glow
    d.polygon(outer_points, fill=(255, 56, 56, 255))

    # Mid Flame (Vibrant Golden Amber)
    mid_points = [
        (w * 0.50, h * 0.20),
        (w * 0.65, h * 0.40),
        (w * 0.74, h * 0.65),
        (w * 0.60, h * 0.88),
        (w * 0.40, h * 0.88),
        (w * 0.26, h * 0.65),
        (w * 0.35, h * 0.40),
    ]
    d.polygon(mid_points, fill=(255, 159, 26, 255))

    # Inner Core Flame (Bright Yellow / White Core)
    core_points = [
        (w * 0.50, h * 0.38),
        (w * 0.60, h * 0.55),
        (w * 0.64, h * 0.75),
        (w * 0.50, h * 0.84),
        (w * 0.36, h * 0.75),
        (w * 0.40, h * 0.55),
    ]
    d.polygon(core_points, fill=(255, 242, 0, 255))

    # White Hot Center Highlight
    white_points = [
        (w * 0.50, h * 0.50),
        (w * 0.55, h * 0.65),
        (w * 0.50, h * 0.78),
        (w * 0.45, h * 0.65),
    ]
    d.polygon(white_points, fill=(255, 255, 255, 230))

    # Apply a gentle anti-alias blur
    flame_img = flame_img.filter(ImageFilter.GaussianBlur(radius=w * 0.015))
    return flame_img

def draw_sparkle(draw, center, radius, color):
    cx, cy = center
    # 4-point star sparkle
    r1 = radius
    r2 = radius * 0.25
    pts = [
        (cx, cy - r1),
        (cx + r2, cy - r2),
        (cx + r1, cy),
        (cx + r2, cy + r2),
        (cx, cy + r1),
        (cx - r2, cy + r2),
        (cx - r1, cy),
        (cx - r2, cy - r2),
    ]
    draw.polygon(pts, fill=color)

def create_card_image(card_w, card_h, bg_color_top, bg_color_bot, border_color, bevel_color):
    card = Image.new('RGBA', (card_w, card_h), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)

    # Vertical gradient for card face
    rad = int(card_w * 0.16)
    # 3D Bottom Bevel / Rim
    bevel_offset = int(card_h * 0.025)
    d.rounded_rectangle([0, bevel_offset, card_w, card_h], radius=rad, fill=bevel_color)

    # Gradient face
    for y in range(card_h - bevel_offset):
        ratio = y / float(card_h - bevel_offset)
        r = int(bg_color_top[0] * (1 - ratio) + bg_color_bot[0] * ratio)
        g = int(bg_color_top[1] * (1 - ratio) + bg_color_bot[1] * ratio)
        b = int(bg_color_top[2] * (1 - ratio) + bg_color_bot[2] * ratio)
        # We can draw line clamped inside rounded rectangle by masking

    # Simpler & super clean: draw base face + gloss
    d.rounded_rectangle([0, 0, card_w, card_h - bevel_offset], radius=rad, fill=bg_color_top, outline=border_color, width=int(card_w * 0.02))

    # Top inner glossy highlight
    gloss_h = int(card_h * 0.35)
    d.rounded_rectangle([int(card_w * 0.04), int(card_w * 0.04), card_w - int(card_w * 0.04), gloss_h], radius=rad//2, fill=(255, 255, 255, 25))

    return card

def render_master_icon(size=2048, is_foreground_only=False):
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    if not is_foreground_only:
        # 1. Background Cosmic Radial Glow
        max_r = int(size * 0.72)
        cx, cy = size // 2, size // 2
        for r in range(max_r, 0, -6):
            ratio = r / float(max_r)
            cr = int(32 * (1 - ratio) + 7 * ratio)
            cg = int(18 * (1 - ratio) + 9 * ratio)
            cb = int(60 * (1 - ratio) + 19 * ratio)
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(cr, cg, cb, 255))

        # Subtle glowing neon ring in the background
        ring_r = int(size * 0.44)
        for i in range(12, 0, -1):
            alpha = int(40 * (1 - i / 12.0))
            draw.ellipse([cx - ring_r - i*2, cy - ring_r - i*2, cx + ring_r + i*2, cy + ring_r + i*2],
                         outline=(108, 92, 231, alpha), width=3)
        draw.ellipse([cx - ring_r, cy - ring_r, cx + ring_r, cy + ring_r],
                     outline=(162, 155, 254, 80), width=4)

    # Scale factor for card elements
    scale = 0.72 if is_foreground_only else 1.0
    cw = int(size * 0.46 * scale)
    ch = int(size * 0.62 * scale)

    # 2. Back Card (Cyan / Emerald team glow, tilted -14 deg)
    back_card = create_card_image(cw, ch, (14, 22, 38), (10, 15, 28), (0, 223, 216, 200), (8, 90, 80))
    back_rot = back_card.rotate(14, resample=Image.BICUBIC, expand=True)
    bx = (size - back_rot.width) // 2 - int(size * 0.08 * scale)
    by = (size - back_rot.height) // 2 - int(size * 0.04 * scale)
    canvas.paste(back_rot, (bx, by), back_rot)

    # 3. Main Front Card (Deep Royal Navy, tilted -5 deg)
    front_card = create_card_image(cw, ch, (22, 28, 56), (15, 18, 38), (253, 121, 168, 220), (35, 20, 60))
    fd = ImageDraw.Draw(front_card)

    # Inner Content on Front Card
    # A. Top Header Ribbon for "TABU"
    ribbon_y = int(ch * 0.08)
    ribbon_h = int(ch * 0.22)
    fd.rounded_rectangle([int(cw * 0.08), ribbon_y, cw - int(cw * 0.08), ribbon_y + ribbon_h],
                         radius=int(cw * 0.08), fill=(108, 92, 231, 230), outline=(255, 255, 255, 120), width=int(cw * 0.015))

    # Load Font for TABU
    font_size_tabu = int(ribbon_h * 0.72)
    try:
        font_tabu = ImageFont.truetype('segoeuib.ttf', font_size_tabu)
    except:
        font_tabu = ImageFont.truetype('arialbd.ttf', font_size_tabu)

    text_bbox = font_tabu.getbbox('TABU')
    tw = text_bbox[2] - text_bbox[0]
    th = text_bbox[3] - text_bbox[1]
    tx = (cw - tw) // 2 - text_bbox[0]
    ty = ribbon_y + (ribbon_h - th) // 2 - text_bbox[1] - int(ch * 0.01)

    # 3D Shadow for TABU text
    fd.text((tx, ty + int(ch * 0.012)), 'TABU', font=font_tabu, fill=(50, 30, 110, 255))
    fd.text((tx, ty), 'TABU', font=font_tabu, fill=(255, 255, 255, 255))

    # B. Center Flame on Front Card
    flame_w = int(cw * 0.60)
    flame_h = int(ch * 0.38)
    flame = render_flame((flame_w, flame_h))
    flame_x = (cw - flame_w) // 2
    flame_y = ribbon_y + ribbon_h + int(ch * 0.04)
    front_card.paste(flame, (flame_x, flame_y), flame)

    # C. Prohibition Slash across Flame (3D Metallic Warning Bar)
    # Bold diagonal slash across center
    slash_img = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    sd = ImageDraw.Draw(slash_img)
    # Circle with diagonal slash
    circ_center = (cw // 2, flame_y + flame_h // 2)
    circ_rad = int(flame_w * 0.44)

    # Outer Red Ring with 3D bevel
    sd.ellipse([circ_center[0] - circ_rad, circ_center[1] - circ_rad,
                circ_center[0] + circ_rad, circ_center[1] + circ_rad],
               outline=(255, 71, 87, 230), width=int(cw * 0.045))
    # Diagonal Bar
    dx = int(circ_rad * 0.707)
    sd.line([circ_center[0] - dx, circ_center[1] + dx,
             circ_center[0] + dx, circ_center[1] - dx],
            fill=(255, 71, 87, 240), width=int(cw * 0.045))
    # White Highlight
    sd.line([circ_center[0] - dx + 2, circ_center[1] + dx - 2,
             circ_center[0] + dx - 2, circ_center[1] - dx + 2],
            fill=(255, 255, 255, 160), width=int(cw * 0.015))
    front_card.paste(slash_img, (0, 0), slash_img)

    # D. Bottom "PRO 3D" Neon Capsule Badge
    badge_y = int(ch * 0.80)
    badge_h = int(ch * 0.12)
    badge_w = int(cw * 0.65)
    badge_x = (cw - badge_w) // 2
    fd.rounded_rectangle([badge_x, badge_y, badge_x + badge_w, badge_y + badge_h],
                         radius=badge_h // 2, fill=(15, 20, 42, 230), outline=(0, 223, 216, 220), width=int(cw * 0.015))

    font_size_pro = int(badge_h * 0.58)
    try:
        font_pro = ImageFont.truetype('segoeuib.ttf', font_size_pro)
    except:
        font_pro = ImageFont.truetype('arialbd.ttf', font_size_pro)
    pro_bbox = font_pro.getbbox('PRO 3D')
    pw = pro_bbox[2] - pro_bbox[0]
    ph = pro_bbox[3] - pro_bbox[1]
    px = badge_x + (badge_w - pw) // 2 - pro_bbox[0]
    py = badge_y + (badge_h - ph) // 2 - pro_bbox[1]
    fd.text((px, py), 'PRO 3D', font=font_pro, fill=(0, 223, 216, 255))

    # Rotate Front Card by -6 degrees for dynamic 3D angle
    front_rot = front_card.rotate(-6, resample=Image.BICUBIC, expand=True)

    # Create soft drop shadow behind front card
    shadow_pad = int(size * 0.08)
    shadow_mask = front_rot.split()[3].filter(ImageFilter.GaussianBlur(radius=int(size * 0.03 * scale)))
    shadow_layer = Image.new('RGBA', front_rot.size, (0, 0, 0, 180))
    shadow_layer.putalpha(shadow_mask)

    fx = (size - front_rot.width) // 2 + int(size * 0.02 * scale)
    fy = (size - front_rot.height) // 2 + int(size * 0.02 * scale)

    # Paste shadow with downward offset
    canvas.paste(shadow_layer, (fx, fy + int(size * 0.03 * scale)), shadow_layer)
    # Paste front card
    canvas.paste(front_rot, (fx, fy), front_rot)

    # 4. Floating Sparkles / Golden Diamonds around the cards
    sparkles = [
        ((int(size * 0.22), int(size * 0.24)), int(size * 0.032), (255, 242, 0, 240)),
        ((int(size * 0.82), int(size * 0.28)), int(size * 0.028), (0, 223, 216, 240)),
        ((int(size * 0.80), int(size * 0.76)), int(size * 0.024), (253, 121, 168, 240)),
        ((int(size * 0.18), int(size * 0.68)), int(size * 0.020), (255, 242, 0, 200)),
        ((int(size * 0.32), int(size * 0.16)), int(size * 0.016), (255, 255, 255, 220)),
    ]
    for pt, r, col in sparkles:
        draw_sparkle(draw, pt, r, col)

    return canvas

def generate_all():
    print('1. Rendering Master 2048x2048 Icon...')
    master_icon = render_master_icon(2048, is_foreground_only=False)

    print('2. Rendering Master 2048x2048 Adaptive Foreground...')
    adaptive_fg = render_master_icon(2048, is_foreground_only=True)

    # Assets directory
    assets_dir = 'react-native-tabu/assets'
    os.makedirs(assets_dir, exist_ok=True)

    # 1. icon.png (1024x1024)
    print('Saving assets/icon.png (1024x1024)...')
    icon_1024 = master_icon.resize((1024, 1024), Image.LANCZOS)
    icon_1024.save(os.path.join(assets_dir, 'icon.png'), 'PNG', optimize=True)

    # 2. adaptive-icon.png (1024x1024)
    print('Saving assets/adaptive-icon.png (1024x1024)...')
    adaptive_1024 = adaptive_fg.resize((1024, 1024), Image.LANCZOS)
    adaptive_1024.save(os.path.join(assets_dir, 'adaptive-icon.png'), 'PNG', optimize=True)

    # 3. splash.png (1024x1024)
    print('Saving assets/splash.png (1024x1024)...')
    icon_1024.save(os.path.join(assets_dir, 'splash.png'), 'PNG', optimize=True)

    # 4. favicon.png (48x48)
    print('Saving assets/favicon.png (48x48)...')
    fav = master_icon.resize((48, 48), Image.LANCZOS)
    fav.save(os.path.join(assets_dir, 'favicon.png'), 'PNG', optimize=True)

    # 5. Android Native Mipmaps
    res_base = 'react-native-tabu/android/app/src/main/res'
    densities = {
        'mipmap-mdpi': (48, 108),
        'mipmap-hdpi': (72, 162),
        'mipmap-xhdpi': (96, 216),
        'mipmap-xxhdpi': (144, 324),
        'mipmap-xxxhdpi': (192, 432),
    }

    for folder, (icon_sz, fg_sz) in densities.items():
        target_dir = os.path.join(res_base, folder)
        os.makedirs(target_dir, exist_ok=True)
        print(f'Generating Android {folder} ({icon_sz}x{icon_sz}, fg: {fg_sz}x{fg_sz})...')

        # Standard launcher
        std_icon = master_icon.resize((icon_sz, icon_sz), Image.LANCZOS)
        std_icon.save(os.path.join(target_dir, 'ic_launcher.webp'), 'WEBP', quality=95)

        # Round launcher (Circle mask)
        round_icon = Image.new('RGBA', (icon_sz, icon_sz), (0, 0, 0, 0))
        mask = Image.new('L', (icon_sz, icon_sz), 0)
        md = ImageDraw.Draw(mask)
        md.ellipse([0, 0, icon_sz - 1, icon_sz - 1], fill=255)
        round_icon.paste(std_icon, (0, 0), mask)
        round_icon.save(os.path.join(target_dir, 'ic_launcher_round.webp'), 'WEBP', quality=95)

        # Adaptive foreground
        fg_icon = adaptive_fg.resize((fg_sz, fg_sz), Image.LANCZOS)
        fg_icon.save(os.path.join(target_dir, 'ic_launcher_foreground.webp'), 'WEBP', quality=95)

    print('All icons generated successfully with pristine quality!')

if __name__ == '__main__':
    generate_all()
