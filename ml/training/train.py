import argparse
import json
import random
from pathlib import Path

import numpy as np
import torch
import yaml
from sklearn.utils.class_weight import compute_class_weight
from torch.nn import functional as F
from torch.utils.data import DataLoader, Subset

from evaluation.metrics import classification_metrics
from training.data import CATEGORIES, CLASSES, SmileLabelDataset, load_manifest, split_indices
from training.model import build_model
from backend.app.services.image_preprocessing import PREPROCESSING_VERSION

ML_ROOT = Path(__file__).resolve().parents[1]


def resolve_device(setting: str) -> torch.device:
    if setting == "auto":
        return torch.device("cuda" if torch.cuda.is_available() else "cpu")
    if setting == "cuda" and not torch.cuda.is_available():
        raise RuntimeError("CUDA was requested but is not available.")
    return torch.device(setting)


def make_class_weights(targets: np.ndarray, power: float, device: torch.device) -> list[torch.Tensor]:
    weights = []
    for column in range(len(CATEGORIES)):
        counts = np.bincount(targets[:, column], minlength=len(CLASSES))
        present = np.flatnonzero(counts)
        class_weights = np.ones(len(CLASSES), dtype=np.float32)
        if len(present):
            balanced = compute_class_weight("balanced", classes=present, y=targets[:, column])
            class_weights[present] = balanced.astype(np.float32) ** power
            class_weights /= class_weights.mean()
        weights.append(torch.tensor(class_weights, dtype=torch.float32, device=device))
    return weights


def run_epoch(model, loader, optimizer, class_weights, device, training: bool):
    model.train(training)
    total_loss = 0.0
    all_true, all_pred = [], []
    context = torch.enable_grad() if training else torch.no_grad()
    with context:
        for images, targets in loader:
            images = images.to(device)
            targets = targets.to(device)
            if training:
                optimizer.zero_grad(set_to_none=True)
            logits = model(images).reshape(-1, len(CATEGORIES), len(CLASSES))
            loss = sum(
                F.cross_entropy(logits[:, index, :], targets[:, index], weight=class_weights[index])
                for index in range(len(CATEGORIES))
            ) / len(CATEGORIES)
            if training:
                loss.backward()
                optimizer.step()
            total_loss += float(loss.detach().cpu()) * len(images)
            all_true.append(targets.detach().cpu().numpy())
            all_pred.append(logits.argmax(dim=-1).detach().cpu().numpy())

    y_true = np.concatenate(all_true)
    y_pred = np.concatenate(all_pred)
    return total_loss / len(loader.dataset), y_true, y_pred, classification_metrics(y_true, y_pred)


def main():
    parser = argparse.ArgumentParser(description="Fine-tune a pretrained multi-output smile image classifier.")
    parser.add_argument("--config", default="configs/default.yaml", help="Config path relative to ml/ or absolute.")
    args = parser.parse_args()
    config_path = Path(args.config)
    if not config_path.is_absolute():
        config_path = ML_ROOT / config_path
    config = yaml.safe_load(config_path.read_text(encoding="utf-8"))

    seed = int(config["seed"])
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)

    data_cfg = config["data"]
    csv_path = ML_ROOT / data_cfg["labels_csv"]
    image_dir = ML_ROOT / data_cfg["image_dir"]
    rows, targets = load_manifest(csv_path, image_dir)
    train_idx, val_idx, test_idx = split_indices(
        targets,
        seed,
        float(data_cfg["train_fraction"]),
        float(data_cfg["validation_fraction"]),
        float(data_cfg["test_fraction"]),
    )
    for split_name, indices in (("train", train_idx), ("validation", val_idx), ("test", test_idx)):
        print(f"{split_name} samples: {len(indices)}")
        subset_targets = targets[indices]
        for column, category in enumerate(CATEGORIES):
            counts = np.bincount(subset_targets[:, column], minlength=len(CLASSES))
            absent = [CLASSES[i] for i, count in enumerate(counts) if count == 0]
            if absent:
                print(f"WARNING: {split_name} has no {category} examples for: {', '.join(absent)}")

    image_size = int(data_cfg["image_size"])
    train_dataset = SmileLabelDataset(rows, targets, image_size, training=True)
    eval_dataset = SmileLabelDataset(rows, targets, image_size, training=False)
    train_loader = DataLoader(Subset(train_dataset, train_idx), batch_size=int(data_cfg["batch_size"]), shuffle=True, num_workers=int(data_cfg["num_workers"]))
    val_loader = DataLoader(Subset(eval_dataset, val_idx), batch_size=int(data_cfg["batch_size"]), shuffle=False, num_workers=int(data_cfg["num_workers"]))

    device = resolve_device(config["training"].get("device", "auto"))
    model_cfg = config["model"]
    model = build_model(model_cfg["backbone"], bool(model_cfg["pretrained"]), float(model_cfg["dropout"])).to(device)
    class_weights = make_class_weights(targets[train_idx], float(config["training"]["class_weight_power"]), device)
    optimizer = torch.optim.AdamW(
        (param for param in model.parameters() if param.requires_grad),
        lr=float(config["training"]["learning_rate"]),
        weight_decay=float(config["training"]["weight_decay"]),
    )
    output_dir = ML_ROOT / config["output_dir"]
    output_dir.mkdir(parents=True, exist_ok=True)
    checkpoint_path = output_dir / "best_prototype.pt"
    best_f1 = -1.0
    stale_epochs = 0
    patience = int(config["training"]["patience"])

    for epoch in range(1, int(config["training"]["epochs"]) + 1):
        train_loss, _, _, _ = run_epoch(model, train_loader, optimizer, class_weights, device, True)
        val_loss, _, _, val_metrics = run_epoch(model, val_loader, optimizer, class_weights, device, False)
        score = val_metrics["mean_category_macro_f1"]
        print(json.dumps({"epoch": epoch, "train_loss": train_loss, "validation_loss": val_loss, "validation_mean_category_macro_f1": score}))
        if score > best_f1:
            best_f1 = score
            stale_epochs = 0
            torch.save({
                "model_state_dict": model.state_dict(),
                "backbone": model_cfg["backbone"],
                "pretrained": bool(model_cfg["pretrained"]),
                "dropout": float(model_cfg["dropout"]),
                "image_size": image_size,
                "preprocessing_version": PREPROCESSING_VERSION,
                "categories": list(CATEGORIES),
                "classes": list(CLASSES),
                "validation_metrics": val_metrics,
                "seed": seed,
            }, checkpoint_path)
        else:
            stale_epochs += 1
            if stale_epochs >= patience:
                print(f"Early stopping after {epoch} epochs; best checkpoint: {checkpoint_path}")
                break

    print(f"Best validation macro F1: {best_f1:.4f}")
    print(f"Checkpoint: {checkpoint_path}")
    print("The held-out test split is intentionally not used during training. Run evaluation/evaluate.py once model choices are frozen.")


if __name__ == "__main__":
    main()
