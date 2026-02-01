-- =============================================
-- Migration: 000002_create_enums (DOWN)
-- Description: Remove tipos ENUM
-- =============================================

DROP TYPE IF EXISTS price_unit_type;

DROP TYPE IF EXISTS finish_type_enum;
DROP TYPE IF EXISTS reservation_status_type;
DROP TYPE IF EXISTS interaction_type_enum;
DROP TYPE IF EXISTS media_type_enum;
DROP TYPE IF EXISTS link_type_enum;
DROP TYPE IF EXISTS batch_status_type;
DROP TYPE IF EXISTS user_role_type;
