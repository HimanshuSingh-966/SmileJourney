from torch import nn
from torchvision import models

from training.data import CATEGORIES, CLASSES


def build_model(backbone: str = "resnet18", pretrained: bool = True, dropout: float = 0.2) -> nn.Module:
    output_size = len(CATEGORIES) * len(CLASSES)
    if backbone == "resnet18":
        weights = models.ResNet18_Weights.DEFAULT if pretrained else None
        model = models.resnet18(weights=weights)
        input_size = model.fc.in_features
        model.fc = nn.Sequential(nn.Dropout(dropout), nn.Linear(input_size, output_size))
        for parameter in model.parameters():
            parameter.requires_grad = False
        for parameter in model.layer4.parameters():
            parameter.requires_grad = True
        for parameter in model.fc.parameters():
            parameter.requires_grad = True
        return model

    if backbone == "efficientnet_b0":
        weights = models.EfficientNet_B0_Weights.DEFAULT if pretrained else None
        model = models.efficientnet_b0(weights=weights)
        input_size = model.classifier[1].in_features
        model.classifier = nn.Sequential(nn.Dropout(dropout), nn.Linear(input_size, output_size))
        for parameter in model.parameters():
            parameter.requires_grad = False
        for parameter in model.features[-2:].parameters():
            parameter.requires_grad = True
        for parameter in model.classifier.parameters():
            parameter.requires_grad = True
        return model

    raise ValueError(f"Unsupported backbone {backbone!r}; choose resnet18 or efficientnet_b0.")
