from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl

AssessmentStatus = Literal["processing", "pending", "complete", "failed"]
IssueCategory = Literal["crowding/alignment", "gaps", "discoloration", "gum line", "symmetry"]
FindingSeverity = Literal["none", "mild", "moderate", "severe"]


class ApiModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AssessmentAccepted(ApiModel):
    assessment_id: str = Field(min_length=1)
    status: Literal["processing"]
    message: str


class AssessmentJob(ApiModel):
    assessment_id: str = Field(min_length=1)
    status: Literal["processing", "pending", "failed"]
    error: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


class Finding(ApiModel):
    id: str = Field(min_length=1)
    category: IssueCategory
    title: str = Field(min_length=1)
    severity: FindingSeverity
    description: str = Field(min_length=1)


class SpecialistRecommendation(ApiModel):
    primarySpecialist: str | None = None
    coSpecialist: str | None = None
    notes: str | None = None
    reasons: list[str] | None = None
    discipline: str | None = None


class ConsultationQuestion(ApiModel):
    id: str = Field(min_length=1)
    question: str = Field(min_length=1)
    explanation: str = ""
    checked: bool = False


class CompletedAssessment(ApiModel):
    assessment_id: str = Field(min_length=1)
    status: Literal["complete"]
    score: int = Field(ge=0, le=100)
    findings: list[Finding] = Field(min_length=5, max_length=5)
    photo_url: HttpUrl
    created_at: str
    completed_at: str | None = None
    specialist_recommendation: SpecialistRecommendation | None = None
    consultation_questions: list[ConsultationQuestion] | None = None


AssessmentStatusResponse = AssessmentJob | CompletedAssessment
