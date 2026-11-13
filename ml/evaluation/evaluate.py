import argparse
import json
from pathlib import Path

import numpy as np
import torch
import yaml
from torch.utils.data import DataLoader, Subset

from evaluation.metrics import classification_metrics
from training.data import CATEGORIES, CLASSES, SmileLabelDataset, load_manifest, split_indices
from training.model import build_model
from backend.app.services.image_preprocessing import PREPROCESSING_VERSION
from training.train import resolve_device

ML_ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description="Evaluate the held-out split for a prototype model.")
    parser.add_argument("--config", default="configs/default.yaml")
    parser.add_argument("--checkpoint", default="checkpoints/best_prototype.pt")
    args = parser.parse_args()
    config_path = Path(args.config)
    checkpoint_path = Path(args.checkpoint)
    if not config_path.is_absolute():
        config_path = ML_ROOT / config_path
    if not checkpoint_path.is_absolute():
        checkpoint_path = ML_ROOT / checkpoint_path
    config = yaml.safe_load(config_path.read_text(encoding="utf-8"))
    checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
    if checkpoint.get("preprocessing_version") != PREPROCESSING_VERSION:
        raise ValueError(
            "Checkpoint preprocessing does not match the current shared preprocessing. "
            "Train a new checkpoint before evaluating."
        )

    data_cfg = config["data"]
    rows, targets = load_manifest(ML_ROOT / data_cfg["labels_csv"], ML_ROOT / data_cfg["image_dir"])
    _, _, test_idx = split_indices(
        targets,
        int(config["seed"]),
        float(data_cfg["train_fraction"]),
        float(data_cfg["validation_fraction"]),
        float(data_cfg["test_fraction"]),
    )
    dataset = SmileLabelDataset(rows, targets, int(checkpoint["image_size"]), training=False)
    loader = DataLoader(Subset(dataset, test_idx), batch_size=int(data_cfg["batch_size"]), shuffle=False, num_workers=int(data_cfg["num_workers"]))
    device = resolve_device(config["training"].get("device", "auto"))
    model = build_model(checkpoint["backbone"], pretrained=False, dropout=checkpoint["dropout"])
    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(device).eval()

    actual, predicted = [], []
    with torch.no_grad():
        for images, labels in loader:
            logits = model(images.to(device)).reshape(-1, len(CATEGORIES), len(CLASSES))
            actual.append(labels.numpy())
            predicted.append(logits.argmax(dim=-1).cpu().numpy())
    y_true = np.concatenate(actual)
    y_pred = np.concatenate(predicted)
    metrics = classification_metrics(y_true, y_pred)
    metrics["prototype_warning"] = (
        "Small exploratory dataset only. Metrics are unstable, especially for rare severe classes, "
        "and do not establish clinical validity or user-facing readiness."
    )
    report_path = checkpoint_path.with_name("heldout_metrics.json")
    report_path.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(json.dumps(metrics, indent=2))
    print(f"Saved metrics to {report_path}")


if __name__ == "__main__":
    main()
