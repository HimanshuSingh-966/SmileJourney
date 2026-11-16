from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

IssueCategory = Literal["crowding/alignment", "gaps", "discoloration", "gum line", "symmetry"]
FindingSeverity = Literal["none", "mild", "moderate", "severe"]


class ApiModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Finding(ApiModel):
    id: str = Field(min_length=1, max_length=128)
    category: IssueCategory
    title: str = Field(min_length=1, max_length=200)
    severity: FindingSeverity
    description: str = Field(min_length=1, max_length=1000)


class CompletedAssessment(ApiModel):
    assessment_id: str = Field(min_length=1, max_length=128)
    status: Literal["complete"]
    score: int = Field(ge=0, le=100)
    findings: list[Finding] = Field(min_length=5, max_length=5)
    photo_object_key: str = Field(min_length=1, max_length=512)
    created_at: str = Field(min_length=10, max_length=64)
    completed_at: str | None = Field(default=None, min_length=10, max_length=64)


class SignedPhotoUrlRequest(ApiModel):
    photo_object_key: str = Field(min_length=1, max_length=512)


class SignedPhotoUrlResponse(ApiModel):
    photo_url: str = Field(min_length=1)
    expires_in: int = Field(gt=0)
