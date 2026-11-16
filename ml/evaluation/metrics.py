from typing import Any

import numpy as np
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_recall_fscore_support

from training.data import CATEGORIES, CLASSES


def classification_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, Any]:
    results: dict[str, Any] = {"sample_count": int(len(y_true)), "by_category": {}}
    macro_f1_values: list[float] = []
    for column, category in enumerate(CATEGORIES):
        true_col = y_true[:, column]
        pred_col = y_pred[:, column]
        precision, recall, f1, support = precision_recall_fscore_support(
            true_col,
            pred_col,
            labels=list(range(len(CLASSES))),
            zero_division=0,
        )
        macro_f1 = float(np.mean(f1))
        macro_f1_values.append(macro_f1)
        results["by_category"][category] = {
            "accuracy": float(accuracy_score(true_col, pred_col)),
            "macro_f1": macro_f1,
            "per_class": {
                label: {
                    "precision": float(precision[index]),
                    "recall": float(recall[index]),
                    "f1": float(f1[index]),
                    "support": int(support[index]),
                }
                for index, label in enumerate(CLASSES)
            },
            "confusion_matrix": confusion_matrix(
                true_col, pred_col, labels=list(range(len(CLASSES)))).tolist(),
        }
    results["mean_category_macro_f1"] = float(np.mean(macro_f1_values)) if macro_f1_values else 0.0
    return results
