from io import BytesIO

from PIL import Image, UnidentifiedImageError


ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_DIMENSION = 12_000


class InvalidImage(ValueError):
    pass


def validate_image(content: bytes, declared_content_type: str) -> str:
    """Verify upload bytes are a decodable image and match the declared media type."""
    if declared_content_type not in ALLOWED_IMAGE_TYPES:
        raise InvalidImage("Upload a JPEG, PNG, or WebP image.")
    try:
        with Image.open(BytesIO(content)) as image:
            actual_type = Image.MIME.get(image.format)
            width, height = image.size
            if actual_type != declared_content_type:
                raise InvalidImage("The uploaded file type does not match its image content.")
            if width < 1 or height < 1 or width > MAX_IMAGE_DIMENSION or height > MAX_IMAGE_DIMENSION:
                raise InvalidImage("The image dimensions are not supported.")
            image.verify()
    except InvalidImage:
        raise
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise InvalidImage("The uploaded file is not a valid supported image.") from exc
    return declared_content_type
