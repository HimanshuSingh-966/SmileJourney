"""CPU inference for the experimental multi-category prototype checkpoint."""

from functools import lru_cache
from io import BytesIO

import numpy as np
import torch
from PIL import Image
from torch import nn
from torchvision import models
from huggingface_hub import hf_hub_download

from app.core.config import get_settings
from app.services.image_preprocessing import (
    IMAGENET_MEAN,
    IMAGENET_STD,
    PREPROCESSING_VERSION,
    letterbox_rgb,
)


class InferenceUnavailable(RuntimeError):
    """Raised when the trained model cannot be loaded or used."""


MODEL_CATEGORIES = ("crowding", "gaps", "discoloration", "gum_line", "symmetry")
MODEL_CLASSES = ("none", "mild", "moderate", "severe")
FINDING_METADATA = (
    ("crowding/alignment", "Crowding / Alignment"),
    ("gaps", "Interdental Gaps"),
    ("discoloration", "Tooth Discoloration"),
    ("gum line", "Gum Line"),
    ("symmetry", "Smile Symmetry"),
)


def _build_model(backbone: str, dropout: float) -> nn.Module:
    output_count = len(MODEL_CATEGORIES) * len(MODEL_CLASSES)
    if backbone == "resnet18":
        model = models.resnet18(weights=None)
        model.fc = nn.Sequential(nn.Dropout(dropout), nn.Linear(model.fc.in_features, output_count))
        return model
    if backbone == "efficientnet_b0":
        model = models.efficientnet_b0(weights=None)
        model.classifier = nn.Sequential(
            nn.Dropout(dropout), nn.Linear(model.classifier[1].in_features, output_count)
        )
        return model
    raise InferenceUnavailable(f"Unsupported model backbone in checkpoint: {backbone!r}.")


@lru_cache(maxsize=1)
def _load_model(repo_id: str, token: str | None) -> tuple[nn.Module, int]:
    """Download and cache the checkpoint once per running backend process."""
    try:
        checkpoint_path = hf_hub_download(
            repo_id=repo_id,
            repo_type="model",
            filename="best_prototype.pt",
            token=token,
        )
        checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=True)
    except Exception as exc:
        raise InferenceUnavailable("The model checkpoint could not be downloaded or loaded.") from exc

    if not isinstance(checkpoint, dict):
        raise InferenceUnavailable("The model checkpoint has an invalid format.")
    if tuple(checkpoint.get("categories", ())) != MODEL_CATEGORIES:
        raise InferenceUnavailable("The checkpoint category order does not match this API.")
    if tuple(checkpoint.get("classes", ())) != MODEL_CLASSES:
        raise InferenceUnavailable("The checkpoint severity labels do not match this API.")
    if checkpoint.get("preprocessing_version") != PREPROCESSING_VERSION:
        raise InferenceUnavailable("The checkpoint preprocessing version does not match this backend.")

    image_size = checkpoint.get("image_size")
    if not isinstance(image_size, int) or isinstance(image_size, bool) or image_size < 1:
        raise InferenceUnavailable("The checkpoint has an invalid image size.")
    backbone = checkpoint.get("backbone")
    dropout = checkpoint.get("dropout")
    state_dict = checkpoint.get("model_state_dict")
    if not isinstance(backbone, str) or not isinstance(dropout, (int, float)) or not isinstance(state_dict, dict):
        raise InferenceUnavailable("The checkpoint is missing model configuration or weights.")

    try:
        model = _build_model(backbone, float(dropout))
        model.load_state_dict(state_dict, strict=True)
    except Exception as exc:
        raise InferenceUnavailable("The checkpoint weights do not match the configured model.") from exc
    model.eval()
    return model, image_size


def _prepare_image(photo_bytes: bytes, image_size: int) -> torch.Tensor:
    try:
        with Image.open(BytesIO(photo_bytes)) as source:
            # Match training.data.SmileLabelDataset, which converts the decoded image to RGB first.
            prepared = letterbox_rgb(source.convert("RGB"), image_size)
            pixels = np.asarray(prepared, dtype=np.float32) / 255.0
    except Exception as exc:
        raise InferenceUnavailable("The uploaded image could not be prepared for inference.") from exc

    tensor = torch.from_numpy(pixels).permute(2, 0, 1).contiguous()
    mean = torch.tensor(IMAGENET_MEAN, dtype=tensor.dtype).view(3, 1, 1)
    std = torch.tensor(IMAGENET_STD, dtype=tensor.dtype).view(3, 1, 1)
    return ((tensor - mean) / std).unsqueeze(0)


def _finding_description(severity: str) -> str:
    display = "No visible issue" if severity == "none" else severity.capitalize()
    return (
        f"Prototype model label: {display}. This experimental image classification may be inaccurate "
        "and is not a dental diagnosis."
    )


def analyze_photo(photo_bytes: bytes, content_type: str) -> dict:
    """Return five model findings; overall score is calculated by the backend service."""
    del content_type  # Image type and size have already been validated by the upload route.
    settings = get_settings()
    if not settings.hf_model_repo:
        raise InferenceUnavailable("No trained model repository is configured.")

    model, image_size = _load_model(settings.hf_model_repo, settings.hf_token)
    input_tensor = _prepare_image(photo_bytes, image_size)
    try:
        with torch.inference_mode():
            logits = model(input_tensor).reshape(1, len(MODEL_CATEGORIES), len(MODEL_CLASSES))
            predictions = logits.argmax(dim=-1).squeeze(0).tolist()
    except Exception as exc:
        raise InferenceUnavailable("The model could not analyze the uploaded image.") from exc

    findings = []
    for index, (api_category, title) in enumerate(FINDING_METADATA):
        severity = MODEL_CLASSES[predictions[index]]
        finding_key = api_category.replace("/", "-").replace(" ", "-")
        findings.append(
            {
                "id": f"finding-{finding_key}",
                "category": api_category,
                "title": title,
                "severity": severity,
                "description": _finding_description(severity),
            }
        )

    return {"findings": findings}
