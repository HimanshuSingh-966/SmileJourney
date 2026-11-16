# Prototype ML Training

The prototype pipeline fine-tunes a configurable pretrained image backbone to predict one of four labels (`none`, `mild`, `moderate`, `severe`) for each of the five issue categories. `none` means no visible issue. `skipped`, `labeled_by`, and `timestamp` are not model targets.

Training uses the canonical `letterbox_rgb` function from `backend/app/services/image_preprocessing.py`: EXIF orientation correction, RGB conversion, aspect-preserving fit to the configured square input, and neutral padding. It does not crop or segment the mouth. Training and evaluation both use this function; backend inference must use it too. Only the training transform adds horizontal flips, and no color jitter is applied because discoloration is a target.

## Data layout

- `data/labels.csv`: one row per image with `filename`, `crowding`, `gaps`, `discoloration`, `gum_line`, and `symmetry` columns.
- `data/images/`: images referenced by `filename`.

The loader checks required columns, duplicate filenames, label vocabulary, path containment, and missing image files.

## Setup and use

From this directory, create a Python 3.10+ environment and install:

```powershell
python -m pip install -r requirements.txt
```

Train with the configured pretrained ResNet-18 (or set `model.backbone` to `efficientnet_b0` in `configs/default.yaml`):

```powershell
python -m training.train --config configs/default.yaml
```

This writes the best validation checkpoint under `checkpoints/`. Evaluate the held-out split only after choosing the model/configuration:

```powershell
python -m evaluation.evaluate --config configs/default.yaml --checkpoint checkpoints/best_prototype.pt
```

The evaluation report is saved next to the checkpoint as `heldout_metrics.json`. Keep model outputs and checkpoints out of Git.

## Interpretation limits

This is an exploratory prototype using only 100 images. Severe examples are very sparse, so per-class estimates—especially for gaps, gum line, and symmetry—will be unstable. Iterative stratification balances labels where possible but cannot create missing examples. The current filenames/labels do not provide confirmed patient/source grouping, so related images could cross splits; test metrics may therefore be optimistic. These results do not establish clinical validity or justify user-facing scores/recommendations.

The classifier is not connected to backend inference. The backend should remain fail-closed until a trained artifact, compatible preprocessing, reviewed evaluation, and model release process are available.
