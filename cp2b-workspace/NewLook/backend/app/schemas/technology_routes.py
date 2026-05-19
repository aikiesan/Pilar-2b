"""
Pydantic schemas for Technology Routes feature.
Educational tool for visualizing biogas technology pathways.
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class TechnologyCategory(str, Enum):
    """Technology categories for biogas pathways."""
    FEEDSTOCK = "feedstock"
    PRETREATMENT = "pretreatment"
    DIGESTION = "digestion"
    UPGRADING = "upgrading"
    ENDUSE = "enduse"
    BYPRODUCT = "byproduct"
    CUSTOM = "custom"


# ============================================================================
# TECHNOLOGY CARD SCHEMAS
# ============================================================================

class TechnologyCardBase(BaseModel):
    """Base schema for technology cards."""
    name_pt: str = Field(..., min_length=1, max_length=100)
    name_en: str = Field(..., min_length=1, max_length=100)
    emoji: str = Field(..., min_length=1, max_length=10)
    category: TechnologyCategory
    description_pt: Optional[str] = None
    description_en: Optional[str] = None
    color: str = Field(default="#3B82F6", pattern=r"^#[0-9A-Fa-f]{6}$")
    can_connect_to: List[str] = Field(default_factory=list)
    can_receive_from: List[str] = Field(default_factory=list)


class TechnologyCardCreate(TechnologyCardBase):
    """Schema for creating a technology card."""
    id: Optional[str] = None  # Auto-generated if not provided
    is_custom: bool = False


class TechnologyCard(TechnologyCardBase):
    """Complete technology card schema."""
    id: str
    is_custom: bool
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# REFERENCE SCHEMAS
# ============================================================================

class TechnologyReference(BaseModel):
    """Schema for scientific references linked to technologies."""
    reference_id: int
    title: str
    authors: List[str]
    year: int
    journal: Optional[str] = None
    doi: Optional[str] = None
    url: Optional[str] = None
    relevance_note: Optional[str] = None


class TechnologyCardWithReferences(TechnologyCard):
    """Technology card with its scientific references."""
    references: List[TechnologyReference] = Field(default_factory=list)


# ============================================================================
# ROUTE CANVAS SCHEMAS
# ============================================================================

class RouteNode(BaseModel):
    """Schema for a node in the React Flow canvas."""
    id: str
    type: str = "technology"
    position: Dict[str, float]  # {x: number, y: number}
    data: Dict[str, Any]  # {techId, label, emoji, color, category}

    model_config = ConfigDict(extra="allow")


class RouteEdge(BaseModel):
    """Schema for an edge (connection) in the React Flow canvas."""
    id: str
    source: str
    target: str
    type: str = "default"
    animated: bool = False
    style: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(extra="allow")


class RouteCanvasData(BaseModel):
    """Schema for the complete canvas data."""
    nodes: List[RouteNode]
    edges: List[RouteEdge]


# ============================================================================
# USER ROUTE SCHEMAS
# ============================================================================

class UserRouteCreate(BaseModel):
    """Schema for creating a new route."""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    canvas_data: RouteCanvasData
    is_public: bool = False
    tags: List[str] = Field(default_factory=list)


class UserRouteUpdate(BaseModel):
    """Schema for updating an existing route."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    canvas_data: Optional[RouteCanvasData] = None
    is_public: Optional[bool] = None
    tags: Optional[List[str]] = None


class UserRoute(BaseModel):
    """Complete user route schema."""
    id: str
    user_id: str
    name: str
    description: Optional[str]
    canvas_data: RouteCanvasData
    is_public: bool
    share_token: Optional[str]
    tags: List[str]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserRoutePublic(BaseModel):
    """Public view of a route (for sharing)."""
    id: str
    name: str
    description: Optional[str]
    canvas_data: RouteCanvasData
    created_at: datetime
    author_name: Optional[str] = "Anonymous"
    tags: List[str] = Field(default_factory=list)


# ============================================================================
# VALIDATION SCHEMAS
# ============================================================================

class ConnectionValidationRequest(BaseModel):
    """Request schema for validating a connection between technologies."""
    source_tech_id: str
    target_tech_id: str


class ConnectionValidationResponse(BaseModel):
    """Response schema for connection validation."""
    valid: bool
    reason: Optional[str] = None
    source_category: Optional[str] = None
    target_category: Optional[str] = None
