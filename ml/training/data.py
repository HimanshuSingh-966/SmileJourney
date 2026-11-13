import csv
import sys
from pathlib import Path
from typing import Any

import numpy as np
import torch
from PIL import Image, ImageFile
from torch.utils.data import Dataset
from torchvision import transforms

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from backend.app.services.image_preprocessing import IMAGENET_MEAN, IMAGENET_STD, letterbox_rgb

ImageFile.LOAD_TRUNCATED_IMAGES = False

CATEGORIES = ("crowding", "gaps", "discoloration", "gum_line", "symmetry")
CLASSES = ("none", "mild", "moderate", "severe")
CLASS_TO_INDEX = {label: index for index, label in enumerate(CLASSES)}


class DatasetValidationError(ValueError):
    pass


class LetterboxTransform:
    def __init__(self, image_size: int):
        self.image_size = image_size

    def __call__(self, image: Image.Image) -> Image.Image:
        return letterbox_rgb(image, self.image_size)


def load_manifest(csv_path: Path, image_dir: Path) -> tuple[list[dict[str, Any]], np.ndarray]:
    if not csv_path.is_file():
        raise DatasetValidationError(f"Labels CSV not found: {csv_path}")
    if not image_dir.is_dir():
        raise DatasetValidationError(f"Image directory not found: {image_dir}")

    rows: list[dict[str, Any]] = []
    targets: list[list[int]] = []
    seen: set[str] = set()
    required = {"filename", *CATEGORIES}

    with csv_path.open("r", newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames or not required.issubset(reader.fieldnames):
            missing = sorted(required - set(reader.fieldnames or []))
            raise DatasetValidationError(f"CSV is missing required columns: {', '.join(missing)}")

        for line_number, row in enumerate(reader, start=2):
            filename = (row.get("filename") or "").strip()
            if not filename:
                raise DatasetValidationError(f"CSV line {line_number} has no filename.")
            key = filename.casefold()
            if key in seen:
                raise DatasetValidationError(f"Duplicate filename in CSV: {filename}")
            seen.add(key)

            image_path = (image_dir / filename).resolve()
            if image_dir.resolve() not in image_path.parents:
                raise DatasetValidationError(f"Image path escapes the dataset folder: {filename}")
            if not image_path.is_file():
                raise DatasetValidationError(f"Image referenced at CSV line {line_number} is missing: {filename}")

            encoded: list[int] = []
            for category in CATEGORIES:
                value = (row.get(category) or "").strip().lower()
                if value not in CLASS_TO_INDEX:
                    raise DatasetValidationError(
                        f"CSV line {line_number} has unsupported {category} label {value!r}; "
                        f"expected one of {', '.join(CLASSES)}."
                    )
                encoded.append(CLASS_TO_INDEX[value])

            rows.append({"filename": filename, "path": image_path})
            targets.append(encoded)

    if not rows:
        raise DatasetValidationError("The labels CSV contains no data rows.")
    return rows, np.asarray(targets, dtype=np.int64)


def make_transforms(image_size: int, training: bool) -> transforms.Compose:
    operations: list[Any] = [LetterboxTransform(image_size)]
    if training:
        # Horizontal flipping preserves issue labels and avoids changing tooth color.
        operations.append(transforms.RandomHorizontalFlip(p=0.5))
    operations.extend([
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])
    return transforms.Compose(operations)


class SmileLabelDataset(Dataset):
    def __init__(self, rows: list[dict[str, Any]], targets: np.ndarray, image_size: int, training: bool):
        self.rows = rows
        self.targets = targets
        self.transform = make_transforms(image_size, training)

    def __len__(self) -> int:
        return len(self.rows)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, torch.Tensor]:
        row = self.rows[index]
        try:
            with Image.open(row["path"]) as source:
                image = source.convert("RGB")
        except Exception as exc:
            raise DatasetValidationError(f"Could not decode image {row['filename']}: {exc}") from exc
        return self.transform(image), torch.tensor(self.targets[index], dtype=torch.long)


def split_indices(targets: np.ndarray, seed: int, train_fraction: float, validation_fraction: float, test_fraction: float):
    total = train_fraction + validation_fraction + test_fraction
    if not np.isclose(total, 1.0, atol=1e-6):
        raise ValueError("Train, validation, and test fractions must sum to 1.0.")
    if min(train_fraction, validation_fraction, test_fraction) <= 0:
        raise ValueError("Each dataset split must have a positive fraction.")

    # Iterative stratification balances the one-hot category/class labels as far as
    # possible. Rare classes may still be absent from a small split; report that.
    from iterstrat.ml_stratifiers import MultilabelStratifiedShuffleSplit

    encoded = np.concatenate(
        [(targets == class_index).astype(np.int8) for class_index in range(len(CLASSES))],
        axis=1,
    )
    test_split = MultilabelStratifiedShuffleSplit(n_splits=1, test_size=test_fraction, random_state=seed)
    train_val_indices, test_indices = next(test_split.split(np.zeros(len(targets)), encoded))
    relative_val = validation_fraction / (train_fraction + validation_fraction)
    val_split = MultilabelStratifiedShuffleSplit(n_splits=1, test_size=relative_val, random_state=seed + 1)
    train_rel, val_rel = next(val_split.split(np.zeros(len(train_val_indices)), encoded[train_val_indices]))
    return train_val_indices[train_rel], train_val_indices[val_rel], test_indices
