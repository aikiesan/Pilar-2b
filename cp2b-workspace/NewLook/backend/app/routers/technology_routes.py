"""
Technology Routes API Router
Educational tool for visualizing biogas technology pathways.
Calculation-free, reference-based learning platform.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
import secrets
from uuid import UUID
import json

from app.core.database import get_db, get_db_transaction
from app.schemas.technology_routes import (
    TechnologyCard,
    TechnologyCardCreate,
    TechnologyCardWithReferences,
    TechnologyReference,
    UserRoute,
    UserRouteCreate,
    UserRouteUpdate,
    UserRoutePublic,
    ConnectionValidationRequest,
    ConnectionValidationResponse,
)
from app.middleware.auth import get_current_user, optional_auth

router = APIRouter()


# ============================================================================
# HEALTH CHECK ENDPOINT
# ============================================================================

@router.get("/health")
def health_check():
    """
    Health check endpoint to verify database tables and data exist.
    Public access, no authentication required.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Check if technology_cards table exists and count rows
            cursor.execute("""
                SELECT COUNT(*) as count
                FROM technology_cards
                WHERE is_custom = FALSE
            """)
            tech_count = cursor.fetchone()[0]

            # Check custom technologies count
            cursor.execute("""
                SELECT COUNT(*) as count
                FROM technology_cards
                WHERE is_custom = TRUE
            """)
            custom_count = cursor.fetchone()[0]

            # Check user routes count
            cursor.execute("SELECT COUNT(*) FROM user_routes")
            routes_count = cursor.fetchone()[0]

            cursor.close()

            return {
                "status": "ok",
                "database": "connected",
                "technology_cards": {
                    "predefined": tech_count,
                    "custom": custom_count,
                    "total": tech_count + custom_count
                },
                "user_routes": routes_count,
                "tables_exist": True,
                "ready": tech_count > 0
            }

    except Exception as e:
        return {
            "status": "error",
            "database": "error",
            "error": str(e),
            "tables_exist": False,
            "ready": False,
            "message": "Database tables may not exist. Run migration 010_technology_routes.sql and seed data."
        }


# ============================================================================
# TECHNOLOGY CARDS ENDPOINTS
# ============================================================================

@router.get("/technologies", response_model=List[TechnologyCardWithReferences])
def get_all_technologies(
    category: Optional[str] = None,
    include_custom: bool = True,
    current_user = Depends(optional_auth)
):
    """
    Get all available technology cards with their references.
    Optionally filter by category.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Build query
            query = """
                SELECT
                    tc.id, tc.category, tc.name_pt, tc.name_en, tc.emoji,
                    tc.description_pt, tc.description_en, tc.color,
                    tc.can_connect_to, tc.can_receive_from,
                    tc.is_custom, tc.created_by, tc.created_at, tc.updated_at
                FROM technology_cards tc
                WHERE 1=1
            """
            params = {}

            if category:
                query += " AND tc.category = %(category)s"
                params['category'] = category

            if not include_custom:
                query += " AND tc.is_custom = FALSE"
            elif current_user:
                # Include only user's custom cards
                query += " AND (tc.is_custom = FALSE OR tc.created_by = %(user_id)s)"
                params['user_id'] = str(current_user.id)
            else:
                 # No user, only return public cards
                 query += " AND tc.is_custom = FALSE"

            query += " ORDER BY tc.category, tc.name_pt"

            cursor.execute(query, params)
            rows = cursor.fetchall()

            technologies = []
            for row in rows:
                # Get references for this technology
                ref_query = """
                    SELECT
                        tr.reference_id, tr.relevance_note,
                        r.title, r.authors, r.year, r.journal,
                        NULL::text AS doi, NULL::text AS url
                    FROM technology_references tr
                    LEFT JOIN residuo_references r ON tr.reference_id = r.id
                    WHERE tr.technology_id = %(tech_id)s
                    ORDER BY tr.display_order, tr.created_at
                """
                cursor.execute(ref_query, {'tech_id': row['id']})
                ref_rows = cursor.fetchall()

                references = [
                    TechnologyReference(
                        reference_id=ref['reference_id'],
                        title=ref['title'] or "Unknown",
                        authors=json.loads(ref['authors']) if ref['authors'] else [],
                        year=ref['year'] or 0,
                        journal=ref['journal'],
                        doi=ref['doi'],
                        url=ref['url'],
                        relevance_note=ref['relevance_note']
                    )
                    for ref in ref_rows
                ]

                tech = TechnologyCardWithReferences(
                    id=row['id'],
                    category=row['category'],
                    name_pt=row['name_pt'],
                    name_en=row['name_en'],
                    emoji=row['emoji'],
                    description_pt=row['description_pt'],
                    description_en=row['description_en'],
                    color=row['color'],
                    can_connect_to=row['can_connect_to'] or [],
                    can_receive_from=row['can_receive_from'] or [],
                    is_custom=row['is_custom'],
                    created_by=str(row['created_by']) if row['created_by'] else None,
                    created_at=row['created_at'],
                    updated_at=row['updated_at'],
                    references=references
                )
                technologies.append(tech)

            cursor.close()
            return technologies

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch technologies: {str(e)}"
        )


@router.get("/technologies/{tech_id}", response_model=TechnologyCardWithReferences)
def get_technology_by_id(tech_id: str):
    """Get a specific technology card with its references."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Get technology
            query = """
                SELECT
                    id, category, name_pt, name_en, emoji,
                    description_pt, description_en, color,
                    can_connect_to, can_receive_from,
                    is_custom, created_by, created_at, updated_at
                FROM technology_cards
                WHERE id = %(tech_id)s
            """
            cursor.execute(query, {'tech_id': tech_id})
            row = cursor.fetchone()

            if not row:
                cursor.close()
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Technology {tech_id} not found"
                )

            # Get references
            ref_query = """
                SELECT
                    tr.reference_id, tr.relevance_note,
                    r.title, r.authors, r.year, r.journal, r.doi, r.url
                FROM technology_references tr
                LEFT JOIN "references" r ON tr.reference_id = r.id
                WHERE tr.technology_id = %(tech_id)s
                ORDER BY tr.display_order, tr.created_at
            """
            cursor.execute(ref_query, {'tech_id': tech_id})
            ref_rows = cursor.fetchall()

            references = [
                TechnologyReference(
                    reference_id=ref['reference_id'],
                    title=ref['title'] or "Unknown",
                    authors=json.loads(ref['authors']) if ref['authors'] else [],
                    year=ref['year'] or 0,
                    journal=ref['journal'],
                    doi=ref['doi'],
                    url=ref['url'],
                    relevance_note=ref['relevance_note']
                )
                for ref in ref_rows
            ]

            cursor.close()

            return TechnologyCardWithReferences(
                id=row['id'],
                category=row['category'],
                name_pt=row['name_pt'],
                name_en=row['name_en'],
                emoji=row['emoji'],
                description_pt=row['description_pt'],
                description_en=row['description_en'],
                color=row['color'],
                can_connect_to=row['can_connect_to'] or [],
                can_receive_from=row['can_receive_from'] or [],
                is_custom=row['is_custom'],
                created_by=str(row['created_by']) if row['created_by'] else None,
                created_at=row['created_at'],
                updated_at=row['updated_at'],
                references=references
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch technology: {str(e)}"
        )


@router.post("/technologies/custom", response_model=TechnologyCard, status_code=status.HTTP_201_CREATED)
def create_custom_technology(
    technology: TechnologyCardCreate,
    current_user = Depends(get_current_user)
):
    """Create a custom user-defined technology card."""
    try:
        # Generate ID if not provided
        tech_id = technology.id or f"custom_{secrets.token_hex(8)}"

        # Check if ID already exists
        check_query = "SELECT id FROM technology_cards WHERE id = :tech_id"
        existing = db.execute(text(check_query), {'tech_id': tech_id}).fetchone()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Technology ID {tech_id} already exists"
            )

        # Insert technology
        insert_query = """
            INSERT INTO technology_cards (
                id, category, name_pt, name_en, emoji,
                description_pt, description_en, color,
                can_connect_to, can_receive_from,
                is_custom, created_by
            ) VALUES (
                :id, :category, :name_pt, :name_en, :emoji,
                :description_pt, :description_en, :color,
                :can_connect_to, :can_receive_from,
                TRUE, :created_by
            )
            RETURNING id, category, name_pt, name_en, emoji,
                      description_pt, description_en, color,
                      can_connect_to, can_receive_from,
                      is_custom, created_by, created_at, updated_at
        """

        result = db.execute(text(insert_query), {
            'id': tech_id,
            'category': technology.category.value,
            'name_pt': technology.name_pt,
            'name_en': technology.name_en,
            'emoji': technology.emoji,
            'description_pt': technology.description_pt,
            'description_en': technology.description_en,
            'color': technology.color,
            'can_connect_to': technology.can_connect_to,
            'can_receive_from': technology.can_receive_from,
            'created_by': str(current_user['id'])
        })

        db.commit()
        row = result.fetchone()

        return TechnologyCard(
            id=row.id,
            category=row.category,
            name_pt=row.name_pt,
            name_en=row.name_en,
            emoji=row.emoji,
            description_pt=row.description_pt,
            description_en=row.description_en,
            color=row.color,
            can_connect_to=row.can_connect_to or [],
            can_receive_from=row.can_receive_from or [],
            is_custom=row.is_custom,
            created_by=str(row.created_by) if row.created_by else None,
            created_at=row.created_at,
            updated_at=row.updated_at
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create custom technology: {str(e)}"
        )


@router.delete("/technologies/custom/{tech_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_custom_technology(
    tech_id: str,
    current_user = Depends(get_current_user)
):
    """Delete a custom technology card (only by owner)."""
    try:
        # Check ownership
        check_query = """
            SELECT created_by FROM technology_cards
            WHERE id = :tech_id AND is_custom = TRUE
        """
        result = db.execute(text(check_query), {'tech_id': tech_id})
        row = result.fetchone()

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Custom technology {tech_id} not found"
            )

        if str(row.created_by) != str(current_user['id']):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own custom technologies"
            )

        # Delete technology (cascade will handle references)
        delete_query = "DELETE FROM technology_cards WHERE id = :tech_id"
        db.execute(text(delete_query), {'tech_id': tech_id})
        db.commit()

        return None

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete technology: {str(e)}"
        )


# ============================================================================
# USER ROUTES ENDPOINTS
# ============================================================================

@router.get("/routes", response_model=List[UserRoute])
def get_user_routes(
    
    current_user = Depends(get_current_user)
):
    """Get all routes created by the current user."""
    try:
        query = """
            SELECT id, user_id, name, description, canvas_data,
                   is_public, share_token, tags, created_at, updated_at
            FROM user_routes
            WHERE user_id = :user_id
            ORDER BY updated_at DESC
        """
        result = db.execute(text(query), {'user_id': str(current_user['id'])})
        rows = result.fetchall()

        routes = []
        for row in rows:
            routes.append(UserRoute(
                id=str(row.id),
                user_id=str(row.user_id),
                name=row.name,
                description=row.description,
                canvas_data=row.canvas_data,
                is_public=row.is_public,
                share_token=row.share_token,
                tags=row.tags or [],
                created_at=row.created_at,
                updated_at=row.updated_at
            ))

        return routes

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch routes: {str(e)}"
        )


@router.get("/routes/{route_id}", response_model=UserRoute)
def get_route_by_id(
    route_id: UUID,
    current_user = Depends(get_current_user)
):
    """Get a specific route by ID (must be owner)."""
    try:
        query = """
            SELECT id, user_id, name, description, canvas_data,
                   is_public, share_token, tags, created_at, updated_at
            FROM user_routes
            WHERE id = :route_id AND user_id = :user_id
        """
        result = db.execute(text(query), {
            'route_id': str(route_id),
            'user_id': str(current_user['id'])
        })
        row = result.fetchone()

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Route not found"
            )

        return UserRoute(
            id=str(row.id),
            user_id=str(row.user_id),
            name=row.name,
            description=row.description,
            canvas_data=row.canvas_data,
            is_public=row.is_public,
            share_token=row.share_token,
            tags=row.tags or [],
            created_at=row.created_at,
            updated_at=row.updated_at
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch route: {str(e)}"
        )


@router.post("/routes", response_model=UserRoute, status_code=status.HTTP_201_CREATED)
def create_route(
    route: UserRouteCreate,
    current_user = Depends(get_current_user)
):
    """Create a new technology route."""
    try:
        # Generate share token if public
        share_token = secrets.token_urlsafe(16) if route.is_public else None

        insert_query = """
            INSERT INTO user_routes (
                user_id, name, description, canvas_data,
                is_public, share_token, tags
            ) VALUES (
                :user_id, :name, :description, :canvas_data,
                :is_public, :share_token, :tags
            )
            RETURNING id, user_id, name, description, canvas_data,
                      is_public, share_token, tags, created_at, updated_at
        """

        result = db.execute(text(insert_query), {
            'user_id': str(current_user['id']),
            'name': route.name,
            'description': route.description,
            'canvas_data': json.dumps(route.canvas_data.model_dump()),
            'is_public': route.is_public,
            'share_token': share_token,
            'tags': route.tags
        })

        db.commit()
        row = result.fetchone()

        return UserRoute(
            id=str(row.id),
            user_id=str(row.user_id),
            name=row.name,
            description=row.description,
            canvas_data=row.canvas_data,
            is_public=row.is_public,
            share_token=row.share_token,
            tags=row.tags or [],
            created_at=row.created_at,
            updated_at=row.updated_at
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create route: {str(e)}"
        )


@router.put("/routes/{route_id}", response_model=UserRoute)
def update_route(
    route_id: UUID,
    route_update: UserRouteUpdate,
    current_user = Depends(get_current_user)
):
    """Update an existing route (must be owner)."""
    try:
        # Check ownership
        check_query = "SELECT user_id, share_token FROM user_routes WHERE id = :route_id"
        result = db.execute(text(check_query), {'route_id': str(route_id)})
        row = result.fetchone()

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Route not found"
            )

        if str(row.user_id) != str(current_user['id']):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update your own routes"
            )

        # Build update query dynamically
        updates = []
        params = {'route_id': str(route_id)}

        if route_update.name is not None:
            updates.append("name = :name")
            params['name'] = route_update.name

        if route_update.description is not None:
            updates.append("description = :description")
            params['description'] = route_update.description

        if route_update.canvas_data is not None:
            updates.append("canvas_data = :canvas_data")
            params['canvas_data'] = json.dumps(route_update.canvas_data.model_dump())

        if route_update.is_public is not None:
            updates.append("is_public = :is_public")
            params['is_public'] = route_update.is_public

            # Generate/remove share token based on public status
            if route_update.is_public and not row.share_token:
                updates.append("share_token = :share_token")
                params['share_token'] = secrets.token_urlsafe(16)

        if route_update.tags is not None:
            updates.append("tags = :tags")
            params['tags'] = route_update.tags

        if not updates:
            # Nothing to update, return current state
            return get_route_by_id(route_id, db, current_user)

        update_query = f"""
            UPDATE user_routes
            SET {', '.join(updates)}
            WHERE id = :route_id
            RETURNING id, user_id, name, description, canvas_data,
                      is_public, share_token, tags, created_at, updated_at
        """

        result = db.execute(text(update_query), params)
        db.commit()
        row = result.fetchone()

        return UserRoute(
            id=str(row.id),
            user_id=str(row.user_id),
            name=row.name,
            description=row.description,
            canvas_data=row.canvas_data,
            is_public=row.is_public,
            share_token=row.share_token,
            tags=row.tags or [],
            created_at=row.created_at,
            updated_at=row.updated_at
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update route: {str(e)}"
        )


@router.delete("/routes/{route_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_route(
    route_id: UUID,
    current_user = Depends(get_current_user)
):
    """Delete a route (must be owner)."""
    try:
        # Check ownership
        check_query = "SELECT user_id FROM user_routes WHERE id = :route_id"
        result = db.execute(text(check_query), {'route_id': str(route_id)})
        row = result.fetchone()

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Route not found"
            )

        if str(row.user_id) != str(current_user['id']):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own routes"
            )

        # Delete route
        delete_query = "DELETE FROM user_routes WHERE id = :route_id"
        db.execute(text(delete_query), {'route_id': str(route_id)})
        db.commit()

        return None

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete route: {str(e)}"
        )


# ============================================================================
# PUBLIC SHARING ENDPOINTS
# ============================================================================

@router.get("/public/routes", response_model=List[UserRoutePublic])
def get_public_routes(
    limit: int = 20,
    offset: int = 0
):
    """Get all public routes (no authentication required)."""
    try:
        query = """
            SELECT
                ur.id, ur.name, ur.description, ur.canvas_data,
                ur.created_at, ur.tags
            FROM user_routes ur
            WHERE ur.is_public = TRUE
            ORDER BY ur.created_at DESC
            LIMIT :limit OFFSET :offset
        """
        result = db.execute(text(query), {'limit': limit, 'offset': offset})
        rows = result.fetchall()

        routes = []
        for row in rows:
            routes.append(UserRoutePublic(
                id=str(row.id),
                name=row.name,
                description=row.description,
                canvas_data=row.canvas_data,
                created_at=row.created_at,
                tags=row.tags or []
            ))

        return routes

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch public routes: {str(e)}"
        )


@router.get("/share/{share_token}", response_model=UserRoutePublic)
def get_route_by_share_token(
    share_token: str
):
    """Get a route by its public share token (no authentication required)."""
    try:
        query = """
            SELECT
                ur.id, ur.name, ur.description, ur.canvas_data,
                ur.created_at, ur.tags
            FROM user_routes ur
            WHERE ur.share_token = :share_token AND ur.is_public = TRUE
        """
        result = db.execute(text(query), {'share_token': share_token})
        row = result.fetchone()

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shared route not found"
            )

        return UserRoutePublic(
            id=str(row.id),
            name=row.name,
            description=row.description,
            canvas_data=row.canvas_data,
            created_at=row.created_at,
            tags=row.tags or []
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch shared route: {str(e)}"
        )


# ============================================================================
# VALIDATION ENDPOINTS
# ============================================================================

@router.post("/validate-connection", response_model=ConnectionValidationResponse)
def validate_connection(request: ConnectionValidationRequest):
    """
    Validate if two technologies can be connected.
    Returns: {valid: bool, reason: string}
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Get both technologies
            query = """
                SELECT id, category, name_pt, can_connect_to, can_receive_from
                FROM technology_cards
                WHERE id = %(tech_id)s
            """

            cursor.execute(query, {'tech_id': request.source_tech_id})
            source = cursor.fetchone()

            cursor.execute(query, {'tech_id': request.target_tech_id})
            target = cursor.fetchone()

            cursor.close()

            if not source:
                return ConnectionValidationResponse(
                    valid=False,
                    reason=f"Source technology '{request.source_tech_id}' not found"
                )

            if not target:
                return ConnectionValidationResponse(
                    valid=False,
                    reason=f"Target technology '{request.target_tech_id}' not found"
                )

            # Check if connection is allowed
            source_can_connect = source['can_connect_to'] or []
            target_can_receive = target['can_receive_from'] or []

            # Validate both directions
            source_allows = target['category'] in source_can_connect
            target_allows = source['category'] in target_can_receive

            if not source_allows:
                return ConnectionValidationResponse(
                    valid=False,
                    reason=f"{source['name_pt']} cannot connect to {target['category']} technologies",
                    source_category=source['category'],
                    target_category=target['category']
                )

            if not target_allows:
                return ConnectionValidationResponse(
                    valid=False,
                    reason=f"{target['name_pt']} cannot receive connections from {source['category']} technologies",
                    source_category=source['category'],
                    target_category=target['category']
                )

            return ConnectionValidationResponse(
                valid=True,
                reason="Connection is valid",
                source_category=source['category'],
                target_category=target['category']
            )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to validate connection: {str(e)}"
        )
