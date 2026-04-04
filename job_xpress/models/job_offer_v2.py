from pydantic import BaseModel
from typing import List, Optional

class JobOffer(BaseModel):
    title: str
    company: str
    location: Optional[str] = None
    salary: Optional[str] = None
    description: str
    skills: List[str] = []
    contract_type: Optional[str] = None
    is_remote: bool = False
    url: str
    match_score: int = 0
