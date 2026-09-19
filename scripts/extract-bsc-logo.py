from PIL import Image, ImageChops

source = "/home/ubuntu/upload/Screenshot2026-09-18at2.53.11PM.png"
out = "/home/ubuntu/procurewise/client/public/bsc-procurewise-logo.png"
image = Image.open(source).convert("RGBA")
# Preserve the complete supplied wordmark while removing only uniform surrounding white.
background = Image.new("RGBA", image.size, (255, 255, 255, 255))
diff = ImageChops.difference(image, background).convert("L")
box = diff.point(lambda value: 255 if value > 10 else 0).getbbox()
if box:
    left, top, right, bottom = box
    padding = 4
    box = (max(0, left-padding), max(0, top-padding), min(image.width, right+padding), min(image.height, bottom+padding))
    image = image.crop(box)
image.save(out, optimize=True)
print(f"saved {out} {image.size[0]}x{image.size[1]}")
