"""Shared deterministic image preparation used by training and inference."""

from PIL import Image, ImageOps

IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)
PREPROCESSING_VERSION = "letterbox-rgb-imagenet-v1"


def letterbox_rgb(image: Image.Image, image_size: int = 224) -> Image.Image:
    """Orient and fit the full frame into a square without cropping or distortion.

    The canvas fill approximates the ImageNet mean, so it becomes near-zero after
    the shared ImageNet normalization used by the classifier.
    """
    if image_size < 1:
        raise ValueError("image_size must be a positive integer")

    image = ImageOps.exif_transpose(image).convert("RGB")
    width, height = image.size
    if width < 1 or height < 1:
        raise ValueError("Image dimensions must be positive")

    scale = min(image_size / width, image_size / height)
    resized_width = max(1, min(image_size, round(width * scale)))
    resized_height = max(1, min(image_size, round(height * scale)))
    resized = image.resize((resized_width, resized_height), Image.Resampling.BILINEAR)

    fill = tuple(round(channel * 255) for channel in IMAGENET_MEAN)
    canvas = Image.new("RGB", (image_size, image_size), fill)
    left = (image_size - resized_width) // 2
    top = (image_size - resized_height) // 2
    canvas.paste(resized, (left, top))
    return canvas
