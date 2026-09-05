from pydantic import BaseModel, Field
from typing import List, Optional, Any

class JobOffer(BaseModel):
    title: str
    company: str
    location: Optional[str] = "France"
    salary: Optional[str] = None
    description: str = ""
    skills: List[str] = Field(default_factory=list)
    contract_type: Optional[str] = "CDI"
    is_remote: bool = False
    work_type: Optional[str] = "Présentiel"
    date_posted: Optional[str] = None
    salary_warning: bool = False
    is_agency: bool = False
    source: str = "reverse_api"
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    url: str
    match_score: int = 0
    ai_analysis: Optional[Any] = None # Supporte Dict ou String
